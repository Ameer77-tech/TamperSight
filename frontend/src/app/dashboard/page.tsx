/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const, @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";

export default function DashboardPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const bentoCardStyle = "bg-surface-card border border-border-subtle p-6 rounded-sm hover:border-primary-container/30 transition-colors duration-150";

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [validationData, setValidationData] = useState<any>(null);
  const [isEditingOCR, setIsEditingOCR] = useState(false);
  const [editedFields, setEditedFields] = useState<any>({});
  const [ocrCorrections, setOcrCorrections] = useState<any>({});
  const [elaImage, setElaImage] = useState<string | null>(null);
  const [elaError, setElaError] = useState<string | null>(null);
  const [elaScore, setElaScore] = useState<number | null>(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [faceResult, setFaceResult] = useState<any>(null);
  const [docType, setDocType] = useState<string>("Auto");
  const [watermarkResult, setWatermarkResult] = useState<any>(null);
  const [redactionResult, setRedactionResult] = useState<any>(null);
  const [metadataResult, setMetadataResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webcamRef = useRef<Webcam>(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedSelfie(imageSrc);
      setShowWebcam(false);
    }
  }, [webcamRef]);

  const retake = () => {
    setCapturedSelfie(null);
    setShowWebcam(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
      setSelectedFile(file);
      setExtractedData(null);
      setRawResponse(null);
      setValidationData(null);
      setFaceResult(null);
      setElaImage(null);
      setElaError(null);
      setElaScore(null);
      setWatermarkResult(null);
      setRedactionResult(null);
      setMetadataResult(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const runValidation = async (fields: any, mrz_raw: string | null) => {
    const payload = {
      aadhaar_number: fields["National ID Number"] || null,
      pan_number: fields["PAN Number"] || null,
      dl_number: fields["Driving Licence"] || null,
      passport_number: fields["Passport Number"] || null,
      mrz_line1: mrz_raw && mrz_raw.includes("\n") ? mrz_raw.split("\n")[0] : null,
      mrz_line2: mrz_raw && mrz_raw.includes("\n") ? mrz_raw.split("\n")[1] : null,
      date_of_birth: fields["Date of birth"] || (fields["Dates Found"] ? fields["Dates Found"].split(",")[0].trim() : null) || null,
      date_of_expiry: fields["Date of expiry"] || null
    };

    try {
      const valRes = await fetch(`${API_URL}/api/validate/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (valRes.ok) {
        const valData = await valRes.json();
        setValidationData(valData);
      }
    } catch (e) {
      console.error("Validation Error:", e);
    }
  };

  const handleSaveAndRevalidate = () => {
    const newFields = { ...extractedData, ...editedFields };
    
    // Check what was changed for the audit trail
    const newCorrections = { ...ocrCorrections };
    Object.keys(editedFields).forEach(key => {
      if (editedFields[key] !== extractedData[key] && editedFields[key] !== undefined) {
        newCorrections[key] = {
          original: ocrCorrections[key]?.original || extractedData[key],
          corrected: editedFields[key]
        };
      }
    });
    
    setExtractedData(newFields);
    setOcrCorrections(newCorrections);
    setIsEditingOCR(false);
    runValidation(newFields, rawResponse?.mrz_raw || null);
  };

  const handleRunAudit = async () => {
    if (!selectedFile) return alert("Please upload a document first!");
    
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("doc_type", docType);
      
      // 1. Call the OCR Backend
      const ocrPromise = fetch(`${API_URL}/api/ocr/extract`, {
        method: "POST",
        body: formData,
      });

      // 2. Call the Tampering (ELA) Backend simultaneously
      const elaPromise = fetch(`${API_URL}/api/tamper/ela`, {
        method: "POST",
        body: formData,
      }).then(async (res) => {
        if (res.ok) {
          const meanErr = res.headers.get("X-Mean-Error") || "0";
          const scoreHeader = res.headers.get("X-ELA-Score");
          const rawVal = parseFloat(meanErr);
          const computedScore = scoreHeader ? parseInt(scoreHeader, 10) : Math.min(100, Math.round((rawVal / 6.0) * 100));
          
          setElaError(meanErr);
          setElaScore(computedScore);
          const blob = await res.blob();
          setElaImage(URL.createObjectURL(blob));
        }
      }).catch(err => console.error("ELA Error:", err));

      // 2b. Call Watermark Detection (parallel, non-blocking)
      const wmFormData = new FormData();
      wmFormData.append("image", selectedFile);
      fetch(`${API_URL}/api/tamper/detect-watermarks`, {
        method: "POST",
        body: wmFormData,
      })
        .then(res => res.json())
        .then(data => setWatermarkResult(data))
        .catch(err => console.error("Watermark Detection Error:", err));

      // 2c. Call Redaction Detection (parallel, non-blocking)
      const rdFormData = new FormData();
      rdFormData.append("image", selectedFile);
      fetch(`${API_URL}/api/tamper/detect-redactions`, {
        method: "POST",
        body: rdFormData,
      })
        .then(res => res.json())
        .then(data => setRedactionResult(data))
        .catch(err => console.error("Redaction Detection Error:", err));

      // 2d. Call Metadata Analysis (detects editing software like MS Paint)
      const mdFormData = new FormData();
      mdFormData.append("image", selectedFile);
      fetch(`${API_URL}/api/tamper/metadata`, {
        method: "POST",
        body: mdFormData,
      })
        .then(res => res.json())
        .then(data => setMetadataResult(data))
        .catch(err => console.error("Metadata Error:", err));

      const response = await ocrPromise;

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Backend Error: ${errText}`);
      }
      
      const data = await response.json();
      
      // Remove raw OCR text so it's not dumping huge text blocks
      const cleanData = { ...data };
      delete cleanData.ocr_text;
      setRawResponse(cleanData);
      
      const fields = data.extracted_fields || {};
      
      setExtractedData(fields);
      setEditedFields({});
      setOcrCorrections({});
      setIsEditingOCR(false);

      // 3. Call the Document Validation Backend
      await runValidation(fields, data.mrz_raw || null);

      // 4. Call Face Verification (if selfie captured)
      if (capturedSelfie && selectedFile) {
        const dataURLtoFile = (dataurl: string, filename: string) => {
          let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)![1],
              bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
          while(n--){
              u8arr[n] = bstr.charCodeAt(n);
          }
          return new File([u8arr], filename, {type:mime});
        };

        const faceFormData = new FormData();
        faceFormData.append("document", selectedFile);
        faceFormData.append("selfie", dataURLtoFile(capturedSelfie, "selfie.jpg"));
        
        fetch(`${API_URL}/api/face/verify`, {
          method: "POST",
          body: faceFormData
        })
        .then(res => res.json())
        .then(data => setFaceResult(data))
        .catch(err => console.error("Face Verify Error:", err));
      }
      
    } catch (error) {
      console.error("API Error:", error);
      alert("Failed to connect to backend. Make sure the Python FastAPI server is running on port 8000!");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 flex flex-col md:grid md:grid-cols-[1fr_1.5fr] gap-6 overflow-y-auto md:overflow-hidden h-full max-w-[1600px] mx-auto w-full font-sans">
      
      {/* Left Column: Input */}
      <section className="flex flex-col gap-4 h-auto md:h-full overflow-visible md:overflow-y-auto pr-0 md:pr-2 pb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 #0A0A0A' }}>
        
        {/* Dropzone */}
        <label 
          htmlFor="document-upload"
          className="relative w-full aspect-video border-2 border-dashed border-border-strong rounded bg-surface-elevated flex flex-col items-center justify-center gap-4 transition-colors duration-200 cursor-pointer hover:border-outline group overflow-hidden shrink-0"
        >
          <input 
            id="document-upload"
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
          {selectedImage ? (
            <img src={selectedImage} alt="Uploaded Document" className="absolute inset-0 w-full h-full object-contain p-2 pointer-events-none" />
          ) : (
            <div className="pointer-events-none flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant group-hover:text-primary-container transition-colors">upload_file</span>
              <p className="text-base text-on-surface-variant text-center px-4" style={{ fontFamily: '"Inter", sans-serif' }}>Tap to upload document image</p>
            </div>
          )}
        </label>

        {/* Document Type Selector */}
        <div className={`${bentoCardStyle} flex flex-col gap-2 p-4 shrink-0`}>
          <label className="text-xs text-on-surface-variant uppercase tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Document Type</label>
          <select 
            value={docType}
            onChange={(e) => setDocType(e.target.value)}
            className="w-full h-10 bg-surface-base border border-border-strong rounded text-on-surface px-3 outline-none focus:border-primary-main transition-colors"
            style={{ fontFamily: '"Inter", sans-serif' }}
          >
            <option value="Auto">Auto-Detect</option>
            <option value="Passport">Passport</option>
            <option value="Visa">Visa</option>
            <option value="National ID">National ID</option>
            <option value="Driving License">Driving License</option>
            <option value="Permit">Permit Document</option>
          </select>
        </div>

        {/* Webcam Capture */}
        <div className={`${bentoCardStyle} flex flex-col items-center justify-center gap-4 min-h-[200px] shrink-0`}>
          {!showWebcam && !capturedSelfie && (
            <>
              <span className="material-symbols-outlined text-3xl text-on-surface-variant">photo_camera</span>
              <p className="text-xs text-on-surface-variant text-center uppercase tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>LIVE VERIFICATION REQUIRED</p>
              <button type="button" onClick={() => setShowWebcam(true)} className="px-6 py-2 border border-border-subtle rounded text-primary-main hover:border-primary-container hover:text-primary-container transition-colors duration-150 text-xs flex items-center gap-2" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                <span className="material-symbols-outlined text-sm">camera</span> Capture Live Face
              </button>
            </>
          )}

          {showWebcam && (
            <div className="w-full relative rounded overflow-hidden">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{ facingMode: "user" }}
                className="w-full object-cover aspect-[4/3]"
              />
              <div className="absolute inset-0 border-2 border-primary-main/30 border-dashed m-4 rounded-lg pointer-events-none"></div>
              <button type="button" onClick={capture} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary-main text-black px-4 py-2 rounded-full text-xs font-bold shadow-lg hover:bg-primary-container transition-colors">
                CAPTURE
              </button>
            </div>
          )}

          {capturedSelfie && !showWebcam && (
            <div className="w-full flex flex-col gap-3">
              <img src={capturedSelfie} alt="Selfie" className="w-full aspect-[4/3] object-cover rounded border border-border-subtle" />
              <div className="flex gap-2">
                <div className="flex-1 px-4 py-2 bg-success/20 text-success border border-success/30 rounded text-xs flex items-center justify-center gap-2" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  <span className="material-symbols-outlined text-sm">check_circle</span> LIVE CAPTURE COMPLETE
                </div>
                <button type="button" onClick={retake} className="px-4 py-2 border border-border-subtle hover:border-on-surface-variant rounded text-xs text-on-surface transition-colors" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  RETAKE
                </button>
               </div>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1 min-h-[1rem]"></div>

        {/* Run Action */}
        <button 
          type="button"
          onClick={handleRunAudit}
          disabled={!selectedFile || isProcessing}
          className={`w-full h-12 shrink-0 ${isProcessing ? 'bg-primary-container/50 cursor-wait' : 'bg-primary-container hover:bg-primary-fixed-dim'} text-surface-base text-xl font-semibold flex items-center justify-center gap-2 transition-colors rounded`} 
          style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}
        >
          {isProcessing ? (
            <span className="material-symbols-outlined animate-spin" style={{ fontVariationSettings: "'FILL' 1" }}>sync</span>
          ) : (
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
          )}
          {isProcessing ? "ANALYZING..." : "RUN FORENSIC AUDIT"}
        </button>
      </section>

      {/* Right Column: Results (Bento Grid) */}
      <section className="flex flex-col gap-6 h-auto md:h-full overflow-visible md:overflow-y-auto pr-0 md:pr-2 pb-12 md:pb-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 #0A0A0A' }}>
        
        {/* Verdict Banner */}
        {(() => {
          let riskScore = 0;
          const evidence: { reason: string; points: number }[] = [];
          let faceMismatchRule = false;

          if (extractedData) {
            // ELA Tampering (calibrated 0-100 score)
            if (elaScore !== null) {
              if (elaScore >= 81) {
                riskScore += 25;
                evidence.push({ reason: "Very high ELA tampering signal (Digital forgery indicated)", points: 25 });
              } else if (elaScore >= 61) {
                riskScore += 15;
                evidence.push({ reason: "High ELA anomaly (Compression discrepancy detected)", points: 15 });
              } else if (elaScore >= 31) {
                riskScore += 10;
                evidence.push({ reason: "Moderate ELA anomaly (Pixels altered)", points: 10 });
              }
            }

            // Validation Checks
            if (validationData && validationData.checks) {
              validationData.checks.forEach((c: any) => {
                if (!c.valid) {
                  if (c.reason.toLowerCase().includes("expired")) {
                    riskScore += 20;
                    evidence.push({ reason: "Expired document (ID past validity date)", points: 20 });
                  } else if (c.reason.includes("Cross-check FAIL")) {
                    riskScore += 35;
                    evidence.push({ reason: "MRZ/visible-field inconsistency (Text doesn't match ID code)", points: 35 });
                  } else if (c.field === "aadhaar" && c.reason.includes("FAIL")) {
                    riskScore += 45;
                    evidence.push({ reason: "Aadhaar Verhoeff checksum FAIL (ID number mathematically invalid)", points: 45 });
                  } else if (c.reason.includes("FAIL") || c.reason.includes("Invalid")) {
                    riskScore += 35;
                    evidence.push({ reason: `Checksum/format failure (${c.field} - invalid format)`, points: 35 });
                  } else {
                    riskScore += 10;
                    evidence.push({ reason: "Minor document anomaly (Unusual structure)", points: 10 });
                  }
                }
              });
            }

            // Face Verification
            if (faceResult) {
              if (faceResult.match === false) {
                riskScore += 50;
                evidence.push({ reason: "Face mismatch (Live selfie does not match ID photo)", points: 50 });
                faceMismatchRule = true;
              } else if (faceResult.similarity_percent && faceResult.similarity_percent < 70) {
                riskScore += 15;
                evidence.push({ reason: "Face verification borderline (Match is uncertain)", points: 15 });
              }
            }

            // Watermark / Sample / Demo detection
            if (watermarkResult && watermarkResult.watermark_detected) {
              riskScore += 30;
              const texts = watermarkResult.findings.map((f: any) => f.matched_text).join(", ");
              evidence.push({ reason: `Sample/demo marking: ${texts} (Not a real ID)`, points: 30 });
            }

            // Redaction / Overlay detection
            if (redactionResult && redactionResult.redaction_detected) {
              const highConf = redactionResult.findings.filter((f: any) => f.confidence >= 0.7);
              const lowConf = redactionResult.findings.filter((f: any) => f.confidence < 0.7);
              if (highConf.length > 0) {
                riskScore += 20;
                evidence.push({ reason: `Obvious redaction/overlay (${highConf.length} region${highConf.length > 1 ? 's' : ''} covered up)`, points: 20 });
              }
              if (lowConf.length > 0) {
                const pts = Math.min(lowConf.length * 5, 10);
                riskScore += pts;
                evidence.push({ reason: `Uncertain visual anomaly (${lowConf.length} region${lowConf.length > 1 ? 's' : ''} possibly edited)`, points: pts });
              }
            }

            // OCR confidence / missing fields
            const expectedKeys = ["Name", "Dates Found", "Document Type"];
            let missingField = false;
            expectedKeys.forEach(k => {
              if (!extractedData[k] || extractedData[k] === "Unknown ID") missingField = true;
            });
            if (missingField) {
              riskScore += 5;
              evidence.push({ reason: "OCR confidence issue (Missing or blurry required fields)", points: 5 });
            }

            // Metadata: editing software detected
            if (metadataResult && metadataResult.suspicious) {
              riskScore += 15;
              const sw = metadataResult.flags?.[0] || "Editing software detected";
              evidence.push({ reason: `${sw} (Image was manipulated)`, points: 15 });
            }

            // Face mismatch floor: minimum Medium Risk
            if (faceMismatchRule && riskScore < 40) {
              riskScore = 40;
            }

            riskScore = Math.min(riskScore, 100);
          }

          let levelText = "STANDBY";
          let badgeColor = "bg-white/5 border-white/10 text-white/40";
          let dotColor = "bg-white/20";
          let strokeColor = "stroke-green-500";
          let scoreTextColor = "text-white/40";

          if (extractedData) {
            if (riskScore >= 70) {
              levelText = "High Risk — Further Verification Required";
              badgeColor = "bg-red-500/10 border-red-500/30 text-red-500";
              dotColor = "bg-red-500 animate-pulse";
              strokeColor = "stroke-red-500";
              scoreTextColor = "text-red-500";
            } else if (riskScore >= 40) {
              levelText = "Medium Risk — Review Recommended";
              badgeColor = "bg-yellow-500/10 border-yellow-500/30 text-yellow-500";
              dotColor = "bg-yellow-500 animate-pulse";
              strokeColor = "stroke-yellow-500";
              scoreTextColor = "text-yellow-500";
            } else {
              levelText = "Low Risk";
              badgeColor = "bg-green-500/10 border-green-500/30 text-green-500";
              dotColor = "bg-green-500";
              strokeColor = "stroke-green-500";
              scoreTextColor = "text-green-500";
            }
          }

          return (
            <div className="flex flex-col gap-2">
              <div className={`${bentoCardStyle} flex flex-col gap-4 py-4`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="relative w-12 h-12">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle className="stroke-surface-container" cx="18" cy="18" fill="none" r="16" strokeWidth="4"></circle>
                        <circle 
                          className={strokeColor} 
                          cx="18" cy="18" fill="none" r="16" 
                          strokeDasharray={extractedData ? `${riskScore} 100` : "0 100"} 
                          strokeDashoffset="0" strokeLinecap="round" strokeWidth="4"
                        ></circle>
                      </svg>
                      <div className={`absolute inset-0 flex items-center justify-center text-xs ${scoreTextColor}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                        {extractedData ? `${riskScore}` : "--"}
                      </div>
                    </div>
                    <div className="flex flex-col justify-center h-12">
                      <span className="text-xs text-on-surface-variant uppercase tracking-widest leading-none mb-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>RISK SCORE</span>
                      <span className="text-base text-on-surface leading-none" style={{ fontFamily: '"Inter", sans-serif' }}>
                        {extractedData ? (riskScore >= 70 ? "HIGH RISK" : riskScore >= 40 ? "MEDIUM RISK" : "LOW RISK") + ` — ${riskScore}/100` : "Awaiting Scan"}
                      </span>
                    </div>
                  </div>
                  
                  {/* Dynamic Badge */}
                  <div className={`px-4 py-1.5 ${badgeColor} border rounded-full flex items-center gap-2 max-w-[55%]`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`}></div>
                    <span className="text-xs font-bold tracking-wider truncate" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      {levelText}
                    </span>
                  </div>
                </div>

                {extractedData && (
                  <div className="mt-2 border-t border-border-subtle pt-3">
                    <span className="text-[11px] text-on-surface-variant mb-2 block font-mono uppercase tracking-widest">Detected evidence:</span>
                    <ul className="text-sm font-mono text-on-surface/80 space-y-1">
                      {evidence.length > 0 ? (
                        <>
                          {evidence.map((item, idx) => (
                            <li key={idx} className="flex justify-between max-w-md">
                              <span className="truncate pr-4">• {item.reason}</span>
                              <span className="text-error flex-shrink-0">+{item.points}</span>
                            </li>
                          ))}
                        </>
                      ) : (
                        <li className="flex justify-between max-w-md">
                          <span className="text-success">• No anomalies detected</span>
                          <span>+0</span>
                        </li>
                      )}
                      <li className="flex justify-between max-w-md border-t border-border-subtle pt-1 mt-2 font-bold text-on-surface">
                        <span>Total:</span>
                        <span>{riskScore}/100</span>
                      </li>
                    </ul>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-on-surface-variant/60 tracking-wider text-right font-mono pr-2">
                Preliminary automated screening — not a final authenticity determination.
              </div>
            </div>
          );
        })()}

        {/* Extracted Data */}
        <div className={`${bentoCardStyle} ${!extractedData ? 'opacity-30 pointer-events-none' : ''} transition-opacity`}>
          <div className="flex justify-between items-center mb-6 border-b border-border-strong pb-2">
            <h3 className="text-xs text-on-surface-variant uppercase tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Extracted Entities</h3>
            {extractedData && (
              <button 
                onClick={() => {
                  if (isEditingOCR) handleSaveAndRevalidate();
                  else {
                    setEditedFields({...extractedData});
                    setIsEditingOCR(true);
                  }
                }}
                className={`text-xs px-3 py-1 rounded transition-colors ${isEditingOCR ? 'bg-primary-main text-black hover:bg-primary-container' : 'border border-border-strong text-on-surface-variant hover:text-white'}`}
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {isEditingOCR ? 'SAVE & REVALIDATE' : 'EDIT'}
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {extractedData && Object.entries(extractedData).map(([key, val]) => (
              <div key={key} className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] text-on-surface-variant tracking-widest uppercase truncate" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{key.replace(/_/g, " ")}</span>
                {isEditingOCR && key !== 'Document Type' && key !== 'Name Candidates' ? (
                  <input
                    value={editedFields[key] !== undefined ? editedFields[key] : (val || '')}
                    onChange={(e) => setEditedFields({...editedFields, [key]: e.target.value})}
                    className="bg-surface-base border border-primary-main/50 text-sm text-on-surface p-1.5 rounded font-mono focus:outline-none focus:border-primary-main w-full"
                  />
                ) : (
                  <div className="flex items-start gap-2 min-w-0 w-full">
                    <span className="text-sm font-mono text-on-surface tracking-wider uppercase break-words whitespace-normal min-w-0 flex-1 pr-2">
                      {val as string || "----"}
                    </span>
                    {ocrCorrections[key] && !isEditingOCR && (
                      <span className="text-primary-main material-symbols-outlined text-[14px] shrink-0" title="Manually corrected">edit_note</span>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {/* Show MRZ separately if available */}
            {rawResponse?.mrz_raw && (
              <div className="flex flex-col gap-1 col-span-2 mt-2 pt-4 border-t border-border-strong">
                <span className="text-[11px] text-on-surface-variant tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>MRZ LINE / RAW</span>
                <span className="text-[10px] font-mono text-primary-container tracking-wider break-all">{rawResponse.mrz_raw}</span>
              </div>
            )}
          </div>
          
          {/* Audit Trail */}
          {Object.keys(ocrCorrections).length > 0 && !isEditingOCR && (
            <div className="mt-6 pt-4 border-t border-border-strong animate-in fade-in">
              <h3 className="text-xs text-on-surface-variant mb-4 uppercase tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Audit Trail (Manual Corrections)</h3>
              <div className="flex flex-col gap-3">
                {Object.entries(ocrCorrections).map(([key, change]: [string, any]) => (
                  <div key={key} className="bg-surface-base p-3 rounded border border-border-strong text-xs font-mono">
                    <div className="text-primary-main mb-2 font-bold uppercase">{key.replace(/_/g, " ")}</div>
                    <div className="grid grid-cols-[80px_1fr] gap-1">
                      <span className="text-on-surface-variant">OCR:</span>
                      <span className="text-on-surface-variant">{change.original || "----"}</span>
                      <span className="text-white">Verified:</span>
                      <span className="text-white">{change.corrected || "----"}</span>
                      <span className="text-on-surface-variant">Status:</span>
                      <span className="text-success">Manually corrected</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Verification Checks (Module 2) */}
        {validationData && (
          <div className={`${bentoCardStyle} flex flex-col gap-4 animate-in fade-in duration-500`}>
             <h3 className="text-xs text-on-surface-variant border-b border-border-strong pb-2 uppercase tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Mathematical Data Validation</h3>
             <div className="flex flex-col gap-3">
               {validationData.checks.map((check: any, i: number) => (
                 <div key={i} className={`flex flex-col md:flex-row justify-between md:items-center bg-surface-base p-3 rounded border ${check.valid ? 'border-success/30 bg-success/5' : 'border-error/30 bg-error/5'}`}>
                   <div className="flex items-center gap-3 mb-2 md:mb-0">
                     <span className={`material-symbols-outlined text-[20px] ${check.valid ? 'text-success' : 'text-error'}`}>
                       {check.valid ? 'verified_user' : 'gpp_bad'}
                     </span>
                     <span className="text-sm font-mono text-on-surface uppercase tracking-wider">{check.field}</span>
                   </div>
                   <span className={`text-[11px] uppercase tracking-widest ${check.valid ? 'text-success' : 'text-error'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                     {check.reason}
                   </span>
                 </div>
               ))}
               {validationData.checks.length === 0 && (
                 <div className="flex items-center gap-2 text-on-surface-variant p-4 bg-surface-base rounded border border-border-subtle">
                   <span className="material-symbols-outlined text-[18px]">info</span>
                   <span className="text-xs font-mono">No logical validation available for this specific data structure.</span>
                 </div>
               )}
             </div>
          </div>
        )}

        {/* Face Verification Result (Module 4) */}
        {faceResult && (
          <div className={`${bentoCardStyle} flex flex-col gap-4 animate-in fade-in duration-500`}>
             <h3 className="text-xs text-on-surface-variant border-b border-border-strong pb-2 uppercase tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Live Face Verification</h3>
             <div className={`flex flex-col md:flex-row justify-between md:items-center bg-surface-base p-4 rounded border ${faceResult.match ? 'border-success/30 bg-success/5' : 'border-error/30 bg-error/5'}`}>
               <div className="flex items-center gap-4">
                 <span className={`material-symbols-outlined text-[32px] ${faceResult.match ? 'text-success' : 'text-error'}`}>
                   {faceResult.match ? 'face' : 'person_off'}
                 </span>
                 <div className="flex flex-col">
                   <span className="text-sm font-mono text-on-surface uppercase tracking-wider">{faceResult.verdict}</span>
                   <span className="text-[10px] text-on-surface-variant uppercase tracking-widest mt-1" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                     Similarity: {faceResult.similarity_percent}% | Alg: VGG-Face
                   </span>
                 </div>
               </div>
               
               <div className={`mt-3 md:mt-0 px-4 py-2 rounded ${faceResult.match ? 'bg-success/20 text-success' : 'bg-error/20 text-error'} font-bold tracking-widest text-[11px] self-start md:self-auto`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                 {faceResult.match ? 'PLAUSIBLE MATCH' : 'MANUAL VERIFICATION REQUIRED'}
               </div>
             </div>
          </div>
        )}

        {/* Detailed Forensic Data (Collapsible) */}
        <details className={`${bentoCardStyle} [&_summary::-webkit-details-marker]:hidden`}>
          <summary className="cursor-pointer text-xs text-on-surface-variant uppercase tracking-widest flex justify-between items-center outline-none" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            <span>Detailed Forensic Data</span>
            <span className="material-symbols-outlined text-[16px]">expand_more</span>
          </summary>
          <div className="mt-4 border-t border-border-strong pt-4">
            <pre className="text-[10px] text-on-surface font-mono overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
              {rawResponse ? JSON.stringify(rawResponse, null, 2) : "{\n  // Awaiting scan...\n}"}
            </pre>
          </div>
        </details>

        {/* Anomaly Detection Results (Watermark + Redaction) */}
        {(watermarkResult || redactionResult) && (
          <div className={`${bentoCardStyle} flex flex-col gap-4 animate-in fade-in duration-500`}>
            <h3 className="text-xs text-on-surface-variant border-b border-border-strong pb-2 uppercase tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Anomaly Detection</h3>
            
            {watermarkResult && watermarkResult.watermark_detected && (
              <div className="bg-error/5 border border-error/30 rounded p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-error text-[20px]">report</span>
                  <span className="text-sm font-mono text-error uppercase tracking-wider font-bold">Sample/Demo Marking Detected</span>
                </div>
                {watermarkResult.findings.map((f: any, i: number) => (
                  <div key={i} className="text-xs font-mono text-on-surface/70 ml-7 mb-1">
                    <span className="text-error">&quot;{f.matched_text}&quot;</span> — confidence: {(f.confidence * 100).toFixed(0)}%
                  </div>
                ))}
              </div>
            )}
            {watermarkResult && !watermarkResult.watermark_detected && (
              <div className="bg-surface-base border border-border-subtle rounded p-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-success text-[20px]">check_circle</span>
                <span className="text-xs font-mono text-on-surface/70">No SAMPLE / SPECIMEN / DEMO / VOID markings detected.</span>
              </div>
            )}

            {redactionResult && redactionResult.redaction_detected && (
              <div className="bg-error/5 border border-error/30 rounded p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-error text-[20px]">visibility_off</span>
                  <span className="text-sm font-mono text-error uppercase tracking-wider font-bold">Possible Redaction / Overlay</span>
                </div>
                {redactionResult.findings.map((f: any, i: number) => (
                  <div key={i} className="text-xs font-mono text-on-surface/70 ml-7 mb-1 flex justify-between max-w-lg">
                    <span>{f.type === 'possible_redaction' ? '▪ Redaction bar' : '▪ Overlay patch'} — {f.reason.split('—')[1]?.trim() || f.reason}</span>
                    <span className="text-on-surface-variant ml-2 flex-shrink-0">{(f.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}
            {redactionResult && !redactionResult.redaction_detected && (
              <div className="bg-surface-base border border-border-subtle rounded p-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-success text-[20px]">check_circle</span>
                <span className="text-xs font-mono text-on-surface/70">No obvious redactions or overlays detected.</span>
              </div>
            )}

            {metadataResult && metadataResult.suspicious && (
              <div className="bg-error/5 border border-error/30 rounded p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-error text-[20px]">data_alert</span>
                  <span className="text-sm font-mono text-error uppercase tracking-wider font-bold">Metadata / EXIF Anomaly</span>
                </div>
                {metadataResult.flags.map((flag: string, i: number) => (
                  <div key={i} className="text-xs font-mono text-on-surface/70 ml-7 mb-1 flex justify-between max-w-lg">
                    <span>▪ {flag}</span>
                  </div>
                ))}
              </div>
            )}
            {metadataResult && !metadataResult.suspicious && (
              <div className="bg-surface-base border border-border-subtle rounded p-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-success text-[20px]">check_circle</span>
                <span className="text-xs font-mono text-on-surface/70">No suspicious software EXIF metadata detected.</span>
              </div>
            )}
          </div>
        )}

        {/* Dual Panels: ELA */}
        <div className="flex flex-col gap-6 flex-1">
          {/* ELA Heatmap */}
          <div className={`${bentoCardStyle} flex-1 flex flex-col gap-3`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border-strong pb-3 gap-3">
              <div>
                <h3 className="text-xs text-on-surface-variant uppercase tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  ELA TAMPERING RISK SCORE
                </h3>
                {elaScore !== null ? (
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-xl md:text-2xl font-bold text-on-surface" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      {elaScore} / 100 <span className="text-xs font-normal text-on-surface-variant font-mono">Tampering Risk</span>
                    </span>
                    {elaError && (
                      <span className="text-[10px] text-on-surface-variant font-mono">
                        (Raw metric: {elaError})
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-on-surface-variant mt-1 block" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Tampering Risk: -- / 100</span>
                )}
              </div>

              {elaScore !== null && (() => {
                let categoryText = "LOW RISK — CLEAN DOCUMENT";
                let categoryColor = "bg-green-500/10 border-green-500/30 text-green-500";
                if (elaScore >= 81) {
                  categoryText = "VERY HIGH RISK — DIGITAL FORGERY";
                  categoryColor = "bg-red-500/20 border-red-500/40 text-red-500";
                } else if (elaScore >= 61) {
                  categoryText = "HIGH RISK — TAMPERING LIKELY";
                  categoryColor = "bg-red-500/10 border-red-500/30 text-red-500";
                } else if (elaScore >= 31) {
                  categoryText = "MODERATE RISK — REVIEW RECOMMENDED";
                  categoryColor = "bg-yellow-500/10 border-yellow-500/30 text-yellow-500";
                }
                return (
                  <div className={`px-3 py-1.5 rounded border text-[11px] font-bold tracking-wider ${categoryColor}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {categoryText}
                  </div>
                );
              })()}
            </div>

            {/* Score scale guide */}
            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant/80 font-mono bg-surface-base px-3 py-1.5 rounded border border-border-subtle">
              <span className="material-symbols-outlined text-[16px] text-primary-main">info</span>
              <span>
                <strong>Scale Guide:</strong> 0–30 = Low Risk (Clean/Authentic) | 31–60 = Moderate Risk | 61–100 = High Risk (Tampered)
              </span>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Lower scores (e.g. 0–30) indicate clean pixel compression with low tampering risk. Higher scores indicate JPEG compression discrepancies.
            </p>
            
            <div className="w-full h-[250px] bg-[#050505] rounded overflow-hidden border border-border-strong group flex flex-col items-center justify-center relative p-2">
               {elaImage ? (
                 <img src={elaImage} alt="ELA Heatmap" className="w-full h-full object-contain" />
               ) : (
                 <div className="flex flex-col items-center justify-center text-on-surface-variant opacity-50">
                   <span className="material-symbols-outlined text-4xl mb-2">image_search</span>
                   <span style={{ fontFamily: '"JetBrains Mono", monospace' }}>Scanning Pixels...</span>
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex justify-end pt-2 shrink-0">
          <button className="px-6 py-2 border border-border-strong bg-surface-elevated text-on-surface hover:text-primary-main hover:border-primary-container transition-colors duration-150 rounded text-xs flex items-center gap-2" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
            Export PDF
          </button>
        </div>

      </section>
    </div>
  );
}
