# TamperSight - Master Project Plan & Architecture

## 1. Core Architecture (Edge-First SPA)
- **Framework:** Next.js (App Router) + Tailwind CSS + TypeScript.
- **Dependencies:** `tesseract.js` (OCR), `jsqr` (QR), `@vladmandic/face-api` (Biometrics), `html2pdf.js` (Export), `lucide-react` (Icons), `@google/genai` (AI Audit).

## 2. The 8-Point Feature Plan
1. **Document Ingestion:** Drag-and-drop, auto-downscaling to 1200px buffer to save RAM.
2. **OCR Extraction:** Extract Name, ID, DOB, etc., via Tesseract & Gemini Flash.
3. **Mathematical Validation:** Aadhaar Verhoeff Engine and ICAO 9303 MRZ Engine.
4. **Multi-Layer Forensics:** HTML5 Canvas ELA Heatmap (sub-50ms), Typographic audit via Gemini.
5. **Biometric Match:** 1:1 Face match using face-api.js against webcam.
6. **Dashboard UI:** Split-screen Bento Grid, Dark Mode, Composite Trust Scorecard.
7. **Accountability:** One-Click PDF Export.
8. **Hackathon Presets:** Built-in buttons for (1) Authentic, (2) Low-Res, (3) Forgery to guarantee a perfect live demo.

## 3. UI/UX Design System (Stitch Prompts)
- **Theme:** Deep Dark Mode (#09090B base, #18181B surfaces).
- **Layout:** Bento Grid, strict 8dp spacing, no emojis, Phosphor/Lucide icons.
- **Colors:** Neutral grays with Neon Mint/Green for authentic, Red for tampered. No hardcoded colors in the SPA component layout.
- **Views:** Single Page Application. Left side = Input (Dropzone, Webcam, Run button). Right side = Results (Risk Score Banner, Data Grid, ELA Slider).

## 4. Next Step
Run the Next.js initialization command and install dependencies in a `/frontend` folder.
