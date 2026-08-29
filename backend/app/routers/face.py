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
            model_name="VGG-Face", # Fast and robust
            detector_backend="opencv",
            enforce_detection=True
        )
        
        match = bool(result.get("verified", False))
        distance = float(result.get("distance", 1.0))
        threshold = float(result.get("threshold", 0.4))
        
        # Calculate a pseudo similarity percentage based on distance and threshold
        if match:
            similarity = round(max(0, (1 - (distance / (threshold * 1.5))) * 100), 2)
        else:
            similarity = round(max(0, (1 - distance) * 100), 2)

        return {
            "match": match,
            "similarity_percent": similarity,
            "distance": round(distance, 4),
            "threshold": threshold,
            "verdict": "MATCH — Same person" if match else "MISMATCH — Different person",
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
