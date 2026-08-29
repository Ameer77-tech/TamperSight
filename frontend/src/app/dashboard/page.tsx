export default function DashboardPage() {
  const bentoCardStyle = "bg-surface-card border border-border-subtle p-6 rounded-sm hover:border-primary-container/30 transition-colors duration-150";

  return (
    <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-6 overflow-hidden h-full max-w-[1600px] mx-auto w-full font-sans">
      
      {/* Left Column: Input */}
      <section className="flex flex-col gap-6 h-full">
        
        {/* Dropzone */}
        <div className="relative w-full aspect-video border-2 border-dashed border-border-strong rounded bg-surface-elevated flex flex-col items-center justify-center gap-4 transition-colors duration-200 cursor-pointer hover:border-outline group">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant group-hover:text-primary-container transition-colors">upload_file</span>
          <p className="text-base text-on-surface-variant text-center px-4" style={{ fontFamily: '"Inter", sans-serif' }}>Drag & drop Passport/Aadhaar</p>
        </div>

        {/* Webcam Capture */}
        <div className={`${bentoCardStyle} flex flex-col items-center justify-center gap-4`}>
          <span className="material-symbols-outlined text-3xl text-on-surface-variant">photo_camera</span>
          <p className="text-xs text-on-surface-variant text-center uppercase tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>LIVE VERIFICATION REQUIRED</p>
          <button className="px-6 py-2 border border-border-subtle rounded text-primary-main hover:border-primary-container hover:text-primary-container transition-colors duration-150 text-xs flex items-center gap-2" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
            <span className="material-symbols-outlined text-sm">camera</span> Capture Live Face
          </button>
        </div>

        <div className="flex-1"></div>

        {/* Run Action */}
        <button className="w-full h-12 bg-primary-container text-surface-base text-2xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-fixed-dim transition-colors rounded" style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
          RUN FORENSIC AUDIT
        </button>
      </section>

      {/* Right Column: Results (Bento Grid) */}
      <section className="flex flex-col gap-6 h-full overflow-y-auto pr-2 pb-12 md:pb-0" style={{ scrollbarWidth: 'thin', scrollbarColor: '#333 #0A0A0A' }}>
        
        {/* Verdict Banner */}
        <div className={`${bentoCardStyle} flex justify-between items-center py-4`}>
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle className="stroke-surface-container" cx="18" cy="18" fill="none" r="16" strokeWidth="4"></circle>
                <circle className="stroke-success" cx="18" cy="18" fill="none" r="16" strokeDasharray="0 100" strokeDashoffset="0" strokeLinecap="round" strokeWidth="4"></circle>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs text-success" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                --
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-on-surface-variant uppercase tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Confidence Score</span>
              <span className="text-base text-on-surface" style={{ fontFamily: '"Inter", sans-serif' }}>
                Awaiting Scan
              </span>
            </div>
          </div>
          <div className="px-4 py-1.5 bg-white/5 border-white/10 border rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white/20"></div>
            <span className="text-xs text-white/40 font-bold tracking-wider" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              STANDBY
            </span>
          </div>
        </div>

        {/* Extracted Data */}
        <div className={`${bentoCardStyle} opacity-30 pointer-events-none transition-opacity`}>
          <h3 className="text-xs text-on-surface-variant mb-6 border-b border-border-strong pb-2 uppercase tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Extracted Entities</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-on-surface-variant tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>ID NUMBER</span>
              <div className="flex items-center gap-3">
                <span className="text-lg font-mono text-on-surface tracking-wider">----</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-on-surface-variant tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>NAME</span>
              <span className="text-lg font-mono text-on-surface tracking-wider uppercase truncate pr-2">----</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-on-surface-variant tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>DOB</span>
              <span className="text-lg font-mono text-on-surface tracking-wider">----</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-on-surface-variant tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>MRZ CHECKSUM</span>
              <span className="text-lg font-mono text-primary-container tracking-wider">----</span>
            </div>
          </div>
        </div>

        {/* Visual Forensics (Before/After) */}
        <div className={`${bentoCardStyle} flex-1 flex flex-col min-h-[300px]`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs text-on-surface-variant uppercase tracking-widest" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Visual Forensics</h3>
            <div className="flex items-center gap-4">
              <span className="text-[11px] text-status-code" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Layer: ELA (Error Level Analysis)</span>
              <button className="text-on-surface-variant hover:text-primary-main transition-colors" title="Fullscreen">
                <span className="material-symbols-outlined text-[18px]">fullscreen</span>
              </button>
            </div>
          </div>
          
          <div className="w-full flex-1 h-full bg-surface-elevated rounded overflow-hidden border border-border-subtle group flex flex-col items-center justify-center p-2 relative">
             <div className="flex flex-col items-center justify-center text-border-strong">
               <span className="material-symbols-outlined text-6xl">image</span>
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
