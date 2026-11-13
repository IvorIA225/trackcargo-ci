"use client";

import { Suspense, use, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MapPin, Radio } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import Navbar from "@/components/Navbar";
import TrackingLookup from "@/components/TrackingLookup";
import { normalizePhoneClient } from "@/lib/format";
import { PublicAgencyProfile } from "@/lib/types";

function safeDecodeSlug(raw: string): string {
  try {
    return decodeURIComponent(raw).toLowerCase();
  } catch {
    return raw.toLowerCase();
  }
}

function AgencyPortalContent({ slug }: { slug: string }) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [agency, setAgency] = useState<PublicAgencyProfile | null>(null);
  const [portalState, setPortalState] = useState<"OK" | "NOT_FOUND" | "SUSPENDED">("OK");

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f6f2] text-[#0d131d]">
      <Navbar agencyName={agency?.name} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-8">
        {portalState === "OK" && (
          <div className="relative overflow-hidden bg-[#0d1522] text-white rounded-[20px] border border-white/10 shadow-[0_22px_54px_-16px_rgba(13,21,34,0.3)] p-5 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div
              className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#c9410e]/18 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative space-y-2.5">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-[0.08em] px-3 py-1 rounded-full bg-[#c9410e] text-white">
                <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Portail client officiel</span>
              </span>
              <h1 className="sc-display sc-display--md text-white font-bold tracking-tight">
                {agency?.name || "Suivi de colis"}
              </h1>
              <p className="text-sm text-[#cbd5e1] flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#f0642d] shrink-0 mt-0.5" aria-hidden="true" />
                <span>
                  {agency
                    ? `${agency.address} (${agency.commune})`
                    : `Chargement du portail ${slug}...`}
                </span>
              </p>
            </div>

            {agency && (
              <a
                href={`https://wa.me/${normalizePhoneClient(
                  agency.whatsappPhone
                ).replace(/^\+/, "")}?text=${encodeURIComponent(
                  `Bonjour ${agency.name}, je souhaite suivre mon colis.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="relative inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-full bg-[#047857] hover:bg-[#065f46] text-white font-bold text-sm w-full md:w-auto shrink-0 no-underline transition-colors shadow-lg"
              >
                <BrandLogo brand="whatsapp" size="sm" decorative />
                <span>WhatsApp agence</span>
              </a>
            )}
          </div>
        )}

        <TrackingLookup
          agencySlug={slug}
          initialQuery={initialQuery}
          onAgencyLoaded={setAgency}
          onPortalStateChange={(st) => setPortalState(st)}
        />

        <div className="text-center text-xs text-[#525e70] pt-2">
          Vous êtes gérant d&apos;une agence de groupage ?{" "}
          <Link
            href="/register"
            className="text-[#0d1522] font-bold hover:text-[#c9410e] hover:underline"
          >
            Créer votre portail TrackCargo CI (14 jours gratuits)
          </Link>
        </div>
      </main>
    </div>
  );
}

export default function AgencyPortalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const cleanSlug = safeDecodeSlug(slug);

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f6f2] flex items-center justify-center text-[#525e70] font-semibold">
          Chargement du portail client...
        </div>
      }
    >
      <AgencyPortalContent slug={cleanSlug} />
    </Suspense>
  );
}
