import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section id="home" className="flex-1 flex flex-col items-center justify-start pt-40 pb-16 relative w-full overflow-hidden min-h-screen">
      
      {/* Background Grid Dots */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] bg-[size:24px_24px] opacity-70 -z-20"></div>

      <div className="container px-6 flex flex-col items-center text-center z-10 w-full relative mt-16">
        
        {/* The Dome Effect (Exact Replication) */}
        {/* Positioned exactly behind the logo */}
        <div className="absolute top-[-30px] left-1/2 -translate-x-1/2 w-[1400px] h-[700px] rounded-t-[700px] 
          bg-gradient-to-b from-[#30cfb9]/40 via-[#060b11] to-[#060b11]
          border-t-[3px] border-[#8bf5e5]/90 
          shadow-[0_-40px_120px_rgba(48,207,185,0.4),0_-20px_80px_rgba(139,245,229,0.3)_inset] 
          -z-10 blur-[2px] opacity-90
          pointer-events-none"
        ></div>

        {/* Centered Logo Inside Dome */}
        <div className="flex items-center gap-3 mb-10">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
            <path d="M12 2L22 7L12 12L2 7L12 2Z" fill="#8bf5e5"/>
            <path d="M2 7V17L12 22V12L2 7Z" fill="#30cfb9"/>
            <path d="M22 7V17L12 22V12L22 7Z" fill="#1b9a89"/>
          </svg>
          <span className="text-4xl font-bold tracking-tight text-white drop-shadow-md">tampersight</span>
        </div>

        {/* Headline */}
        <h1 className="text-6xl md:text-[88px] font-bold tracking-tight max-w-5xl text-white leading-[1.05] drop-shadow-md">
          One platform for<br /> border security
        </h1>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-14">
          <Button size="lg" className="h-[52px] px-12 text-[17px] bg-gradient-to-b from-white to-[#e2e8f0] hover:from-white hover:to-white text-[#0f172a] font-bold rounded-xl shadow-md border border-white/50">
            Upload Document
          </Button>
          <Button size="lg" className="h-[52px] px-12 text-[17px] bg-[#1a7af8] hover:bg-[#1a7af8]/90 text-white font-bold rounded-xl shadow-md border-none">
            Start Screening
          </Button>
        </div>
      </div>
    </section>
  );
}


