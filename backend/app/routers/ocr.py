"""
Module 1 — OCR Extraction
==========================
Extracts text and structured fields from identity documents using PaddleOCR.
"""
import io
import re
import tempfile
from pathlib import Path

# pyrefly: ignore [missing-import]
import cv2
import numpy as np
# pyrefly: ignore [missing-import]
from PIL import Image
from fastapi import APIRouter, UploadFile, File, Form, HTTPException

router = APIRouter()

import easyocr

# Lazy-init EasyOCR
_reader = None
def _get_reader():
    global _reader
    if _reader is None:
        _reader = easyocr.Reader(['en'], gpu=False)
    return _reader

def _try_passporteye(image_bytes: bytes) -> dict | None:
    tmp_path = None
    try:
        from passporteye import read_mrz
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = tmp.name
        mrz = read_mrz(tmp_path)
        if mrz is None: return None
        return mrz.to_dict()
    except Exception:
        return None
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)

def parse_mrz(mrz_lines: list) -> dict:
    if len(mrz_lines) < 2: return {}
    l1, l2 = mrz_lines[0], mrz_lines[1]
    data = {}
    
    if l1.startswith("P"):
        data["Document Type"] = "Passport"
        data["Nationality"] = l1[2:5].replace("<", "")
        names = l1[5:].split("<<")
        surname = names[0].replace("<", " ").strip()
        given = names[1].replace("<", " ").strip() if len(names) > 1 else ""
        data["Name"] = f"{given} {surname}".strip()
        data["Passport Number"] = l2[0:9].replace("<", "")
        dob_raw = l2[13:19]
        if dob_raw.isdigit():
            y = int(dob_raw[0:2])
            prefix = "19" if y > 30 else "20"
            data["Date of birth"] = f"{dob_raw[4:6]}/{dob_raw[2:4]}/{prefix}{dob_raw[0:2]}"
        data["Gender"] = "Male" if l2[20] == "M" else "Female" if l2[20] == "F" else "Unknown"
        exp_raw = l2[21:27]
        if exp_raw.isdigit():
            data["Date of expiry"] = f"{exp_raw[4:6]}/{exp_raw[2:4]}/20{exp_raw[0:2]}"
            
    elif l1.startswith("V"):
        data["Document Type"] = "Visa"
        data["Visa Number"] = l2[0:9].replace("<", "")
        data["Nationality"] = l2[10:13].replace("<", "")
        dob_raw = l2[13:19]
        if dob_raw.isdigit():
            y = int(dob_raw[0:2])
            prefix = "19" if y > 30 else "20"
            data["Date of birth"] = f"{dob_raw[4:6]}/{dob_raw[2:4]}/{prefix}{dob_raw[0:2]}"
        data["Gender"] = "Male" if l2[20] == "M" else "Female" if l2[20] == "F" else "Unknown"
        names = l1[5:].split("<<")
        surname = names[0].replace("<", " ").strip()
        given = names[1].replace("<", " ").strip() if len(names) > 1 else ""
        data["Name"] = f"{given} {surname}".strip()
        
    return data

