"use client";

import { Suspense, use, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MapPin, MessageSquare, Radio } from "lucide-react";
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
    <div className="min-h-screen flex flex-col bg-[#f6f3ec] text-[#09152b]">
      <Navbar agencyName={agency?.name} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        {portalState === "OK" && (
          <div className="bg-[#0a2e6e] text-white rounded-[16px] border-2 border-[#09152b] shadow-[var(--sc-e2)] p-6 sm:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-extrabold uppercase tracking-[0.06em] px-2.5 py-1 rounded-[6px] bg-[#ff5c1b] text-[#09152b] border border-[#09152b]">
                <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Portail client officiel</span>
              </span>
              <h1 className="sc-display sc-display--md text-white font-extrabold">
                {agency?.name || "Suivi de colis"}
              </h1>
              <p className="text-sm text-[#dce7fa] flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#ff5c1b] shrink-0 mt-0.5" aria-hidden="true" />
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
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[10px] bg-[#10b981] hover:bg-[#34d399] text-[#042318] font-extrabold text-sm shrink-0 no-underline"
              >
                <MessageSquare className="w-4 h-4" aria-hidden="true" />
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

        <div className="text-center text-xs text-[#43506b] pt-2">
          Vous êtes gérant d&apos;une agence de groupage ?{" "}
          <Link
            href="/register"
            className="text-[#0a2e6e] font-bold hover:text-[#ff5c1b] hover:underline"
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
        <div className="min-h-screen bg-[#f6f3ec] flex items-center justify-center text-[#43506b] font-semibold">
          Chargement du portail client...
        </div>
      }
    >
      <AgencyPortalContent slug={cleanSlug} />
    </Suspense>
  );
}
