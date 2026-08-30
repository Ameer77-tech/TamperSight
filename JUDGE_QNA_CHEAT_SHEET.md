# TamperSight — Project Explanation & Judge Q&A Cheat Sheet

This document is your ultimate guide for the Smart India Hackathon (SIH) presentation. It explains the project in plain English so you can confidently answer any question a judge throws at you.

---

## 1. What is TamperSight? (The Elevator Pitch)
TamperSight is an **AI-based digital forensic dashboard** designed for border security and KYC (Know Your Customer) officers. It takes a scanned identity document (like a Passport or Aadhaar) and a live webcam photo, analyzes them in under 2 seconds, and tells the officer the **Risk Score** of that person committing identity fraud.

## 2. The Real-World Problem It Solves
Criminals are getting smarter. They no longer just print fake ID cards; they use Photoshop or Generative AI to create **Synthetic Identities**.
* **Problem 1 (Tampering):** A fraudster takes a real Aadhaar card, uses Photoshop to erase the birth year (1990) and types in "2005" to fake their age. A human guard won't notice the font change.
* **Problem 2 (Impersonation):** A fraudster steals someone else's valid passport and tries to use it.
* **Problem 3 (Synthetic Math):** An AI generates a perfectly looking, 100% fake passport, but the ID numbers inside it are just random gibberish.

## 3. How TamperSight Solves It (The 4 Modules)
Instead of just looking at the document, TamperSight acts like a digital detective looking at 4 different layers:

### Module 1: The Text Layer (OCR)
* **What it does:** Reads the text off the card (Name, DOB, ID Number).
* **Tech Used:** `EasyOCR` (AI-based text reader) + `PassportEye` (specialized in reading the machine-readable lines at the bottom of passports).

### Module 2: The Math Layer (Validation)
* **What it does:** Criminals who Photoshop dates usually forget to recalculate the secret mathematical formulas hidden inside ID numbers. We run the extracted ID numbers through official algorithms.
* **Tech Used:** Python math algorithms (`Verhoeff Checksum` for Aadhaar, `ICAO 9303 Check Digits` for Passports, Regex for PAN cards).

### Module 3: The Invisible Pixel Layer (Forensics)
* **What it does:** Generates a heatmap of the image. If someone photoshopped a new face onto an ID, that specific spot will light up bright red/white because the "JPEG compression level" is different from the rest of the card.
* **Tech Used:** `OpenCV` running **Error Level Analysis (ELA)** and Copy-Move Forgery detection.

### Module 4: The Biometric Layer (Anti-Impersonation)
* **What it does:** Crops the face from the ID card and compares it mathematically against the live webcam selfie you just took.
* **Tech Used:** `DeepFace` utilizing the **VGG-Face model**. It uses a strict "Cosine Distance" mathematical threshold. If the similarity is too low, it flags it as an impersonation attempt.

---

## 4. Project Limitations (Be Honest with Judges)
Judges love it when you acknowledge your limitations. It proves you understand real-world engineering.
1. **No Liveness Detection (Yet):** Currently, our webcam check just looks at a face. A fraudster could hold up a printed photo of the victim to the webcam to bypass it. **Fix:** We plan to add 3D passive liveness detection in the future.
2. **Physical Forgeries:** We analyze *digital* scans. If someone physically prints a fake card perfectly and takes a photo of it, ELA (which detects digital photoshop artifacts) might not catch it (though the Math or Face checks probably still will).
3. **No Central Database Access:** We don't have access to the Indian Government's UIDAI servers to verify if an Aadhaar number actually belongs to a specific person. We can only verify if the number is *mathematically valid*.

---

## 5. Typical Judge Questions & How to Answer Them

**Q1. Judge: "If someone uses Midjourney/AI to generate a completely fake ID, how does your Error Level Analysis (ELA) catch it?"**
> **Answer:** "It actually doesn't! ELA only catches *photoshopped* (spliced) images. However, an AI-generated ID will almost certainly fail our **Mathematical Checksum (Module 2)** because AI image generators don't know how to calculate Verhoeff algorithms. It will also fail our **Live Biometrics (Module 4)** because the AI-generated person doesn't exist to take a live selfie."

**Q2. Judge: "Why did you use Next.js and FastAPI instead of a basic Django app?"**
> **Answer:** "Because this needs to be an 'Edge-first' system for border checkpoints. FastAPI allows us to run asynchronous heavy AI models (like DeepFace and OCR) concurrently in the background without blocking the UI. Next.js gives us an incredibly fast, stateful dashboard to display the results instantly to the officer."

**Q3. Judge: "What happens if your OCR misreads a blurry '8' as a 'B'? Doesn't the whole system fail?"**
> **Answer:** "We built a **Digital Audit Trail** specifically for this. If the OCR makes a mistake, the officer can click 'Edit', correct the 'B' back to an '8', and hit 'Save & Revalidate'. The system securely logs the manual correction and re-runs the mathematical validation instantly."

**Q4. Judge: "Is it secure? Are you storing citizen ID cards?"**
> **Answer:** "No. Our architecture is built on a **Zero-Retention Policy**. Documents are processed entirely in server memory and instantly discarded after the Risk Score is generated. We are fully compliant with GDPR and basic data privacy standards."

**Q5. Judge: "Why did you use the 'VGG-Face' model instead of something else?"**
> **Answer:** "VGG-Face provides an excellent balance of speed and accuracy for ID-to-Selfie matching. ID card photos are usually low quality or years old, which confuses highly sensitive models. VGG-Face, combined with our strict Cosine distance threshold (0.30), gave us the best real-world results without falsely rejecting legitimate citizens."
