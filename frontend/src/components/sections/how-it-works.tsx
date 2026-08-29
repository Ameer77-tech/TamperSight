import { UploadCloud, BrainCircuit, ShieldCheck, PlayCircle } from "lucide-react";

export function HowItWorks() {
  return (
    <section id="validation" className="container px-6 mt-40 z-10 w-full max-w-6xl mx-auto relative pb-32 scroll-mt-32">
      
      {/* Section Header */}
      <div className="flex flex-col items-center text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b9a89]/10 border border-[#1b9a89]/20 text-[#30cfb9] text-[11px] font-bold tracking-widest uppercase mb-4">
          <PlayCircle className="w-3 h-3" />
          <span>How It Works</span>
        </div>
        <h3 className="text-3xl md:text-5xl font-bold text-white tracking-tight max-w-2xl">
          Automated identity screening,<br /> delivered in seconds.
        </h3>
      </div>

      {/* Grid of Steps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Step 1 */}
        <div className="bg-[#0a0e14] border border-white/5 rounded-3xl p-8 flex flex-col justify-between h-[320px] group hover:border-white/10 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8bf5e5] to-[#30cfb9] flex items-center justify-center shadow-[0_0_20px_rgba(48,207,185,0.3)]">
            <UploadCloud className="w-6 h-6 text-[#060b11]" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white mb-2">1. Upload & Ingest</h4>
            <p className="text-white/50 text-[14px] leading-relaxed">
              Securely upload identity documents or capture live via webcam. Instant support for passports, Aadhaar, PAN, and MRZ formats.
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-[#0a0e14] border border-white/5 rounded-3xl p-8 flex flex-col justify-between h-[320px] group hover:border-white/10 transition-colors relative overflow-hidden">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a7af8] to-[#1e3a8a] flex items-center justify-center shadow-[0_0_20px_rgba(26,122,248,0.3)] relative z-10">
            <BrainCircuit className="w-6 h-6 text-white" />
          </div>
          <div className="relative z-10">
            <h4 className="text-lg font-bold text-white mb-2">2. Deep AI Forensics</h4>
            <p className="text-white/50 text-[14px] leading-relaxed">
              Our edge neural engines execute multi-layered analysis: cryptographic checksums, pixel-level ELA, and 1:1 facial biometric matching.
            </p>
          </div>
          {/* Subtle glow for the middle step */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-[#1a7af8]/10 blur-[60px] rounded-full pointer-events-none z-0"></div>
        </div>

        {/* Step 3 */}
        <div className="bg-[#0a0e14] border border-white/5 rounded-3xl p-8 flex flex-col justify-between h-[320px] group hover:border-white/10 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#f59e0b] to-[#d97706] flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white mb-2">3. Instant Validation</h4>
            <p className="text-white/50 text-[14px] leading-relaxed">
              Receive a definitive authenticity score alongside a complete cryptographic forensic PDF report in under 2 seconds.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
