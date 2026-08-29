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

def _compute_ela(image_bytes: bytes, quality: int = 90, scale: int = 15) -> tuple[np.ndarray, float]:
    """
    True ELA: re-save at `quality`, subtract from original,
    amplify differences by `scale`.
    Returns (ela_image_bgr, mean_error).
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
    return ela, mean_error


@router.post("/ela")
async def error_level_analysis(image: UploadFile = File(...), quality: int = 90, scale: int = 15):
    """
    Returns the ELA heatmap as a PNG image.
    Bright spots indicate regions saved at different compression levels —
    a strong signal of digital tampering.
    """
    contents = await image.read()
    try:
        ela_img, mean_err = _compute_ela(contents, quality, scale)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Apply a colormap for visual clarity
    ela_gray = cv2.cvtColor(ela_img, cv2.COLOR_BGR2GRAY)
    ela_colored = cv2.applyColorMap(ela_gray, cv2.COLORMAP_JET)

    _, png = cv2.imencode(".png", ela_colored)
    return StreamingResponse(
        io.BytesIO(png.tobytes()),
        media_type="image/png",
        headers={"X-Mean-Error": f"{mean_err:.4f}"},
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
    for m, n in matches:
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
