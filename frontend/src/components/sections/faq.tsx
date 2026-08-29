import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

export function FAQ() {
  return (
    <section id="faq" className="container px-6 mt-32 mb-40 z-10 w-full max-w-3xl mx-auto relative">
      <div className="flex flex-col items-center text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1b9a89]/10 border border-[#1b9a89]/20 text-[#30cfb9] text-[11px] font-bold tracking-widest uppercase mb-4">
          <HelpCircle className="w-3 h-3" />
          <span>F.A.Q</span>
        </div>
        <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
          Common Questions
        </h3>
      </div>

      <Accordion className="w-full">
        <AccordionItem value="item-1" className="border-b-white/10">
          <AccordionTrigger className="text-left text-white font-medium text-[16px] hover:text-[#30cfb9] hover:no-underline py-5">
            What types of documents does TamperSight support?
          </AccordionTrigger>
          <AccordionContent className="text-white/60 text-[15px] leading-relaxed pb-6">
            TamperSight supports all standard MRZ-equipped passports, Aadhaar cards, PAN cards, and major regional driver's licenses. Our dual-engine OCR adapts dynamically to different layouts and typographies.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-2" className="border-b-white/10">
          <AccordionTrigger className="text-left text-white font-medium text-[16px] hover:text-[#30cfb9] hover:no-underline py-5">
            How fast is the verification process?
          </AccordionTrigger>
          <AccordionContent className="text-white/60 text-[15px] leading-relaxed pb-6">
            End-to-end verification—including OCR extraction, cryptographic Verhoeff checksums, pixel-level ELA, and 1:1 biometric face matching—completes in under 2 seconds.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-3" className="border-b-white/10">
          <AccordionTrigger className="text-left text-white font-medium text-[16px] hover:text-[#30cfb9] hover:no-underline py-5">
            Are uploaded documents stored on your servers?
          </AccordionTrigger>
          <AccordionContent className="text-white/60 text-[15px] leading-relaxed pb-6">
            No. TamperSight utilizes a zero-retention edge architecture. Documents are processed entirely in-memory and immediately discarded post-verification, guaranteeing strict GDPR compliance.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="item-4" className="border-b-white/10 border-b-transparent">
          <AccordionTrigger className="text-left text-white font-medium text-[16px] hover:text-[#30cfb9] hover:no-underline py-5">
            How does Error Level Analysis (ELA) detect forgeries?
          </AccordionTrigger>
          <AccordionContent className="text-white/60 text-[15px] leading-relaxed pb-6">
            ELA detects digital tampering by highlighting variations in JPEG compression artifacts. Regions that have been digitally spliced or edited will stand out distinctly on the generated heatmap, revealing the forgery.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
