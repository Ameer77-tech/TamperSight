import { Play, ArrowRight, MonitorPlay } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SystemPreview() {
  return (
    <section id="demo" className="container px-6 mt-32 mb-40 z-10 w-full max-w-5xl mx-auto relative scroll-mt-32">
      <div className="bg-[#0a0e14] border border-white/5 rounded-[40px] p-8 md:p-12 flex flex-col md:flex-row items-center gap-12 group hover:border-white/10 transition-colors">
        
        {/* Left Side: Text Content */}
        <div className="flex-1 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1a7af8]/10 border border-[#1a7af8]/20 text-[#1a7af8] text-[11px] font-bold tracking-widest uppercase">
            <MonitorPlay className="w-3 h-3" />
            <span>System Preview</span>
          </div>
          
          <h3 className="text-2xl md:text-3xl font-medium text-white leading-snug">
            &quot;Watch how TamperSight identifies a highly sophisticated synthetic ID and forged MRZ in under 2 seconds.&quot;
          </h3>

          <Button variant="link" className="p-0 h-auto text-white hover:text-[#30cfb9] font-semibold text-[15px] group/btn">
            Watch the demonstration 
            <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Right Side: Video Placeholder */}
        <div className="flex-1 w-full relative">
          <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-[#060b11] border border-white/5 relative group/video cursor-pointer">
            {/* Abstract Video Thumbnail Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#1b9a89_0%,transparent_70%)] opacity-20 group-hover/video:opacity-40 transition-opacity duration-700"></div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:16px_16px]"></div>
            
            {/* Play Button */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 group-hover/video:scale-110 group-hover/video:bg-white/20 transition-all">
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </div>

            {/* Fake Video UI Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white/50 text-xs font-medium">
              <span>TamperSight_Demo.mp4</span>
              <span>01:24</span>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
