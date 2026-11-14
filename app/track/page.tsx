"use client";

import { useState } from "react";
import { QrCode, Radio, ShieldCheck, Smartphone } from "lucide-react";
import Navbar from "@/components/Navbar";
import TrackingLookup from "@/components/TrackingLookup";
import { PublicAgencyProfile } from "@/lib/types";

export default function TrackPage() {
  const [agency, setAgency] = useState<PublicAgencyProfile | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_#ffffff_0%,_#f7f6f2_62%,_#eeebe3_100%)] text-[#0d131d]">
      <Navbar agencyName={agency?.name} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6 sm:space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3.5">
          <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-[0.1em] text-[#0d1522] bg-white border border-[#0d131d]/12 px-3.5 py-1.5 rounded-full shadow-xs">
            <Radio className="w-3.5 h-3.5 text-[#c9410e]" aria-hidden="true" />
            <span>Portail officiel de suivi &amp; retrait · Abidjan</span>
          </span>
          <h1 className="sc-display sc-display--md text-[#0d131d] font-bold tracking-tight">
            Suivez votre expédition vers Abidjan.
          </h1>
          <p className="text-sm sm:text-[15.5px] text-[#525e70] leading-relaxed max-w-[54ch] mx-auto">
            Entrez le code colis (<code className="font-mono font-semibold text-[#c9410e]">TC-...</code>) transmis par votre agence de transit ou votre numéro WhatsApp pour vérifier son étape, son montant en FCFA et afficher votre reçu officiel.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs font-medium text-[#525e70]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-[#0d131d]/10 px-3 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              Statut vérifié en direct
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-[#0d131d]/10 px-3 py-1">
              <QrCode className="w-3.5 h-3.5 text-[#0d1522]" aria-hidden="true" />
              Bon de retrait avec QR
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-[#0d131d]/10 px-3 py-1">
              <Smartphone className="w-3.5 h-3.5 text-[#c9410e]" aria-hidden="true" />
              Sans application à télécharger
            </span>
          </div>
        </div>

        <TrackingLookup onAgencyLoaded={setAgency} />
      </main>
    </div>
  );
}
