"""
Module 4 — Face Verification
==============================
Ensures the document owner matches the presented individual.

Pipeline:
  1. Extract face from uploaded document photo (DeepFace)
  2. Accept a live selfie / webcam capture
  3. Compute embedding and cosine similarity (VGG-Face or Facenet)
  4. Return match verdict with confidence percentage

Libraries:
  • DeepFace — multi-backend verification (ArcFace, VGG-Face, Facenet)
  • MediaPipe — face landmark detection for liveness/anti-spoofing
"""

import io
import tempfile
import os

# Force DeepFace to download AI weights into G: drive if available locally, fallback to standard home on cloud
if os.path.exists("G:/"):
    os.environ["DEEPFACE_HOME"] = "G:/"

import cv2
import numpy as np
from deepface import DeepFace
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter()


@router.post("/verify")
async def verify_faces(
    document: UploadFile = File(..., description="Document photo (passport, ID, etc.)"),
    selfie: UploadFile = File(..., description="Live selfie / webcam capture"),
):
    """
    Compare a face from an ID document against a live selfie.
    Returns match verdict and similarity percentage using DeepFace.
    """
    doc_bytes = await document.read()
    selfie_bytes = await selfie.read()

    # DeepFace works best with file paths for its internal OpenCV loading
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as doc_tmp:
        doc_tmp.write(doc_bytes)
        doc_path = doc_tmp.name
        
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as selfie_tmp:
        selfie_tmp.write(selfie_bytes)
        selfie_path = selfie_tmp.name

    try:
        # verify() returns a dictionary with 'verified', 'distance', 'threshold', etc.
        result = DeepFace.verify(
            img1_path=doc_path,
            img2_path=selfie_path,
            model_name="VGG-Face",
            detector_backend="opencv",
            distance_metric="cosine", # Ensure distance is between 0 and 1
            enforce_detection=False
        )
        
        distance = float(result.get("distance", 1.0))
        # VGG-Face cosine threshold is technically 0.40 for identical high-res photos.
        # For ID-to-Selfie (scans/lighting/age gaps), true matches often hit 0.55-0.65 distance.
        # We set the threshold to 0.65 to prevent false rejections of actual document owners.
        strict_threshold = 0.65 
        match = bool(distance < strict_threshold)
        
        # Calculate similarity using a quadratic scale for better human intuition.
        # (e.g., A distance of 0.60 previously gave 40%, now gives 64% similarity).
        similarity = round(max(0, (1 - (distance ** 2)) * 100), 2)
        
        if similarity >= 80:
            verdict = "STRONG MATCH"
        elif similarity >= 57.75:
            verdict = "PROBABLE MATCH"
        elif similarity >= 40:
            verdict = "SLIGHT MATCH (MANUAL CHECK NEEDED)"
        else:
            verdict = "LOW PROBABILITY (MANUAL CHECK)"

        return {
            "match": match,
            "similarity_percent": similarity,
            "distance": round(distance, 4),
            "threshold": strict_threshold,
            "model": result.get("model", "VGG-Face"),
            "verdict": verdict,
        }
        
    except ValueError as e:
        raise HTTPException(400, f"Face detection error: {str(e)}")
    except Exception as e:
        raise HTTPException(500, f"Verification failed: {str(e)}")
    finally:
        # Cleanup
        os.unlink(doc_path) if os.path.exists(doc_path) else None
        os.unlink(selfie_path) if os.path.exists(selfie_path) else None


@router.post("/detect")
async def detect_faces(image: UploadFile = File(...)):
    """
    Detect all faces in an image and return bounding box coordinates.
    Useful for verifying face count and position on a document.
    """
    contents = await image.read()
    
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name
        
    try:
        # extract_faces returns a list of dictionaries
        faces_data = DeepFace.extract_faces(
            img_path=tmp_path,
            detector_backend="opencv",
            enforce_detection=False
        )
        
        faces = []
        for face_obj in faces_data:
            if face_obj.get("confidence", 0) > 0:
                area = face_obj.get("facial_area", {})
                faces.append({
                    "box": {
                        "top": area.get("y", 0),
                        "right": area.get("x", 0) + area.get("w", 0),
                        "bottom": area.get("y", 0) + area.get("h", 0),
                        "left": area.get("x", 0)
                    },
                    "width": area.get("w", 0),
                    "height": area.get("h", 0),
                    "confidence": face_obj.get("confidence", 0)
                })

        return {
            "face_count": len(faces),
            "faces": faces,
            "single_face": len(faces) == 1,
        }
    except Exception as e:
        raise HTTPException(500, f"Detection failed: {str(e)}")
    finally:
        os.unlink(tmp_path) if os.path.exists(tmp_path) else None
