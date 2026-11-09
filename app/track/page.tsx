"use client";

import { useState } from "react";
import { Radio } from "lucide-react";
import Navbar from "@/components/Navbar";
import TrackingLookup from "@/components/TrackingLookup";
import { PublicAgencyProfile } from "@/lib/types";

export default function TrackPage() {
  const [agency, setAgency] = useState<PublicAgencyProfile | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0d12] text-[#f3f1ec]">
      <Navbar agencyName={agency?.name} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-[0.08em] text-[#e89b2d] bg-[#121721] border border-[#e89b2d]/30 px-3 py-1 rounded-[6px]">
            <Radio className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Portail client en direct</span>
          </span>
          <h1 className="sc-display sc-display--md text-[#f3f1ec]">
            Suivez votre colis vers Abidjan.
          </h1>
          <p className="text-sm sm:text-base text-[#9ca6b8] leading-relaxed">
            Saisissez votre code de suivi ou votre numéro WhatsApp pour voir
            l&apos;étape actuelle, les frais en FCFA et préparer votre retrait.
          </p>
        </div>

        <TrackingLookup onAgencyLoaded={setAgency} />
      </main>
    </div>
  );
}
