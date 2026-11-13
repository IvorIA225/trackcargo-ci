"use client";

import { useState } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import Navbar from "@/components/Navbar";
import TrackingLookup from "@/components/TrackingLookup";
import { PublicAgencyProfile } from "@/lib/types";

export default function TrackPage() {
  const [agency, setAgency] = useState<PublicAgencyProfile | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f6f2] text-[#0d131d]">
      <Navbar agencyName={agency?.name} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-[0.08em] text-[#0d1522] bg-white border border-[#0d131d]/12 px-3.5 py-1 rounded-full shadow-xs">
            <Radio className="w-3.5 h-3.5 text-[#c9410e]" aria-hidden="true" />
            <span>Portail client en direct</span>
          </span>
          <h1 className="sc-display sc-display--md text-[#0d131d] font-bold">
            Suivez votre colis vers Abidjan.
          </h1>
          <p className="text-sm sm:text-base text-[#525e70] leading-relaxed">
            Saisissez votre code de suivi unique (<code className="font-mono text-[#c9410e]">TC-xxxx</code>) reçu sur WhatsApp, ou ouvrez directement le portail dédié{" "}
            <Link
              href="/a/ivoire-cargo-express"
              className="text-[#0d1522] font-bold hover:text-[#c9410e] hover:underline"
            >
              Ivoire Cargo Express
            </Link>
            .
          </p>
        </div>

        <TrackingLookup onAgencyLoaded={setAgency} />
      </main>
    </div>
  );
}
