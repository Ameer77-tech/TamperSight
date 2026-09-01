"""
Module 3 — Tampering Detection
================================
Detects digitally or physically altered documents using pixel-level forensics.

Techniques:
  1. Error Level Analysis (ELA)  — Recompress at known quality, compute
     pixel deltas to expose edits at different compression levels.
  2. EXIF Metadata Analysis      — Detect editing software signatures,
     suspicious creation dates, GPS anomalies.
  3. Copy-Move Forgery Detection — ORB keypoint matching to detect
     cloned regions within a single document image.
  4. Edge Coherence Analysis     — Canny edge map to detect unnatural
     boundaries around pasted elements (photo swap detection).
"""

import io
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse

router = APIRouter()


# ── 1. Error Level Analysis (ELA) ────────────────────────────────────

def _compute_ela(image_bytes: bytes, quality: int = 90, scale: int = 15) -> tuple[np.ndarray, float, int]:
    """
    True ELA: re-save at `quality`, subtract from original,
    amplify differences by `scale`.
    Returns (ela_image_bgr, mean_error, ela_score).
    """
    # Decode original
    nparr = np.frombuffer(image_bytes, np.uint8)
    original = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if original is None:
        raise ValueError("Cannot decode image")

    # Re-encode at target quality
    _, enc = cv2.imencode(".jpg", original, [cv2.IMWRITE_JPEG_QUALITY, quality])
    recompressed = cv2.imdecode(enc, cv2.IMREAD_COLOR)

    # Pixel-level absolute difference
    diff = cv2.absdiff(original, recompressed)
    ela = np.clip(diff * scale, 0, 255).astype(np.uint8)

    mean_error = float(np.mean(diff))
    # Calibrate raw mean_error (~0.0 - 6.0+) into normalized ELA score (0 - 100)
    ela_score = min(100, max(0, int(round((mean_error / 6.0) * 100))))
    return ela, mean_error, ela_score


@router.post("/ela")
async def error_level_analysis(image: UploadFile = File(...), quality: int = 90, scale: int = 15):
    """
    Returns the ELA heatmap as a PNG image along with normalized score and raw metric headers.
    Bright spots indicate regions saved at different compression levels —
    a strong signal of digital tampering.
    """
    contents = await image.read()
    try:
        ela_img, mean_err, ela_score = _compute_ela(contents, quality, scale)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Return the raw scaled ELA image (which has natural color artifacts)
    _, png = cv2.imencode(".png", ela_img)
    return StreamingResponse(
        io.BytesIO(png.tobytes()),
        media_type="image/png",
        headers={
            "X-Mean-Error": f"{mean_err:.4f}",
            "X-ELA-Score": str(ela_score),
        },
    )


# ── 2. EXIF Metadata Analysis ────────────────────────────────────────

@router.post("/metadata")
async def metadata_analysis(image: UploadFile = File(...)):
    """
    Extract and analyze EXIF metadata for forensic red flags:
    editing software, inconsistent timestamps, GPS data, etc.
    """
    import exifread

    contents = await image.read()
    tags = exifread.process_file(io.BytesIO(contents), details=False)

    metadata = {str(k): str(v) for k, v in tags.items()}

    # Forensic flags
    flags = []
    software = metadata.get("Image Software", "").lower()
    if any(tool in software for tool in ["photoshop", "gimp", "paint", "canva", "pixlr"]):
        flags.append(f"Editing software detected: {metadata.get('Image Software')}")

    if "EXIF DateTimeOriginal" in metadata and "EXIF DateTimeDigitized" in metadata:
        if metadata["EXIF DateTimeOriginal"] != metadata["EXIF DateTimeDigitized"]:
            flags.append("Original and digitized timestamps differ — possible re-edit")

    if "GPS GPSLatitude" in metadata:
        flags.append("GPS coordinates embedded — unusual for scanned documents")

    return {
        "metadata": metadata,
        "flags": flags,
        "flag_count": len(flags),
        "suspicious": len(flags) > 0,
    }


# ── 3. Copy-Move Forgery Detection ───────────────────────────────────

