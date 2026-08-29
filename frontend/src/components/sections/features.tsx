import { ScanFace, FileSearch, ShieldCheck, Fingerprint, Layers } from "lucide-react";

export function Features() {
  return (
    <section id="modules" className="container px-6 mt-40 z-10 w-full max-w-6xl mx-auto relative scroll-mt-32">
      
      <div className="text-center mb-16">
        <h2 className="text-sm font-bold text-[#30cfb9] tracking-widest uppercase mb-3">Forensic Modules</h2>
        <h3 className="text-3xl md:text-5xl font-bold text-white tracking-tight">
          Comprehensive Analysis.<br /> Zero Compromise.
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: OCR & Parsing (Wide) */}
        <div className="md:col-span-2 bg-[#0a0e14] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
          
          <div className="relative z-10 h-full flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-[#1b9a89]/10 flex items-center justify-center border border-[#1b9a89]/20 mb-6">
              <FileSearch className="w-6 h-6 text-[#30cfb9]" />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Document OCR & MRZ Parsing</h4>
            <p className="text-white/50 text-[15px] leading-relaxed max-w-md">
              Extract every field instantly. From standard passports to regional Aadhaar/PAN cards, our dual-engine OCR pipeline captures and structures data with 99.8% accuracy.
            </p>
            
            {/* Abstract Decorative Element */}
            <div className="absolute right-0 bottom-0 opacity-40 group-hover:opacity-80 transition-opacity pointer-events-none">
              <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="50" y="50" width="100" height="100" rx="12" stroke="#30cfb9" strokeWidth="2" strokeDasharray="4 4" className="animate-[spin_20s_linear_infinite]" />
                <rect x="70" y="70" width="60" height="60" rx="8" stroke="#1b9a89" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Cryptographic Check (Square) */}
        <div className="md:col-span-1 bg-[#0a0e14] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-[#1a7af8]/10 flex items-center justify-center border border-[#1a7af8]/20 mb-6">
              <ShieldCheck className="w-6 h-6 text-[#1a7af8]" />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Cryptographic Validation</h4>
            <p className="text-white/50 text-[15px] leading-relaxed">
              Real-time Verhoeff checksums and algorithmic validations ensure ID numbers are mathematically authentic, rejecting synthetic fakes instantly.
            </p>
          </div>
          {/* Decorative Glow */}
          <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-[#1a7af8]/20 blur-[80px] rounded-full group-hover:bg-[#1a7af8]/30 transition-colors"></div>
        </div>

        {/* Card 3: Pixel Tampering (Square) */}
        <div className="md:col-span-1 bg-[#0a0e14] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-xl bg-[#f59e0b]/10 flex items-center justify-center border border-[#f59e0b]/20 mb-6">
              <Layers className="w-6 h-6 text-[#f59e0b]" />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">Error Level Analysis</h4>
            <p className="text-white/50 text-[15px] leading-relaxed">
              Detect invisible pixel modifications and digital splices using our deep ELA heatmap engine, revealing tampered zones visually.
            </p>
          </div>
          <div className="absolute -bottom-10 -right-10 opacity-30 group-hover:opacity-60 transition-opacity">
            <svg width="150" height="150" viewBox="0 0 150 150" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="75" cy="75" r="50" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 4" />
              <circle cx="75" cy="75" r="30" stroke="#f59e0b" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Card 4: Biometric Matching (Wide) */}
        <div className="md:col-span-2 bg-[#0a0e14] border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-white/10 transition-colors">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-[#30cfb9]/5 to-transparent z-0"></div>
          
          <div className="relative z-10 h-full flex flex-col justify-center">
            <div className="w-12 h-12 rounded-xl bg-[#30cfb9]/10 flex items-center justify-center border border-[#30cfb9]/20 mb-6">
              <ScanFace className="w-6 h-6 text-[#30cfb9]" />
            </div>
            <h4 className="text-xl font-bold text-white mb-3">1:1 Biometric Match</h4>
            <p className="text-white/50 text-[15px] leading-relaxed max-w-md">
              Extract the facial photo from any document and map it against a live webcam capture. Edge-first AI detects spoofing and confirms physical presence with zero latency.
            </p>
            
            <div className="absolute right-10 bottom-10 opacity-30 group-hover:opacity-70 transition-opacity pointer-events-none">
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#30cfb9" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 19c-2.3 0-4.3-1.1-5.6-2.8"></path>
              </svg>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
