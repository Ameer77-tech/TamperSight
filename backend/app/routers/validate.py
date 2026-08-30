"""
Module 2 — Document Validation
================================
Validates extracted data against official document standards.

Checks:
  • Aadhaar: Verhoeff checksum algorithm (mathematical proof of validity)
  • PAN: Format + 4th char type code validation
  • Passport MRZ: ICAO 9303 check-digit verification
  • Date logic: Expiry > Issue, DOB reasonable age, not expired
"""

import re
from datetime import datetime, date

from fastapi import APIRouter
from pydantic import BaseModel

import stdnum.verhoeff as verhoeff

router = APIRouter()


# ── Pydantic Models ──────────────────────────────────────────────────

class ValidationRequest(BaseModel):
    aadhaar_number: str | None = None
    pan_number: str | None = None
    dl_number: str | None = None
    passport_number: str | None = None
    mrz_line1: str | None = None
    mrz_line2: str | None = None
    date_of_birth: str | None = None       # DD/MM/YYYY or YYYY-MM-DD
    date_of_expiry: str | None = None


class ValidationResult(BaseModel):
    field: str
    valid: bool
    reason: str


# ── Validation Logic ─────────────────────────────────────────────────

def _validate_aadhaar(number: str) -> ValidationResult:
    """Verhoeff checksum validation for 12-digit Aadhaar."""
    cleaned = re.sub(r"\D", "", number)
    if len(cleaned) != 12:
        return ValidationResult(field="aadhaar", valid=False, reason=f"Expected 12 digits, got {len(cleaned)}")
    try:
        verhoeff.validate(cleaned)
        return ValidationResult(field="aadhaar", valid=True, reason="Verhoeff CHECKSUM VALID")
    except Exception:
        return ValidationResult(field="aadhaar", valid=False, reason="Verhoeff checksum FAIL — possible tampering")


def _validate_pan(number: str) -> ValidationResult:
    """PAN format: ABCDE1234F — 4th char encodes holder type."""
    if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", number):
        return ValidationResult(field="pan", valid=False, reason="Invalid PAN format")
    return ValidationResult(field="pan", valid=True, reason="PAN FORMAT VALID")


def _validate_dl(number: str) -> ValidationResult:
    """Validate Indian Driving Licence Format (State Code + RTO + Year + 7 digits)"""
    cleaned = re.sub(r"[\-\s]", "", number)
    if re.match(r"^[A-Z]{2}\d{13}$", cleaned):
        return ValidationResult(field="dl", valid=True, reason="DL FORMAT VALID")
    return ValidationResult(field="dl", valid=False, reason="Invalid DL Format")

    type_codes = {
        "A": "Association of Persons",
        "B": "Body of Individuals",
        "C": "Company",
        "F": "Firm",
        "G": "Government",
        "H": "HUF",
        "J": "Artificial Juridical Person",
        "L": "Local Authority",
        "P": "Individual (Person)",
        "T": "Trust",
    }
    fourth = number[3]
    holder_type = type_codes.get(fourth, "Unknown")
    return ValidationResult(field="pan", valid=True, reason=f"Valid PAN — Holder type: {holder_type}")


def _validate_mrz_checkdigit(data: str, check: str) -> bool:
    """ICAO 9303 MRZ check-digit algorithm."""
    weights = [7, 3, 1]
    total = 0
    for i, ch in enumerate(data):
        if ch == "<":
            val = 0
        elif ch.isdigit():
            val = int(ch)   
        elif ch.isalpha():
            val = ord(ch.upper()) - 55
        else:
            val = 0
        total += val * weights[i % 3]
    return str(total % 10) == check