@router.post("/copy-move")
async def copy_move_detection(image: UploadFile = File(...)):
    """
    Detect cloned/copy-pasted regions within a document using
    ORB keypoint matching. High match count in spatially distinct
    regions indicates copy-move forgery.
    """
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise HTTPException(400, "Cannot decode image")

    orb = cv2.ORB_create(nFeatures=2000)
    keypoints, descriptors = orb.detectAndCompute(img, None)

    if descriptors is None or len(keypoints) < 10:
        return {"forgery_detected": False, "reason": "Insufficient keypoints", "matches": 0}

    # Self-match with BFMatcher
    bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=False)
    matches = bf.knnMatch(descriptors, descriptors, k=2)

    # Filter: matched to a different keypoint, spatially distant
    suspicious = []
    for match_pair in matches:
        if len(match_pair) < 2:
            continue
        m, n = match_pair
        if m.queryIdx == m.trainIdx:
            continue
        pt1 = keypoints[m.queryIdx].pt
        pt2 = keypoints[m.trainIdx].pt
        dist = np.sqrt((pt1[0] - pt2[0]) ** 2 + (pt1[1] - pt2[1]) ** 2)
        if m.distance < 30 and dist > 50:
            suspicious.append({
                "pt1": [int(pt1[0]), int(pt1[1])],
                "pt2": [int(pt2[0]), int(pt2[1])],
                "distance": float(dist),
            })

    forgery = len(suspicious) > 15

    return {
        "forgery_detected": forgery,
        "suspicious_matches": len(suspicious),
        "threshold": 15,
        "details": suspicious[:20],  # Cap output
    }


# ── 4. Edge Coherence Analysis ───────────────────────────────────────

@router.post("/edge-analysis")
async def edge_coherence(image: UploadFile = File(...)):
    """
    Canny edge detection to highlight unnatural boundary discontinuities
    around pasted elements (e.g., a photo swapped onto an ID card).
    Returns the edge map as a PNG.
    """
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise HTTPException(400, "Cannot decode image")

    blurred = cv2.GaussianBlur(img, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)

    # Colorize
    colored_edges = cv2.applyColorMap(edges, cv2.COLORMAP_INFERNO)

    _, png = cv2.imencode(".png", colored_edges)
    return StreamingResponse(
        io.BytesIO(png.tobytes()),
        media_type="image/png",
    )


# ── 5. Sample/Demo Watermark Detection ──────────────────────────────

# Canonical keywords and OCR-friendly variants (leet-speak, spaced, etc.)
_WATERMARK_PATTERNS = [
    # Exact keywords
    r"\bSAMPLE\b", r"\bSPECIMEN\b", r"\bDEMO\b", r"\bDEMONSTRATION\b",
    r"\bVOID\b", r"\bTRAINING\b", r"\bTEST\b", r"\bCOPY\b",
    r"\bNOT\s+FOR\s+OFFICIAL\s+USE\b", r"\bNOT\s+VALID\b",
    r"\bFAKE\b", r"\bDRAFT\b",
    # OCR misread variants
    r"\bSAMPL[E3]\b", r"\bSP[E3]C[I1]M[E3]N\b", r"\bD[E3]M[O0]\b",
    # Spaced-out watermarks (common on IDs)
    r"\bS\s+A\s+M\s+P\s+L\s+E\b", r"\bS\s+P\s+E\s+C\s+I\s+M\s+E\s+N\b",
    r"\bD\s+E\s+M\s+O\b", r"\bV\s+O\s+I\s+D\b",
]

import re as _re

@router.post("/detect-watermarks")
async def detect_watermarks(image: UploadFile = File(...)):
    """
    Detect SAMPLE / SPECIMEN / DEMO / VOID markings in a document image.
    Uses the existing EasyOCR reader to extract text, then pattern-matches
    against known watermark keywords including OCR-error variants.
    
    Returns a list of findings. Does NOT modify the image or other analysis.
    """
    contents = await image.read()

    # Decode and run OCR (reuses the existing lazy-init reader from ocr module)
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Cannot decode image")

    # Use EasyOCR with detail=1 to get bounding boxes
    from app.routers.ocr import _get_reader
    reader = _get_reader()

    h, w = img.shape[:2]
    img_scaled = img
    if max(h, w) < 1500:
        scale = 1500 / max(h, w)
        img_scaled = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    results_detail = reader.readtext(img_scaled, detail=1)

    findings = []
    for (bbox, text, conf) in results_detail:
        text_upper = text.strip().upper()
        for pattern in _WATERMARK_PATTERNS:
            if _re.search(pattern, text_upper):
                # bbox is [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
                xs = [p[0] for p in bbox]
                ys = [p[1] for p in bbox]
                findings.append({
                    "type": "sample_demo_marking",
                    "matched_text": text.strip(),
                    "matched_pattern": pattern,
                    "location": [int(min(xs)), int(min(ys)), int(max(xs) - min(xs)), int(max(ys) - min(ys))],
                    "confidence": round(float(conf), 2),
                    "reason": f"Sample/demo marking detected: {text.strip()}",
                })
                break  # Don't double-count the same text region

    return {
        "watermark_detected": len(findings) > 0,
        "findings": findings,
        "total_findings": len(findings),
    }


