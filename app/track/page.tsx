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
    <div className="min-h-screen flex flex-col bg-[#f6f3ec] text-[#09152b]">
      <Navbar agencyName={agency?.name} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-[0.08em] text-[#0a2e6e] bg-[#dce7fa] border border-[#0a2e6e]/25 px-3 py-1 rounded-[6px]">
            <Radio className="w-3.5 h-3.5 text-[#ff5c1b]" aria-hidden="true" />
            <span>Portail client en direct</span>
          </span>
          <h1 className="sc-display sc-display--md text-[#09152b] font-bold">
            Suivez votre colis vers Abidjan.
          </h1>
          <p className="text-sm sm:text-base text-[#43506b] leading-relaxed">
            Saisissez votre code de suivi unique (<code className="font-mono text-[#0a2e6e]">TC-xxxx</code>) reçu sur WhatsApp, ou ouvrez directement le portail dédié{" "}
            <Link
              href="/a/ivoire-cargo-express"
              className="text-[#0a2e6e] font-bold hover:text-[#ff5c1b] hover:underline"
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
