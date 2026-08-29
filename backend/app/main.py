"""
TamperSight FastAPI Backend
============================
AI-Based Fake Identity & Document Screening System
Ministry of Home Affairs — PS 26188

Modules:
  1. /api/ocr          — OCR Extraction (PassportEye + EasyOCR)
  2. /api/validate      — Document Validation (Verhoeff, MRZ checksums)
  3. /api/tamper        — Tampering Detection (ELA, metadata, pixel forensics)
  4. /api/face          — Face Verification (DeepFace + face_recognition)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import ocr, validate, tamper, face

app = FastAPI(
    title="TamperSight — Forensic Document Screening API",
    description="AI-powered identity document analysis for border security",
    version="1.0.0",
)

# Allow Next.js frontend to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health():
    return {"status": "online", "engine": "TamperSight v1.0"}


# ── Register Module Routers ──────────────────────────────────────────
app.include_router(ocr.router,      prefix="/api/ocr",      tags=["Module 1 — OCR Extraction"])
app.include_router(validate.router,  prefix="/api/validate",  tags=["Module 2 — Document Validation"])
app.include_router(tamper.router,    prefix="/api/tamper",    tags=["Module 3 — Tampering Detection"])
app.include_router(face.router,      prefix="/api/face",      tags=["Module 4 — Face Verification"])
