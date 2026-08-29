import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-base text-on-surface flex flex-col font-sans selection:bg-primary-container/30 h-screen overflow-hidden">
      
      {/* Top Navigation */}
      <nav className="flex justify-between items-center px-10 w-full h-16 bg-surface border-b border-border-strong shrink-0 z-50">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-bold text-primary-main" style={{ fontFamily: '"Hanken Grotesk", sans-serif' }}>
            Tamper Sight
          </Link>
          <div className="hidden md:flex gap-6 h-full items-center">
            <Link href="/dashboard" className="text-primary-main border-b-2 border-primary-main pb-1 text-xs tracking-widest font-medium uppercase opacity-90 h-full flex items-center mt-[2px]" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Dashboard
            </Link>
            <Link href="#" className="text-on-surface-variant hover:text-primary-main transition-colors duration-150 text-xs tracking-widest font-medium uppercase h-full flex items-center" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Forensics
            </Link>
            <Link href="#" className="text-on-surface-variant hover:text-primary-main transition-colors duration-150 text-xs tracking-widest font-medium uppercase h-full flex items-center" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Archive
            </Link>
            <Link href="#" className="text-on-surface-variant hover:text-primary-main transition-colors duration-150 text-xs tracking-widest font-medium uppercase h-full flex items-center" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
              Settings
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-[6px] h-[6px] rounded-full bg-success"></div>
            <span className="text-xs font-medium tracking-widest text-success uppercase" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Edge Engine Online</span>
          </div>
          <div className="flex gap-4">
            <button className="text-on-surface-variant hover:text-primary-main transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="text-on-surface-variant hover:text-primary-main transition-colors">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden h-full">
        {children}
      </main>

    </div>
  );
}
