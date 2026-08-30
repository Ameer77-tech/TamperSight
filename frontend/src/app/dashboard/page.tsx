"use client";

import React, { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";

export default function DashboardPage() {
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
  const [showWebcam, setShowWebcam] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [faceResult, setFaceResult] = useState<any>(null);
  const [docType, setDocType] = useState<string>("Auto");
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
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const runValidation = async (fields: any, mrz_raw: string | null) => {
    const payload = {
      aadhaar_number: fields["National ID Number"] || null,
      pan_number: fields["PAN Number"] || null,
      passport_number: fields["Passport Number"] || null,
      mrz_line1: mrz_raw && mrz_raw.includes("\n") ? mrz_raw.split("\n")[0] : null,
      mrz_line2: mrz_raw && mrz_raw.includes("\n") ? mrz_raw.split("\n")[1] : null,
      date_of_birth: fields["Date of birth"] || null,
      date_of_expiry: fields["Date of expiry"] || null
    };

    try {
      const valRes = await fetch("http://localhost:8000/api/validate/check", {
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
      const ocrPromise = fetch("http://localhost:8000/api/ocr/extract", {
        method: "POST",
        body: formData,
      });

      // 2. Call the Tampering (ELA) Backend simultaneously
      const elaPromise = fetch("http://localhost:8000/api/tamper/ela", {
        method: "POST",
        body: formData,
      }).then(async (res) => {
        if (res.ok) {
          const meanErr = res.headers.get("X-Mean-Error") || "0";
          setElaError(meanErr);
          const blob = await res.blob();
          setElaImage(URL.createObjectURL(blob));
        }
      }).catch(err => console.error("ELA Error:", err));

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
          var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)![1],
              bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
          while(n--){
              u8arr[n] = bstr.charCodeAt(n);
          }
          return new File([u8arr], filename, {type:mime});
        };

        const faceFormData = new FormData();
        faceFormData.append("document", selectedFile);
        faceFormData.append("selfie", dataURLtoFile(capturedSelfie, "selfie.jpg"));
        
        fetch("http://localhost:8000/api/face/verify", {
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
          const elaTampered = elaError && parseFloat(elaError) > 3.5;
          const validationFailed = validationData && validationData.checks?.some((c: any) => !c.valid);
          const faceMismatch = faceResult && faceResult.match === false;
          const isRejected = elaTampered || validationFailed || faceMismatch;
          
          // Risk Score: High is bad (100 is max risk), Low is good (0 is min risk)
          let riskScore = 0;
          if (extractedData) {
            if (isRejected) {
              riskScore = 75 + (faceMismatch ? 15 : 0) + (elaTampered ? 10 : 0);
              riskScore = Math.min(riskScore, 100);
            } else {
              riskScore = 15; // baseline small risk
            }
          }

          const reasons: string[] = [];
          if (elaTampered) reasons.push("TAMPERED");
          if (validationFailed) reasons.push("INVALID DATA");
          if (faceMismatch) reasons.push("FACE MISMATCH");
          const rejectionReason = reasons.join(" + ");

          return (
            <div className={`${bentoCardStyle} flex justify-between items-center py-4`}>
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle className="stroke-surface-container" cx="18" cy="18" fill="none" r="16" strokeWidth="4"></circle>
                    <circle 
                      className={isRejected ? "stroke-error" : "stroke-success"} 
                      cx="18" cy="18" fill="none" r="16" 
                      strokeDasharray={extractedData ? `${riskScore} 100` : "0 100"} 
                      strokeDashoffset="0" strokeLinecap="round" strokeWidth="4"
                    ></circle>
                  </svg>
                  <div className={`absolute inset-0 flex items-center justify-center text-xs ${isRejected ? "text-error" : "text-success"}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {extractedData ? `${riskScore}` : "--"}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-on-surface-variant uppercase tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>RISK SCORE</span>
                  <span className="text-base text-on-surface" style={{ fontFamily: '"Inter", sans-serif' }}>
                    {extractedData ? "Scan Complete" : "Awaiting Scan"}
                  </span>
                </div>
              </div>
              
              {/* Dynamic Badge */}
              {isRejected ? (
                <div className="px-4 py-1.5 bg-error/10 border-error/30 border rounded-full flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-error animate-pulse"></div>
                  <span className="text-xs text-error font-bold tracking-wider" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    REJECTED ({rejectionReason})
                  </span>
                </div>
              ) : (
                <div className={`px-4 py-1.5 ${extractedData ? 'bg-success/10 border-success/30' : 'bg-white/5 border-white/10'} border rounded-full flex items-center gap-2`}>
                  <div className={`w-2 h-2 rounded-full ${extractedData ? 'bg-success animate-pulse' : 'bg-white/20'}`}></div>
                  <span className={`text-xs ${extractedData ? 'text-success' : 'text-white/40'} font-bold tracking-wider`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                    {extractedData ? "VERIFIED" : "STANDBY"}
                  </span>
                </div>
              )}
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
              <div key={key} className="flex flex-col gap-1">
                <span className="text-[11px] text-on-surface-variant tracking-widest uppercase" style={{ fontFamily: '"JetBrains Mono", monospace' }}>{key.replace(/_/g, " ")}</span>
                {isEditingOCR && key !== 'Document Type' && key !== 'Name Candidates' ? (
                  <input
                    value={editedFields[key] !== undefined ? editedFields[key] : (val || '')}
                    onChange={(e) => setEditedFields({...editedFields, [key]: e.target.value})}
                    className="bg-surface-base border border-primary-main/50 text-sm text-on-surface p-1.5 rounded font-mono focus:outline-none focus:border-primary-main"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-on-surface tracking-wider uppercase truncate pr-2">
                      {val as string || "----"}
                    </span>
                    {ocrCorrections[key] && !isEditingOCR && (
                      <span className="text-primary-main material-symbols-outlined text-[14px]" title="Manually corrected">edit_note</span>
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
                 {faceResult.match ? 'OWNER VERIFIED' : 'MANUAL VERIFICATION REQUIRED'}
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

        {/* Dual Panels: ELA */}
        <div className="flex flex-col gap-6 flex-1">
          {/* ELA Heatmap */}
          <div className={`${bentoCardStyle} flex-1 flex flex-col`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs text-on-surface-variant uppercase tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Tampering (ELA Heatmap)</h3>
              {elaError && (
                <span className={`text-[11px] font-bold ${parseFloat(elaError) > 3.5 ? 'text-error' : 'text-success'}`} style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  Score: {elaError}
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mb-4">
              <strong className="text-on-surface">How to read this:</strong> A pure blue/black image means the document is completely authentic. Any <span className="text-error">bright red, yellow, or white spots</span> indicate pixels that were digitally altered, photoshopped, or pasted in.
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
