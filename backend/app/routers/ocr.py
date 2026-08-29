"""
Module 1 — OCR Extraction
==========================
Extracts text and structured fields from identity documents.

Pipeline:
  1. PassportEye  → Detects & parses MRZ zone (passport-grade)
  2. EasyOCR      → Full-page deep-learning OCR for non-MRZ fields
  3. Regex engine → Extracts Aadhaar (12-digit), PAN (XXXXX0000X),
                    Visa numbers, and dates from raw OCR text

Supported Documents:
  • Passport, Visa, Aadhaar, PAN Card, Driving Licence, Permits
"""

import io
import re
import tempfile
from pathlib import Path

import cv2
import numpy as np
import easyocr
from PIL import Image
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()

# Lazy-init EasyOCR (heavy model, load once)
_reader: easyocr.Reader | None = None


def _get_reader():
    global _reader
    if _reader is None:
        _reader = easyocr.Reader(["en"], gpu=False)
    return _reader


def _try_passporteye(image_bytes: bytes) -> dict | None:
    """Attempt MRZ extraction via PassportEye."""
    try:
        from passporteye import read_mrz
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name

        mrz = read_mrz(tmp_path)
        if mrz is None:
            return None

        mrz_data = mrz.to_dict()
        return {
            "source": "passporteye",
            "type": mrz_data.get("type", ""),
            "country": mrz_data.get("country", ""),
            "number": mrz_data.get("number", ""),
            "surname": mrz_data.get("surname", ""),
            "names": mrz_data.get("names", ""),
            "nationality": mrz_data.get("nationality", ""),
            "date_of_birth": mrz_data.get("date_of_birth", ""),
            "sex": mrz_data.get("sex", ""),
            "expiration_date": mrz_data.get("expiration_date", ""),
            "mrz_raw": mrz_data.get("raw_text", ""),
            "valid_score": mrz_data.get("valid_score", 0),
        }
    except Exception:
        return None
    finally:
        Path(tmp_path).unlink(missing_ok=True) if "tmp_path" in dir() else None


def _extract_fields_from_text(full_text: str) -> dict:
    """Regex-based field extraction from raw OCR text."""
    fields: dict = {}

    # Aadhaar: 4-4-4 digit pattern
    aadhaar = re.search(r"\b(\d{4}\s?\d{4}\s?\d{4})\b", full_text)
    if aadhaar:
        fields["aadhaar_number"] = aadhaar.group(1).replace(" ", "")

    # PAN: ABCDE1234F
    pan = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", full_text)
    if pan:
        fields["pan_number"] = pan.group(1)

    # Passport Number: A1234567
    passport = re.search(r"\b([A-Z]\d{7})\b", full_text)
    if passport:
        fields["passport_number"] = passport.group(1)

    # Dates: DD/MM/YYYY or DD-MM-YYYY
    dates = re.findall(r"\b(\d{2}[/\-]\d{2}[/\-]\d{4})\b", full_text)
    if dates:
        fields["dates_found"] = dates

    # Names: Lines that are mostly uppercase English letters
    name_candidates = [
        line.strip()
        for line in full_text.split("\n")
        if re.match(r"^[A-Z][a-zA-Z\s]{3,40}$", line.strip())
    ]
    if name_candidates:
        fields["name_candidates"] = name_candidates

    return fields


@router.post("/extract")
async def extract_document(image: UploadFile = File(...)):
    """
    Upload an identity document image. Returns:
      - MRZ data (if passport/visa detected via PassportEye)
      - Full OCR text (via EasyOCR)
      - Regex-extracted structured fields (Aadhaar, PAN, dates, names)
    """
    contents = await image.read()

    if not contents:
        raise HTTPException(400, "Empty file uploaded")

    # ── Step 1: Try PassportEye MRZ ──────────────────────────────────
    mrz_result = _try_passporteye(contents)

    # ── Step 2: Full-page EasyOCR ────────────────────────────────────
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Could not decode image")

    reader = _get_reader()
    ocr_results = reader.readtext(img, detail=0)
    full_text = "\n".join(ocr_results)

    # ── Step 3: Regex field extraction ───────────────────────────────
    fields = _extract_fields_from_text(full_text)

    return {
        "mrz": mrz_result,
        "ocr_text": full_text,
        "extracted_fields": fields,
    }