@router.post("/extract")
async def extract_document(image: UploadFile = File(...), doc_type: str = Form("Auto")):
    contents = await image.read()
    if not contents:
        raise HTTPException(400, "Empty file uploaded")

    # Decode image for EasyOCR
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Could not decode image")

    reader = _get_reader()
    
    # ── PASS 1: OCR on original color image (preserves MRZ characters) ──
    h, w = img.shape[:2]
    img_scaled = img
    if max(h, w) < 1500:
        scale = 1500 / max(h, w)
        img_scaled = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    
    ocr_original = reader.readtext(img_scaled, detail=0)
    
    # ── PASS 2: OCR on preprocessed image (better for names/dates on noisy IDs) ──
    gray = cv2.cvtColor(img_scaled, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(gray)
    kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
    sharpened = cv2.filter2D(enhanced, -1, kernel)
    
    ocr_enhanced = reader.readtext(sharpened, detail=0)
    
    # ── Merge: combine unique lines from both passes ──
    seen = set()
    merged = []
    for line in ocr_original + ocr_enhanced:
        normalized = line.strip().upper()
        if normalized and normalized not in seen:
            seen.add(normalized)
            merged.append(line.strip())
    
    full_text = "\n".join(merged) if merged else ""

    mrz_dict = {}
    mrz_raw = ""
    
    # Try PassportEye FIRST — it uses specialized MRZ zone detection
    # EasyOCR cannot read the `<` chevron characters in MRZ, so we must
    # use a dedicated MRZ reader that works directly on the raw image pixels.
    peye_res = _try_passporteye(contents)
    if peye_res:
        mrz_raw = peye_res.get("raw_text", "")
        mrz_dict = {
            "Document Type": peye_res.get("type", "ID")[0] if peye_res.get("type") else "Passport",
            "Name": f"{peye_res.get('names', '')} {peye_res.get('surname', '')}".strip().replace("<", " ").strip(),
            "Passport Number": peye_res.get("number", ""),
            "Nationality": peye_res.get("nationality", ""),
            "Date of birth": peye_res.get("date_of_birth", ""),
            "Date of expiry": peye_res.get("expiration_date", ""),
            "Gender": {"M": "Male", "F": "Female"}.get(peye_res.get("sex", ""), peye_res.get("sex", ""))
        }
    
    # Fallback: try regex on OCR text if PassportEye didn't find anything
    if not mrz_dict:
        mrz_matches = re.findall(r"([A-Z0-9<]{30,})", full_text.replace(" ", "").upper())
        if len(mrz_matches) >= 2:
            mrz_raw = f"{mrz_matches[0]}\n{mrz_matches[1]}"
            mrz_dict = parse_mrz(mrz_matches)

    # Regex extractions for non-MRZ docs
    fields = {}
    if not mrz_dict:
        fields["Document Type"] = doc_type if doc_type != "Auto" else "Unknown ID"
        
        # Generic Name Fallback 1: Explicit "Name:" prefix
        name_match = re.search(r"(?:Name|Nane|Nome)\s*[:\-]?\s*([A-Za-z\s]{4,40})", full_text, re.IGNORECASE)
        if name_match:
            fields["Name"] = re.sub(r"[^A-Za-z\s]+.*$", "", name_match.group(1)).strip()
        else:
            # Generic Name Fallback 2: Look for lines that look like a person's name (2+ words, letters only, no stop-words)
            stop_words = {"GOVERNMENT", "INDIA", "FATHER", "MOTHER", "TAX", "DEPARTMENT", "INCOME", "DATE", "BIRTH", "YEAR", "MALE", "FEMALE", "SIGNATURE", "PASSPORT", "SURNAME", "NAME", "REPUBLIC", "BLOOD", "GROUP", "ISSUING", "AUTHORITY", "CARD", "ELECTION", "COMMISSION", "UNITED", "ARAB", "EMIRATES", "FEDERAL", "IDENTITY", "CITIZENSHIP", "MINISTRY", "DEFENCE", "PERMIT", "LICENSE", "YOUR", "AADHAAR", "NO", "NUMBER", "ENROLLMENT", "VID"}
            
            candidates = []
            for line in full_text.split("\n"):
                clean_line = line.strip()
                # Matches lines with only letters, spaces, or dots (e.g., 'A. P. J. Abdul Kalam' or 'John Doe')
                if re.match(r"^[A-Za-z\s\.]{5,40}$", clean_line):
                    words = set(clean_line.upper().split())
                    # Make sure it has at least 2 words (First and Last name) and doesn't contain standard ID keywords
                    if len(words) >= 2 and not words.intersection(stop_words):
                        candidates.append(clean_line.title())
            
            if candidates:
                fields["Name Candidates"] = " | ".join(candidates)
            
        # Dates
        dates = re.findall(r"\b(\d{2}[/\-]\d{2}[/\-]\d{4})\b", full_text)
        if dates:
            fields["Dates Found"] = ", ".join(dates)
            
        # Aadhaar
        aadhaar = re.search(r"\b(\d{4}\s?\d{4}\s?\d{4})\b", full_text)
        if aadhaar: fields["National ID Number"] = aadhaar.group(1).replace(" ", "")
        
        # PAN
        pan = re.search(r"\b([A-Z]{5}[0-9]{4}[A-Z])\b", full_text)
        if pan: fields["PAN Number"] = pan.group(1)
        
        # UAE / Generic sumsub ID
        uae_id = re.search(r"\b(\d{3}[\-\s]?\d{4}[\-\s]?\d{7}[\-\s]?[A-Z0-9])\b", full_text)
        if uae_id: fields["UAE ID Number"] = uae_id.group(1)

    return {
        "mrz_raw": mrz_raw,
        "ocr_text": full_text,
        "extracted_fields": mrz_dict if mrz_dict else fields,
    }
