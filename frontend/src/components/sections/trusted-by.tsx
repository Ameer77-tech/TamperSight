import { Building2, Landmark, ShieldHalf, Anchor, Plane } from "lucide-react";

export function TrustedBy() {
  return (
    <section className="w-full py-10 mt-10 border-b border-white/5 relative z-10">
      <div className="container mx-auto px-6 text-center">
        <p className="text-[13px] font-medium text-white/40 mb-8 uppercase tracking-[0.2em]">
          Deployed at critical checkpoints globally
        </p>
        
        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
          
          <div className="flex items-center gap-2 group">
            <Landmark className="w-6 h-6 text-white group-hover:text-[#30cfb9] transition-colors" />
            <span className="text-lg font-bold text-white group-hover:text-[#30cfb9] transition-colors">GovIdentity</span>
          </div>

          <div className="flex items-center gap-2 group">
            <Plane className="w-6 h-6 text-white group-hover:text-[#30cfb9] transition-colors" />
            <span className="text-lg font-bold text-white group-hover:text-[#30cfb9] transition-colors">AeroBorder</span>
          </div>

          <div className="flex items-center gap-2 group">
            <Building2 className="w-6 h-6 text-white group-hover:text-[#30cfb9] transition-colors" />
            <span className="text-lg font-bold text-white group-hover:text-[#30cfb9] transition-colors">FinSecure</span>
          </div>

          <div className="flex items-center gap-2 group">
            <ShieldHalf className="w-6 h-6 text-white group-hover:text-[#30cfb9] transition-colors" />
            <span className="text-lg font-bold text-white group-hover:text-[#30cfb9] transition-colors">DefendID</span>
          </div>

          <div className="flex items-center gap-2 group">
            <Anchor className="w-6 h-6 text-white group-hover:text-[#30cfb9] transition-colors" />
            <span className="text-lg font-bold text-white group-hover:text-[#30cfb9] transition-colors">PortAuthority</span>
          </div>

        </div>
      </div>
    </section>
  );
}
