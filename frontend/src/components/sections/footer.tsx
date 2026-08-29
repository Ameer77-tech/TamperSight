import Link from "next/link";
import { Globe, Mail } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/5 bg-[#060b11] py-12 relative z-10">
      <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Brand */}
        <div className="flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L22 7L12 12L2 7L12 2Z" fill="#8bf5e5"/>
            <path d="M2 7V17L12 22V12L2 7Z" fill="#30cfb9"/>
            <path d="M22 7V17L12 22V12L22 7Z" fill="#1b9a89"/>
          </svg>
          <span className="text-base font-bold tracking-tight text-white/90">tampersight</span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-white/50">
          <Link href="#dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="#modules" className="hover:text-white transition-colors">Modules</Link>
          <Link href="#api" className="hover:text-white transition-colors">API Docs</Link>
          <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
        </div>

        {/* Social / Hackathon Links */}
        <div className="flex items-center gap-4">
          <a href="#" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <Mail className="w-4 h-4" />
          </a>
          <a href="#" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors">
            <Globe className="w-4 h-4" />
          </a>
        </div>

      </div>
      
      <div className="container mx-auto px-6 max-w-6xl mt-8 text-center md:text-left">
        <p className="text-xs text-white/30">
          &copy; {new Date().getFullYear()} TamperSight. Built for the Smart India Hackathon.
        </p>
      </div>
    </footer>
  );
}