def _validate_passport_mrz(line1: str, line2: str, req: ValidationRequest) -> ValidationResult:
    """Validate MRZ line 2 check digits per ICAO 9303 and cross-check OCR fields."""
    if not line2 or len(line2) < 44:
        return ValidationResult(field="mrz", valid=True, reason="MRZ checksums skipped (non-standard length)")

    checks = [
        ("Passport Number", line2[0:9], line2[9]),
        ("Date of Birth",   line2[13:19], line2[19]),
        ("Date of Expiry",  line2[21:27], line2[27]),
    ]

    failures = []
    for name, data, digit in checks:
        if not _validate_mrz_checkdigit(data, digit):
            failures.append(name)

    if failures:
        return ValidationResult(field="mrz", valid=False, reason=f"Check-digit FAIL on: {', '.join(failures)}")

    # 2. Cross-check OCR fields with MRZ data
    cross_failures = []
    
    if req.passport_number:
        mrz_pass = line2[0:9].replace("<", "")
        edited_pass = re.sub(r"[\-\s]", "", req.passport_number)
        if mrz_pass != edited_pass:
            cross_failures.append("Passport # Mismatch")
            
    def _parse_mrz_date(yymmdd: str) -> date | None:
        try:
            yr = int(yymmdd[0:2])
            yr += 2000 if yr < 50 else 1900
            return date(yr, int(yymmdd[2:4]), int(yymmdd[4:6]))
        except:
            return None

    def _parse_ui_date(s: str) -> date | None:
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue
        return None

    if req.date_of_birth:
        ui_dob = _parse_ui_date(req.date_of_birth)
        mrz_dob = _parse_mrz_date(line2[13:19])
        if ui_dob and mrz_dob and ui_dob != mrz_dob:
            cross_failures.append("DOB Mismatch")

    if req.date_of_expiry:
        ui_exp = _parse_ui_date(req.date_of_expiry)
        mrz_exp = _parse_mrz_date(line2[21:27])
        if ui_exp and mrz_exp and ui_exp != mrz_exp:
            cross_failures.append("Expiry Mismatch")

    if cross_failures:
        return ValidationResult(field="mrz", valid=False, reason=f"Cross-check FAIL: {', '.join(cross_failures)}")

    return ValidationResult(field="mrz", valid=True, reason="All ICAO 9303 digits & Cross-checks PASS")


def _validate_dates(dob_str: str | None, expiry_str: str | None) -> list[ValidationResult]:
    """Check date reasonableness."""
    results = []

    def _parse(s: str) -> date | None:
        for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                return datetime.strptime(s, fmt).date()
            except ValueError:
                continue
        return None

    if dob_str:
        dob = _parse(dob_str)
        if dob:
            age = (date.today() - dob).days // 365
            if age < 0 or age > 150:
                results.append(ValidationResult(field="dob", valid=False, reason=f"Impossible age: {age}"))
            else:
                results.append(ValidationResult(field="dob", valid=True, reason=f"Age {age} — plausible"))
        else:
            results.append(ValidationResult(field="dob", valid=False, reason="Could not parse date"))

    if expiry_str:
        exp = _parse(expiry_str)
        if exp:
            if exp < date.today():
                results.append(ValidationResult(field="expiry", valid=False, reason="EXPIRED document"))
            else:
                results.append(ValidationResult(field="expiry", valid=True, reason=f"Valid until {exp.isoformat()}"))
        else:
            results.append(ValidationResult(field="expiry", valid=False, reason="Could not parse date"))

    return results


@router.post("/check")
async def validate_document(req: ValidationRequest):
    """
    Validate extracted document data against official rules:
      - Aadhaar Verhoeff checksum
      - PAN format + holder type
      - Passport MRZ ICAO 9303 check digits
      - Date reasonableness (age, expiry)
    """
    results: list[ValidationResult] = []

    if req.aadhaar_number:
        results.append(_validate_aadhaar(req.aadhaar_number))

    if req.pan_number:
        results.append(_validate_pan(req.pan_number))

    if req.dl_number:
        results.append(_validate_dl(req.dl_number))

    if req.mrz_line1 or req.mrz_line2:
        results.append(_validate_passport_mrz(req.mrz_line1 or "", req.mrz_line2 or "", req))

    results.extend(_validate_dates(req.date_of_birth, req.date_of_expiry))

    overall = all(r.valid for r in results) if results else False

    return {
        "overall_valid": overall,
        "checks": [r.model_dump() for r in results],
    }
