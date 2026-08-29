import { Zap, ShieldCheck, Database, Globe, CheckCircle2, Lock, Cpu, Server } from "lucide-react";

export function Badges() {
  const badges = [
    { text: "Real-time Processing", icon: Zap },
    { text: "Verhoeff Checksum", icon: ShieldCheck },
    { text: "No Data Retention", icon: Database },
    { text: "Edge-First AI", icon: Cpu },
    { text: "99.8% Accuracy", icon: CheckCircle2 },
    { text: "GDPR Compliant", icon: Lock },
    { text: "Offline Capabilities", icon: Globe },
    { text: "REST API Ready", icon: Server },
  ];

  return (
    <section className="w-full relative z-10 mt-12 mb-24">
      <div className="container px-6 max-w-4xl mx-auto flex flex-wrap justify-center gap-3">
        {badges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <div 
              key={index} 
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-[#0a0e14]/50 backdrop-blur-md text-sm text-white/70 hover:text-white hover:border-white/10 transition-colors"
            >
              <Icon className="w-4 h-4 text-[#30cfb9]" />
              <span className="font-medium tracking-wide">{badge.text}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
