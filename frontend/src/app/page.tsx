import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/sections/hero";
import { Features } from "@/components/sections/features";
import { Badges } from "@/components/sections/badges";
import { HowItWorks } from "@/components/sections/how-it-works";
import { SystemPreview } from "@/components/sections/system-preview";
import { FAQ } from "@/components/sections/faq";
import { Footer } from "@/components/sections/footer";

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#060b11] text-foreground overflow-hidden">
      
      <Navbar />

      <main className="flex-1 flex flex-col relative w-full pb-10">
        <Hero />
        <Features />
        <Badges />
        <HowItWorks />
        <SystemPreview />
        <FAQ />
      </main>

      <Footer />
    </div>
  );
}