# ── 6. Obvious Redaction / Overlay Detection ─────────────────────────

@router.post("/detect-redactions")
async def detect_redactions(image: UploadFile = File(...)):
    """
    Detect obvious rectangular redaction bars, solid-color patches,
    and pasted regions that cover document text.
    
    Uses OpenCV contour analysis on thresholded channels.
    Conservative: ignores normal document elements like photos, logos, QR codes.
    
    Returns a list of findings. Does NOT modify any existing analysis.
    """
    contents = await image.read()

    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Cannot decode image")

    h, w = img.shape[:2]
    img_area = h * w

    findings = []

    # ── Strategy 1: Detect solid-color rectangular regions ──
    # Convert to grayscale, find regions with near-zero variance
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Look for very dark (black redaction bars) and very bright (white cover-ups)
    for label, thresh_fn in [
        ("dark_redaction", lambda g: cv2.threshold(g, 30, 255, cv2.THRESH_BINARY_INV)[1]),
        ("bright_redaction", lambda g: cv2.threshold(g, 240, 255, cv2.THRESH_BINARY)[1]),
    ]:
        mask = thresh_fn(gray)
        # Morphological close to merge nearby patches
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 5))
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            x, y, cw, ch = cv2.boundingRect(cnt)
            area = cw * ch
            aspect = cw / max(ch, 1)

            # Filter: must be reasonably sized (not tiny noise, not the entire image)
            # A redaction bar is typically wide and short (aspect > 2)
            # or a square-ish patch covering a field
            if area < img_area * 0.005:  # Too small (< 0.5% of image)
                continue
            if area > img_area * 0.4:  # Too large (> 40% — probably background)
                continue

            # Check that the region is actually uniform (low variance)
            roi = gray[y:y+ch, x:x+cw]
            variance = float(np.var(roi))
            if variance > 200:  # Not actually uniform — skip
                continue

            # Compute confidence based on how uniform + how bar-shaped it is
            uniformity = max(0, 1.0 - (variance / 200))
            bar_likeness = min(aspect / 3.0, 1.0) if aspect > 1.5 else 0.5
            confidence = round(min(uniformity * 0.6 + bar_likeness * 0.4, 1.0), 2)

            if confidence < 0.4:
                continue

            findings.append({
                "type": "possible_redaction",
                "subtype": label,
                "location": [int(x), int(y), int(cw), int(ch)],
                "confidence": confidence,
                "variance": round(variance, 1),
                "reason": f"Large uniform rectangular region ({label.replace('_', ' ')}) — possible redaction or overlay.",
            })

    # ── Strategy 2: Detect unnatural solid-color patches (any color) ──
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    s_channel = hsv[:, :, 1]  # Saturation

    # Very low saturation + uniform = gray/white/black patch
    _, low_sat_mask = cv2.threshold(s_channel, 20, 255, cv2.THRESH_BINARY_INV)
    kernel2 = cv2.getStructuringElement(cv2.MORPH_RECT, (20, 8))
    low_sat_mask = cv2.morphologyEx(low_sat_mask, cv2.MORPH_CLOSE, kernel2)

    contours2, _ = cv2.findContours(low_sat_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for cnt in contours2:
        x, y, cw, ch = cv2.boundingRect(cnt)
        area = cw * ch
        aspect = cw / max(ch, 1)

        if area < img_area * 0.01:
            continue
        if area > img_area * 0.3:
            continue

        roi = gray[y:y+ch, x:x+cw]
        variance = float(np.var(roi))
        if variance > 100:
            continue

        # Check it's not already caught by Strategy 1
        already_found = False
        for f in findings:
            fx, fy, fw, fh = f["location"]
            overlap_x = max(0, min(x+cw, fx+fw) - max(x, fx))
            overlap_y = max(0, min(y+ch, fy+fh) - max(y, fy))
            if overlap_x * overlap_y > area * 0.5:
                already_found = True
                break
        if already_found:
            continue

        confidence = round(max(0.4, 1.0 - (variance / 100)), 2)

        findings.append({
            "type": "possible_overlay",
            "location": [int(x), int(y), int(cw), int(ch)],
            "confidence": confidence,
            "variance": round(variance, 1),
            "reason": "Uniform low-saturation region detected — possible pasted overlay or erased content.",
        })

    # Sort by confidence descending, cap at 10 findings
    findings.sort(key=lambda f: f["confidence"], reverse=True)
    findings = findings[:10]

    return {
        "redaction_detected": len(findings) > 0,
        "findings": findings,
        "total_findings": len(findings),
    }
