# TamperSight — Smart India Hackathon (SIH) Presentation Guide
**Problem Statement:** PS 26188 (Ministry of Home Affairs) - AI-Based Fake Identity Document Screening System

---

## Slide 1: Title Slide
* **Title:** TamperSight: AI-Powered Forensic Identity Verification
* **Subtitle:** Securing Borders and KYC through Multi-Layered Document Analysis
* **Team Name:** [Your Team Name]
* **Problem Statement:** PS 26188 (Ministry of Home Affairs)

---

## Slide 2: The Real-World Problem
* **The Threat:** Identity fraud is becoming highly sophisticated. Criminals use digital manipulation (Photoshop) to alter dates of birth, swap faces, and forge MRZ (Machine Readable Zone) lines to bypass standard security.
* **The Gap:** Current verification systems at borders and banks rely primarily on manual visual inspection or basic OCR, which cannot detect pixel-level digital tampering or mathematical inconsistencies in forged IDs.
* **The Impact:** Increased security breaches, illegal immigration, financial fraud, and prolonged verification times at checkpoints.

---

## Slide 3: Our Solution — TamperSight
* **What it is:** An edge-first, AI-driven digital forensic dashboard that verifies identity documents in under 2 seconds.
* **How it works:** It doesn't just read the document; it interrogates it through a 4-layer pipeline:
  1. **Optical Character Recognition (OCR):** Extracts text even from low-quality, noisy scans.
  2. **Mathematical Validation:** Cross-checks logical rules (e.g., Checksums, Age plausibility).
  3. **Digital Tamper Detection:** Analyzes invisible image data to find manipulated pixels.
  4. **Live Biometrics:** Compares the document face to a live webcam capture to prevent impersonation.

---

## Slide 4: Technical Architecture & Stack
* **Frontend (The Officer's Dashboard):** 
  * Built with **Next.js & React**. 
  * Features a modern, dark-mode "Bento Grid" UI for rapid decision-making. 
  * Integrates `react-webcam` for live biometric capture.
* **Backend (The Forensic Engine):** 
  * Powered by **FastAPI (Python)** for lightning-fast, asynchronous image processing.
* **The AI/Forensic Modules:**
  * **OCR:** `EasyOCR` & `PassportEye` (Dual-pass architecture for extreme accuracy).
  * **Computer Vision:** `OpenCV` (Pixel manipulation detection).
  * **Biometrics:** `DeepFace` utilizing the **VGG-Face** model with strict Cosine Distance thresholds to prevent spoofing.

---

## Slide 5: Module Deep-Dive (How We Catch Fakes)
* **Module 1 & 2: OCR + Logical Validation**
  * We extract data and run mathematical algorithms (ICAO 9303 Check Digits for Passports, Verhoeff Checksums for Aadhaar). If a criminal changes a birth year but forgets to recalculate the MRZ checksum, we catch it instantly.
* **Module 3: Error Level Analysis (ELA) & Metadata**
  * We generate a forensic heatmap. If a face or text was pasted onto the ID using Photoshop, the JPEG compression levels will differ. Our system flags these altered pixels in bright red/white.
* **Module 4: Anti-Impersonation (Live Face Match)**
  * We extract the face from the ID card and match it mathematically against a live webcam feed to ensure the person presenting the ID is the actual owner.

---

## Slide 6: Key Features & Uniqueness (The "Wow" Factor)
* **Dynamic Risk Scoring:** We don't just say "Pass/Fail". We aggregate all 4 modules into a comprehensive **Risk Score (0-100)** to guide the officer's decision.
* **Digital Audit Trail:** Officers can manually correct OCR typos. The system maintains a strict cryptographic audit trail of "Original vs. Corrected" data and automatically re-validates the mathematical rules.
* **Zero-Retention Privacy:** Documents are processed in memory and immediately discarded. No databases of sensitive citizen IDs are kept, ensuring strict data privacy and GDPR compliance.

---

## Slide 7: Scalability & Future Scope
* **Scalability:** The FastAPI backend is completely stateless and can be containerized via Docker for deployment on edge devices (like border control terminals) or scaled via Kubernetes in the cloud.
* **Future Enhancements:** 
  * Integration with central databases (e.g., UIDAI, CCTNS) for cross-referencing.
  * Liveness detection (anti-spoofing) to prevent people from holding up photos to the webcam.
  * Expanding support to international driving licenses and visas using custom YOLOv8 models.

---

## Slide 8: Live Demonstration
* *(Keep this slide blank with just a title. Switch over to your browser to show the live app.)*
* **Demo Flow:**
  1. Upload a genuine document. Show a Low Risk Score and "Verified".
  2. Upload a digitally tampered document. Show the ELA Heatmap lighting up and Validation failing.
  3. Run the Live Face Check using someone else's document to demonstrate the "Manual Verification Required" (Impersonation) alert.
  4. Edit an OCR field manually to show the Audit Trail and Auto-Revalidation working in real-time.
