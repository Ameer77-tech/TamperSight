import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-[#060b11]/80 backdrop-blur-md py-4 border-b border-white/5">
      <div className="container mx-auto px-6 h-10 flex items-center justify-between max-w-7xl">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L22 7L12 12L2 7L12 2Z" fill="#8bf5e5"/>
            <path d="M2 7V17L12 22V12L2 7Z" fill="#30cfb9"/>
            <path d="M22 7V17L12 22V12L22 7Z" fill="#1b9a89"/>
          </svg>
          <span className="text-xl font-bold tracking-tight text-white">tampersight</span>
        </Link>
        
        {/* Nav Links */}
        <div className="hidden lg:flex items-center gap-8 text-[15px] font-semibold text-white/90">
          <Link href="#dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="#modules" className="hover:text-white transition-colors">Forensic Modules</Link>
          <Link href="#validation" className="hover:text-white transition-colors">Live Validation</Link>
        </div>

        {/* Right Actions CTA */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard">
            <Button className="bg-[#8bf5e5] text-[#0a1922] hover:bg-[#8bf5e5]/90 rounded-xl px-7 h-10 font-bold">
              Access System
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
