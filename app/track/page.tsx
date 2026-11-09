"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import TrackingLookup from "@/components/TrackingLookup";
import { PublicAgencyProfile } from "@/lib/types";

export default function TrackPage() {
  const [agency, setAgency] = useState<PublicAgencyProfile | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar agencyName={agency?.name} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
            Portail Client en Direct
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Suivez votre colis Chine / Turquie → Abidjan
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Entrez votre code de suivi ou votre numéro WhatsApp pour consulter
            l&apos;avancement en temps réel, les frais en FCFA et préparer votre retrait.
          </p>
        </div>

        <TrackingLookup onAgencyLoaded={setAgency} />
      </main>
    </div>
  );
}
