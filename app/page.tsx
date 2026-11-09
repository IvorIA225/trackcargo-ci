"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  Clock,
  Lock,
  MessageSquare,
  PackageCheck,
  Plane,
  ShieldCheck,
  Ship,
  Smartphone,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ScrollCraftRunner from "@/components/ScrollCraftRunner";
import ContainerStage3D, {
  DispatchStageStatus,
} from "@/components/ContainerStage3D";
import TrackingLookup from "@/components/TrackingLookup";
import { formatFcfa } from "@/lib/format";

const DISPATCH_STAGES: Array<{
  key: DispatchStageStatus;
  label: string;
  tag: string;
  location: string;
  whatsappPreview: string;
}> = [
  {
    key: "RECUE_ORIGINE",
    label: "1. Reçu à Yiwu",
    tag: "Pesé et étiqueté",
    location: "Entrepôt Yiwu, Chine",
    whatsappPreview:
      "Bonjour Jean-Marc K., vos 12 cartons (0.45 CBM) ont bien été pesés à Yiwu sous le code TC-8842. Suivi : trackcargo-ci.vercel.app/track/TC-8842",
  },
  {
    key: "EN_TRANSIT",
    label: "2. En transit mer",
    tag: "Conteneur scellé",
    location: "Navire vers Port d'Abidjan",
    whatsappPreview:
      "Bonjour Jean-Marc K., le conteneur CON-YW-2610M a quitté le port. Votre code TC-8842 reste actif à chaque escale.",
  },
  {
    key: "ARRIVEE_ABIDJAN",
    label: "3. Arrivé à Vridi",
    tag: "Dédouanement en cours",
    location: "Terminal Portuaire de Vridi, Abidjan",
    whatsappPreview:
      "Bonjour Jean-Marc K., le conteneur CON-YW-2610M vient d'accoster au quai de Vridi. Sortie entrepôt prévue sous 48h.",
  },
  {
    key: "PRET_RETRAIT",
    label: "4. Prêt au retrait",
    tag: "Ouvert au guichet",
    location: "Entrepôt Treichville, Abidjan",
    whatsappPreview:
      "Bonjour Jean-Marc K., vos 12 cartons (TC-8842) sont prêts à Treichville. Frais : 144 000 FCFA payables par Wave avant passage.",
  },
];

const LANE_CARDS = [
  {
    id: "guangzhou-air",
    title: "Guangzhou Air",
    origin: "Canton vers Port-Bouët",
    metric: "8 500 FCFA / kg",
    summary:
      "Vols hebdomadaires pour les boutiques beauté, coiffure et téléphonie. Chaque colis obtient son tarif FCFA exact dès la pesée.",
    image: "/media/lane-guangzhou-air.webp",
    alt: "Plateforme de fret aérien de nuit avec conteneurs ULD en aluminium et palettes filmées",
  },
  {
    id: "yiwu-sea",
    title: "Yiwu Maritime",
    origin: "Yiwu vers Quai de Vridi",
    metric: "320 000 FCFA / CBM",
    summary:
      "Conteneurs 40 pieds suivis par mètre cube. En un clic au dédouanement, les cinquante acheteurs du lot passent tous au vert.",
    image: "/media/lane-yiwu-sea.webp",
    alt: "Portes métalliques de conteneur maritime bleu marine et ambre avec barres de verrouillage",
  },
  {
    id: "istanbul-dubai",
    title: "Istanbul & Dubaï",
    origin: "Laleli & Deira vers Abidjan",
    metric: "Ballots & Prêt-à-porter",
    summary:
      "Suivez vos ballots textiles et chaussures depuis le départ jusqu'au retrait par vos revendeuses, avec l'historique lisible sur téléphone.",
    image: "/media/lane-istanbul-dubai.webp",
    alt: "Entrepôt de groupage textile contenant des ballots cerclés et cartons prêts à expédier",
  },
  {
    id: "abidjan-pickup",
    title: "Retrait Abidjan",
    origin: "Treichville · Adjamé · Cocody",
    metric: "Wave & Orange Money",
    summary:
      "Vos clients règlent leurs frais depuis leur téléphone avant d'arriver au comptoir et impriment leur bordereau sur place.",
    image: "/media/lane-abidjan-pickup.webp",
    alt: "Comptoir épuré de retrait colis avec étagères d'acier sombre et éclairage ambre chaleureux",
  },
];

const PRICING_TIERS = [
  {
    name: "Pack Démarreur",
    price: "35 000 FCFA",
    period: "/ mois",
    setup: "+ 75 000 FCFA installation unique",
    featured: false,
    description:
      "Idéal pour structurer une agence en croissance qui gère jusqu'à 400 colis mensuels sur une ou deux lignes.",
    features: [
      "Jusqu'à 400 colis par mois",
      "Portail public de suivi à vos couleurs",
      "Messages WhatsApp pré-remplis en un clic",
      "Calcul automatique en FCFA par kg ou CBM",
    ],
  },
  {
    name: "Pack Pro Cargo",
    price: "60 000 FCFA",
    period: "/ mois",
    setup: "+ 150 000 FCFA reprise Excel & formation",
    featured: true,
    description:
      "Conçu pour les transitaires aériens et maritimes traitant plusieurs conteneurs et lots simultanés.",
    features: [
      "Colis, vols et conteneurs illimités",
      "Mise à jour de tout un lot d'un seul geste",
      "Import copier-coller direct depuis Excel",
      "Paiement Wave, Orange Money et bordereaux imprimables",
    ],
  },
  {
    name: "Pack Multi-Pays",
    price: "100 000 FCFA",
    period: "/ mois",
    setup: "+ 300 000 FCFA déploiement marque blanche",
    featured: false,
    description:
      "Pour les réseaux opérant entre Abidjan, Bouaké, Ouagadougou ou Bamako avec plusieurs comptoirs.",
    features: [
      "Multi-entrepôts et équipes illimitées",
      "Domaine personnalisé (suivi.votreagence.ci)",
      "Passerelle d'envoi automatique WhatsApp Cloud",
      "Tableau de trésorerie consolidé multi-sites",
    ],
  },
];

const FAQ_ITEMS = [
  {
    q: "Comment récupérer nos colis déjà saisis dans Excel ?",
    a: "Dans l'onglet Import Express de l'espace agence, copiez directement vos colonnes (Nom, Téléphone, Description, Poids) et validez. Chaque ligne génère son code TC et son montant FCFA immédiatement.",
  },
  {
    q: "Faut-il un abonnement payant à l'API WhatsApp dès le départ ?",
    a: "Non. Dès les deux premiers packs, l'outil prépare le message personnalisé avec le lien personnel du colis et ouvre WhatsApp prêt à envoyer en une seconde, sans surcoût tiers.",
  },
  {
    q: "Les clients voient-ils les noms ou numéros des autres acheteurs ?",
    a: "Jamais. Le portail public masque les données nominatives (initiale du nom et numéro abrégé) et bloque les requêtes trop courtes pour empêcher toute recherche indiscrète.",
  },
];

function stageForProgress(p: number): DispatchStageStatus {
  if (p < 0.25) return "RECUE_ORIGINE";
  if (p < 0.52) return "EN_TRANSIT";
  if (p < 0.78) return "ARRIVEE_ABIDJAN";
  return "PRET_RETRAIT";
}

export default function HomePage() {
  const peakActRef = useRef<HTMLElement | null>(null);
  const manualLockRef = useRef(false);
  const [dispatchStatus, setDispatchStatus] =
    useState<DispatchStageStatus>("RECUE_ORIGINE");
  const [weeklyParcels, setWeeklyParcels] = useState(250);
  const [messagesPerParcel, setMessagesPerParcel] = useState(4);

  // Sync Act 4 stage & WhatsApp manifest to scrollcraft --sc-p continuously until
  // clicked manually (resetting cleanly whenever user scrolls out and back in).
  useEffect(() => {
    let raf = 0;
    const syncFromScroll = () => {
      raf = 0;
      const el = peakActRef.current;
      if (!el) return;
      const pRaw = parseFloat(el.style.getPropertyValue("--sc-p") || "0") || 0;
      if (pRaw <= 0.02 || pRaw >= 0.98) {
        manualLockRef.current = false;
      }
      if (!manualLockRef.current) {
        const nextStage = stageForProgress(pRaw);
        setDispatchStatus((prev) => (prev === nextStage ? prev : nextStage));
      }
    };
    const scheduleSync = () => {
      if (!raf) raf = requestAnimationFrame(syncFromScroll);
    };

    window.addEventListener("scroll", scheduleSync, { passive: true });
    const el = peakActRef.current;
    const mo = el
      ? new MutationObserver(scheduleSync)
      : null;
    if (el && mo) {
      mo.observe(el, { attributes: true, attributeFilter: ["style"] });
    }
    scheduleSync();

    return () => {
      window.removeEventListener("scroll", scheduleSync);
      mo?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const handleManualStageSelect = (st: DispatchStageStatus) => {
    manualLockRef.current = true;
    setDispatchStatus(st);
  };

  const activeStageMeta = useMemo(
    () =>
      DISPATCH_STAGES.find((s) => s.key === dispatchStatus) ||
      DISPATCH_STAGES[0],
    [dispatchStatus]
  );

  // Transparent calculation formulas explicitly explained to the visitor
  const weeklyMessagesAvoided = weeklyParcels * messagesPerParcel;
  const hoursSavedPerMonth = Math.round((weeklyMessagesAvoided * 2 * 4) / 60);
  const monthlyCashGain = Math.round(weeklyParcels * 4 * 500);

  return (
    <div id="tc-showcase-root" className="min-h-screen flex flex-col bg-[#0a0d12] text-[#f3f1ec]">
      <ScrollCraftRunner rootId="tc-showcase-root" />

      <div data-sc-progress aria-hidden="true" />
      <div className="sc-grain" aria-hidden="true" />

      <Navbar overlay />

      <main className="flex-1">
        {/* ================================================================
            ACT 1 : PRESENCE (scrub + multi-layer parallax)
            ================================================================ */}
        <section
          data-sc-act="scrub"
          data-sc-span="1.80"
          data-sc-dwell="0.35"
          data-sc-drift="#0A0D12"
          aria-label="Accueil TrackCargo CI"
        >
          <div data-sc-stage>
            {/* Layer 0: Native Poster + Continuous Scrub Video */}
            <picture>
              <source media="(max-width: 860px)" srcSet="/media/01-poster-p.webp" />
              <img
                className="sc-stage__poster"
                src="/media/01-poster.webp"
                alt="Terminal à conteneurs d'Abidjan à l'heure bleue sous éclairage portuaire ambre"
                width={1600}
                height={900}
              />
            </picture>
            <video
              data-sc-scrub
              data-sc-src="/media/01-hero.mp4"
              data-sc-src-mobile="/media/01-hero-m.mp4"
              playsInline
              muted
              aria-hidden="true"
            />

            {/* Layer 1: Distant Maritime Atmospheric Wash (moves faster back) */}
            <div
              className="tc-hero-plane"
              data-sc-parallax="-0.9"
              style={{ zIndex: 2 }}
              aria-hidden="true"
            >
              <div
                className="w-[125vw] h-[120%] -ml-[12vw]"
                style={{
                  background:
                    "radial-gradient(65% 45% at 25% 22%, rgba(28, 62, 112, 0.24), transparent 72%)",
                }}
              />
            </div>

            {/* Layer 2: Corridor Altitude Meridians (mid parallax depth) */}
            <div
              className="tc-hero-plane"
              data-sc-parallax="-0.45"
              style={{ zIndex: 3 }}
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 1440 900"
                className="w-[116vw] h-full -ml-[8vw] opacity-50"
                preserveAspectRatio="xMidYMid slice"
              >
                <path
                  d="M -40 240 Q 520 70 1090 365"
                  fill="none"
                  stroke="#e89b2d"
                  strokeOpacity="0.48"
                  strokeWidth="1.25"
                  strokeDasharray="5 7"
                />
                <path
                  d="M 120 110 Q 670 210 1140 382"
                  fill="none"
                  stroke="#7294c4"
                  strokeOpacity="0.34"
                  strokeWidth="1"
                />
                <circle cx="1090" cy="365" r="4.5" fill="#e89b2d" />
                <circle
                  cx="1090"
                  cy="365"
                  r="14"
                  fill="none"
                  stroke="#e89b2d"
                  strokeOpacity="0.45"
                  strokeWidth="1"
                />
              </svg>
            </div>

            {/* Layer 3: Section Floor Mask + Localized Copy Scrim */}
            <div className="tc-hero-floor" aria-hidden="true" />
            <div className="tc-hero-scrim" aria-hidden="true" />

            {/* Foreground Copy anchored bottom-left on desktop, bottom band on mobile */}
            <div className="sc-copy sc-copy--lead" data-sc-cue="0 0.95 0 0.06">
              <div className="sc-stack">
                <p className="sc-label text-[#f3aa3e]">
                  Groupage Chine, Turquie et Dubaï vers Abidjan
                </p>
                <h1
                  className="tc-hero-title sc-display sc-display--xl max-w-[16ch]"
                  data-sc-kinetic="lines"
                >
                  Vos clients suivent leur colis sans vous appeler.
                </h1>
                <p className="sc-lede max-w-[42ch] text-[#d6dce7]">
                  Mettez tout un conteneur à jour en un geste et encaissez le
                  fret via Wave ou Orange Money.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link href="/dashboard" className="tc-btn-primary">
                    <span>Ouvrir l&apos;espace agence</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <Link href="/track" className="tc-btn-ghost">
                    <span>Tester un code client</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            ACT 2 : PRESSION RETENUE (pin + kinetic)
            ================================================================ */}
        <section
          data-sc-act="pin"
          data-sc-span="1.30"
          data-sc-drift="#0D1119"
          aria-label="Constat quotidien des transitaires"
        >
          <div data-sc-stage className="relative bg-[#0d1119]">
            {/* Ground: clean architectural hairline coordinates present from p = 0 */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none opacity-35"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(243,241,236,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(243,241,236,0.06) 1px, transparent 1px)",
                backgroundSize: "96px 96px",
              }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 50% 50%, transparent 15%, #0d1119 78%)",
              }}
            />

            <div className="sc-copy sc-copy--center">
              <div data-sc-cue="0 0.36 0 0.18" className="space-y-4">
                <p className="tc-act2-quote sc-display sc-display--md text-[#f3f1ec]">
                  Chaque arrivée au quai de Vridi déclenche les mêmes appels en
                  boucle sur votre ligne WhatsApp.
                </p>
              </div>
            </div>

            <div className="sc-copy sc-copy--center">
              <h2
                className="tc-act2-title sc-display sc-display--lg text-[#f3f1ec]"
                data-sc-cue="0.28 0.70 0.18 0.18"
                data-sc-kinetic="lines"
              >
                Un client demande où est son carton. Puis quarante autres en
                même temps.
              </h2>
            </div>

            <div className="sc-copy sc-copy--center">
              <p
                className="sc-lede mx-auto text-[#d6dce7]"
                data-sc-cue="0.62 0.98 0.18 0.08"
              >
                Pendant que votre équipe cherche une ligne dans un fichier Excel,
                les paiements de fret attendent devant le comptoir.
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            ACT 3 : RESPIRATION SILENCIEUSE (flow + reveal)
            Authored visual silence right before the 3D Peak
            ================================================================ */}
        <section
          data-sc-act="flow"
          className="tc-flow-after-pin bg-[#0a0d12] border-y border-white/10"
          aria-label="Un seul dossier partagé"
        >
          <div className="sc-wrap grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div
              className="lg:col-span-5 space-y-5"
              data-sc-in
              data-sc-stagger="50"
            >
              <h2 className="sc-display sc-display--md text-[#f3f1ec]">
                Un seul dossier entre le départ en Chine et le comptoir à
                Treichville.
              </h2>
              <p className="sc-body">
                Chaque carton reçoit son code personnel dès la pesée. Vos
                importateurs lisent la progression eux-mêmes sans interrompre
                vos agents.
              </p>
            </div>

            <div className="lg:col-span-7">
              <figure
                data-sc-reveal="left"
                data-sc-reveal-at="0.04 0.28"
                className="rounded-[14px] overflow-hidden border border-white/15 bg-[#121721]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/media/turn-warehouse.webp"
                  alt="Zone de pesée calme dans un entrepôt logistique avec balance numérique et cartons cerclés"
                  width={1600}
                  height={900}
                  className="w-full h-auto object-cover"
                />
              </figure>
            </div>
          </div>
        </section>

        {/* ================================================================
            ACT 4 (THE PEAK) : LE PONT LOGISTIQUE 3D SYNCHRONISE
            Longest scroll act on the page (3.40vh)
            ================================================================ */}
        <section
          ref={peakActRef}
          data-sc-act="pin"
          data-sc-span="3.15"
          data-sc-drift="#111722"
          aria-label="Démonstration interactive 3D d'un conteneur de groupage"
        >
          <div
            data-sc-stage
            className="bg-[#111722] flex items-center justify-center px-3 sm:px-8 pt-[4.25rem] pb-2 sm:pt-20 sm:pb-6 overflow-hidden"
          >
            <div className="w-full max-w-[82rem] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-4 lg:gap-8 items-center">
              {/* Left / Top 60%: Real-Time Interactive Three.js 3D Stage */}
              <div className="lg:col-span-7 flex flex-col gap-1.5 sm:gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="sc-label text-[#f3aa3e] truncate">
                      Lot actif CON-YW-2610M · 40 pieds
                    </p>
                    <h2 className="sc-display sc-display--md text-[#f3f1ec] mt-0.5 text-[1.05rem] sm:text-[length:var(--sc-t-2xl)] leading-tight">
                      Un clic bascule tout le conteneur.
                    </h2>
                  </div>
                  <span className="shrink-0 text-[10px] sm:text-xs font-mono px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-[6px] bg-[#18202e] border border-white/15 text-[#d6dce7]">
                    {activeStageMeta.tag}
                  </span>
                </div>

                <div className="h-[132px] min-[400px]:h-[160px] sm:h-[260px] lg:h-[430px]">
                  <ContainerStage3D
                    status={dispatchStatus}
                    actRef={peakActRef}
                  />
                </div>
              </div>

              {/* Right: Live Synchronized Manifest Switchboard & WhatsApp Alert */}
              <div className="lg:col-span-5 bg-[#121721] border border-white/15 rounded-[14px] p-3 sm:p-6 space-y-2 sm:space-y-4 shadow-2xl">
                <div>
                  <div className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.08em] text-[#9ca6b8]">
                    Étape du manifeste
                  </div>
                  <p className="text-xs sm:text-sm text-[#d6dce7] mt-1 hidden sm:block">
                    Défilez ou sélectionnez une étape pour ouvrir le conteneur
                    3D et préparer les notifications clients :
                  </p>
                </div>

                {/* Interactive 4-Step Controls */}
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                  {DISPATCH_STAGES.map((st) => {
                    const active = st.key === dispatchStatus;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => handleManualStageSelect(st.key)}
                        className={`text-left px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-[8px] border text-[11px] sm:text-xs font-semibold transition-colors cursor-pointer ${
                          active
                            ? "bg-[#e89b2d] text-[#090b10] border-[#e89b2d] font-bold"
                            : "bg-[#0b0f17] text-[#d6dce7] border-white/15 hover:border-[#e89b2d]/60 hover:text-white"
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>

                {/* Synchronized Batch Sample Rows */}
                <div className="bg-[#0b0f17] rounded-[10px] border border-white/10 p-2 sm:p-3 space-y-1 sm:space-y-2">
                  <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-[#9ca6b8]">
                    <span>LIEU ACTUEL</span>
                    <span className="text-[#f3f1ec] truncate max-w-[65%]">
                      {activeStageMeta.location}
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-1 sm:pt-2 space-y-1 text-[11px] sm:text-xs">
                    {[
                      { code: "TC-8842", client: "Jean-Marc K.", cbm: "0.45 CBM" },
                      { code: "TC-8845", client: "Awa K.", cbm: "0.22 CBM" },
                      { code: "TC-8849", client: "Moussa B.", cbm: "0.80 CBM" },
                    ].map((row, idx) => (
                      <div
                        key={row.code}
                        className={`flex items-center justify-between font-mono ${
                          idx >= 2 ? "hidden sm:flex" : ""
                        }`}
                      >
                        <span className="text-[#e89b2d] font-bold">{row.code}</span>
                        <span className="text-[#d6dce7]">{row.client}</span>
                        <span className="text-[#9ca6b8]">{row.cbm}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prepared Client WhatsApp Dispatch */}
                <div className="bg-[#0b1914] border border-emerald-500/30 rounded-[10px] p-2 sm:p-3 space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.06em] text-emerald-300">
                    <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                    <span>Message WhatsApp généré</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#e2ece7] leading-snug sm:leading-relaxed line-clamp-2 sm:line-clamp-none">
                    {activeStageMeta.whatsappPreview}
                  </p>
                </div>

                <Link
                  href="/dashboard"
                  className="tc-btn-primary w-full !min-h-[38px] !py-2 sm:!min-h-[44px] sm:!py-2.5 text-xs sm:text-sm"
                >
                  <span>Ouvrir l&apos;espace agence</span>
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            ACT 5 : SUBSTANCE TANGIBLE (flow + real /api/track portal)
            ================================================================ */}
        <section
          data-sc-act="flow"
          className="tc-flow-after-pin bg-[#0d1119] border-t border-white/10"
          aria-label="Portail client public testable"
        >
          <div className="sc-wrap space-y-6 sm:space-y-8">
            <div className="max-w-2xl space-y-3" data-sc-in>
              <p className="sc-label text-[#e89b2d]">Portail client réel</p>
              <h2 className="sc-display sc-display--md text-[#f3f1ec]">
                Essayez le suivi que recevront vos acheteurs.
              </h2>
              <p className="sc-body">
                Saisissez un code de suivi ou choisissez un exemple pour ouvrir
                la fiche colis réelle, la progression du lot et le lien de
                paiement Mobile Money.
              </p>
            </div>

            <TrackingLookup initialQuery="TC-8841" />
          </div>
        </section>

        {/* ================================================================
            ACT 6 : AMPLEUR OPERATIONNELLE (pan rail + desktop 3D tilt)
            ================================================================ */}
        <section
          data-sc-act="pan"
          data-sc-span="2.15"
          data-sc-drift="#0A0D12"
          aria-label="Lignes aériennes et maritimes couvertes"
        >
          <div data-sc-stage className="bg-[#0a0d12]">
            <div className="tc-rail-track" data-sc-pan="0.06">
              {/* Opening editorial frame (stays opaque at p = 0) */}
              <div className="tc-rail-lead space-y-4">
                <p className="sc-label text-[#e89b2d]">Corridors gérés</p>
                <h2 className="sc-display sc-display--md text-[#f3f1ec]">
                  Un seul outil du fournisseur jusqu&apos;à Abidjan.
                </h2>
                <p className="sc-body">
                  Que votre agence charge des vols express au kilogramme ou des
                  conteneurs complets au mètre cube, chaque ligne suit les mêmes
                  règles claires.
                </p>
              </div>

              {/* Four Photographic Corridor Cards */}
              {LANE_CARDS.map((card) => (
                <article
                  key={card.id}
                  data-sc-tilt="5"
                  className="tc-lane-card"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={card.image}
                    alt={card.alt}
                    width={1200}
                    height={896}
                    className="w-full h-[155px] sm:h-[205px] object-cover shrink-0"
                  />
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs font-mono text-[#e89b2d]">
                        <span>{card.origin}</span>
                        <span>{card.metric}</span>
                      </div>
                      <h3 className="font-bold text-lg sm:text-xl text-[#f3f1ec] tracking-tight">
                        {card.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-[#b6c0d0] leading-relaxed">
                        {card.summary}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-white/10 text-xs font-mono text-[#9ca6b8] flex items-center justify-between">
                      <span>Suivi TC automatique</span>
                      <span>WhatsApp · Wave</span>
                    </div>
                  </div>
                </article>
              ))}

              {/* Closing conversion rail block */}
              <div className="tc-rail-end">
                <div className="space-y-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#e89b2d]/15 text-[#e89b2d]">
                    <PackageCheck className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-bold text-xl sm:text-2xl text-[#f3f1ec] leading-tight">
                    Prêt sur votre marque dès demain.
                  </h3>
                  <p className="text-xs sm:text-sm text-[#b6c0d0]">
                    Nous importons votre fichier Excel actuel et paramétrons vos
                    numéros Wave et Orange Money.
                  </p>
                </div>

                <Link href="/dashboard" className="tc-btn-primary w-full mt-4">
                  <span>Ouvrir l&apos;espace agence</span>
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            ACT 7 : RAISON ECONOMIQUE & TARIFS (Hard-cut Daylight Paper)
            ================================================================ */}
        <section
          data-sc-act="flow"
          className="tc-daylight-band tc-flow-after-pin border-t border-black/10"
          aria-label="Simulateur mensuel, tarifs et questions fréquentes"
        >
          <div className="sc-wrap space-y-12 sm:space-y-14">
            {/* Part A: Transparent FCFA Calculator */}
            <div
              className="bg-white rounded-[16px] border border-black/10 shadow-sm p-6 sm:p-9 grid grid-cols-1 lg:grid-cols-12 gap-7 items-center"
              data-sc-in
            >
              <div className="lg:col-span-6 space-y-4">
                <p className="text-xs font-mono font-semibold uppercase tracking-[0.08em] text-[#9a5504]">
                  Simulateur de charge opérationnelle
                </p>
                <h2 className="sc-display sc-display--md text-[#11151e]">
                  Mesurez le temps que votre comptoir perd chaque semaine.
                </h2>
                <p className="text-sm sm:text-base text-[#475063] max-w-[52ch]">
                  Réglez le volume hebdomadaire de votre agence à Abidjan. Moins
                  d&apos;appels entrants veut dire plus de temps pour peser,
                  facturer et encaisser au comptoir.
                </p>

                <div className="space-y-4 pt-1">
                  <div>
                    <div className="flex justify-between text-sm font-semibold text-[#11151e] mb-1.5">
                      <label htmlFor="calc-parcels">
                        Colis traités par semaine
                      </label>
                      <span className="font-mono text-[#9a5504] tabular-nums">
                        {weeklyParcels} colis
                      </span>
                    </div>
                    <input
                      id="calc-parcels"
                      type="range"
                      min={50}
                      max={1500}
                      step={50}
                      value={weeklyParcels}
                      onChange={(e) => setWeeklyParcels(Number(e.target.value))}
                      className="w-full accent-[#9a5504] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm font-semibold text-[#11151e] mb-1.5">
                      <label htmlFor="calc-messages">
                        Relances moyennes par colis
                      </label>
                      <span className="font-mono text-[#9a5504] tabular-nums">
                        {messagesPerParcel} messages
                      </span>
                    </div>
                    <input
                      id="calc-messages"
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={messagesPerParcel}
                      onChange={(e) =>
                        setMessagesPerParcel(Number(e.target.value))
                      }
                      className="w-full accent-[#9a5504] cursor-pointer"
                    />
                  </div>

                  <p className="text-xs text-[#596275] leading-relaxed">
                    Hypothèse retenue pour cette estimation : 2 minutes gagnées
                    par appel évité et 500 FCFA récupérés par dossier sur les
                    oublis et retards de retrait.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#11151e] text-[#f3f1ec] rounded-[12px] p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.06em] text-[#9ca6b8]">
                    <MessageSquare className="w-4 h-4 text-[#e89b2d]" aria-hidden="true" />
                    <span>Relances évitées / mois</span>
                  </div>
                  <div className="text-3xl font-extrabold text-[#e89b2d] font-mono tabular-nums">
                    {(weeklyMessagesAvoided * 4).toLocaleString("fr-FR")}
                  </div>
                  <p className="text-xs text-[#b6c0d0]">
                    Vos acheteurs vérifient l&apos;étape eux-mêmes sur leur
                    lien.
                  </p>
                </div>

                <div className="bg-[#f3f0ea] border border-black/10 rounded-[12px] p-5 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.06em] text-[#475063]">
                    <Clock className="w-4 h-4 text-[#9a5504]" aria-hidden="true" />
                    <span>Temps récupéré / mois</span>
                  </div>
                  <div className="text-3xl font-extrabold text-[#11151e] font-mono tabular-nums">
                    {hoursSavedPerMonth} h
                  </div>
                  <p className="text-xs text-[#475063]">
                    Soit environ {Math.max(1, Math.round(hoursSavedPerMonth / 8))}{" "}
                    journées de travail dédiées au comptoir.
                  </p>
                </div>

                <div className="sm:col-span-2 bg-[#f9f6f0] border border-[#9a5504]/30 rounded-[12px] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono font-bold uppercase tracking-[0.06em] text-[#9a5504]">
                      Impact mensuel estimé sur le terrain
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#11151e] mt-1 font-mono tabular-nums">
                      +{formatFcfa(monthlyCashGain)} / mois
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-[10px] bg-[#11151e] hover:bg-[#1e2636] text-[#f3f1ec] font-bold text-sm whitespace-nowrap transition-colors"
                  >
                    <span>Ouvrir l&apos;espace agence</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Part B: 3 Clear Pricing Offers */}
            <div className="space-y-8" data-sc-in>
              <div className="max-w-2xl space-y-2.5">
                <p className="text-xs font-mono font-semibold uppercase tracking-[0.08em] text-[#9a5504]">
                  Tarifs Côte d&apos;Ivoire
                </p>
                <h2 className="sc-display sc-display--md text-[#11151e]">
                  Des forfaits simples, facturés en FCFA.
                </h2>
                <p className="text-sm sm:text-base text-[#475063]">
                  Mise en service en 24 heures avec import de votre fichier Excel
                  actuel et prise en main avec vos agents à Abidjan.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {PRICING_TIERS.map((tier) => (
                  <div
                    key={tier.name}
                    className={`rounded-[14px] p-6 sm:p-7 flex flex-col justify-between gap-6 ${
                      tier.featured
                        ? "bg-[#121721] text-[#f3f1ec] border-2 border-[#e89b2d] shadow-xl"
                        : "bg-white text-[#11151e] border border-black/12 shadow-xs"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-mono font-bold uppercase tracking-[0.06em] ${
                            tier.featured ? "text-[#e89b2d]" : "text-[#475063]"
                          }`}
                        >
                          {tier.name}
                        </span>
                        {tier.featured && (
                          <span className="text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-[6px] bg-[#e89b2d] text-[#090b10]">
                            Recommandé
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="text-3xl font-extrabold font-mono tabular-nums">
                          {tier.price}
                          <span
                            className={`text-sm font-normal ml-1 ${
                              tier.featured ? "text-[#9ca6b8]" : "text-[#596275]"
                            }`}
                          >
                            {tier.period}
                          </span>
                        </div>
                        <div
                          className={`mt-2 inline-block text-xs font-medium px-2.5 py-1 rounded-[6px] ${
                            tier.featured
                              ? "bg-[#1c2536] text-[#f3aa3e] border border-white/10"
                              : "bg-[#f3f0ea] text-[#7a4202] border border-black/10"
                          }`}
                        >
                          {tier.setup}
                        </div>
                      </div>

                      <p
                        className={`text-sm leading-relaxed ${
                          tier.featured ? "text-[#c4cddb]" : "text-[#475063]"
                        }`}
                      >
                        {tier.description}
                      </p>

                      <ul className="space-y-2.5 pt-1 text-sm">
                        {tier.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2.5">
                            <Check
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                tier.featured
                                  ? "text-[#e89b2d]"
                                  : "text-[#9a5504]"
                              }`}
                              aria-hidden="true"
                            />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link
                      href="/dashboard"
                      className={
                        tier.featured
                          ? "tc-btn-primary w-full"
                          : "w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-4 py-3 rounded-[10px] border border-black/20 bg-white hover:bg-[#f3f0ea] text-[#11151e] font-bold text-sm transition-colors"
                      }
                    >
                      <span>Ouvrir l&apos;espace agence</span>
                      <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Part C: 3 Grounded Transit FAQ Rows */}
            <div className="border-t border-black/10 pt-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-[0.06em] text-[#9a5504]">
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  <span>Questions fréquentes</span>
                </div>
                <h2 className="sc-display sc-display--md text-[#11151e]">
                  Tout ce qu&apos;on nous demande en rendez-vous.
                </h2>
              </div>

              <div className="lg:col-span-8 divide-y divide-black/10">
                {FAQ_ITEMS.map((item) => (
                  <div key={item.q} className="py-4 first:pt-0 last:pb-0 space-y-1.5">
                    <h3 className="font-bold text-base sm:text-lg text-[#11151e]">
                      {item.q}
                    </h3>
                    <p className="text-sm sm:text-base text-[#475063] leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            ACT 8 : FERMETURE DECIDEE (pin + spotlight + magnet + footer)
            ================================================================ */}
        <section
          data-sc-act="pin"
          data-sc-span="1.20"
          data-sc-drift="#090C11"
          data-sc-spotlight
          aria-label="Démarrer avec TrackCargo CI"
        >
          <div
            data-sc-stage
            className="bg-[#090c11] text-[#f3f1ec] flex flex-col justify-between px-5 sm:px-10 pt-20 pb-8"
          >
            {/* Subtle architectural backdrop ground visible before final hold */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none opacity-45"
              style={{
                background:
                  "radial-gradient(60% 50% at 50% 42%, rgba(232, 155, 45, 0.10), transparent 75%)",
              }}
            />

            <div className="flex-1 flex items-center justify-center relative z-10">
              <div
                className="max-w-3xl mx-auto text-center space-y-6"
                data-sc-cue="0.04"
              >
                <p className="sc-label text-[#e89b2d]">
                  Démonstration immédiate avec vos colis
                </p>
                <h2 className="sc-display sc-display--lg text-[#f3f1ec]">
                  Votre prochain conteneur mérite un suivi digne de vos clients.
                </h2>
                <p className="sc-lede mx-auto text-[#c4cddb]">
                  Testez dès maintenant le tableau de bord complet et adaptez
                  le portail au nom de votre agence en quelques minutes.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <Link
                    href="/dashboard"
                    data-sc-magnet="0.28"
                    data-sc-rise="0"
                    className="tc-btn-primary"
                  >
                    <span>Ouvrir l&apos;espace agence</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <Link href="/track" className="tc-btn-ghost">
                    <span>Tester un code client</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Integrated Footer inside the resolving stage */}
            <footer className="relative z-10 max-w-[82rem] w-full mx-auto pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#9ca6b8]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-[#f3f1ec]">TrackCargo CI</span>
                <span>Abidjan, Côte d&apos;Ivoire</span>
                <span className="inline-flex items-center gap-1 text-[#d6dce7]">
                  <Plane className="w-3.5 h-3.5 text-[#e89b2d]" aria-hidden="true" />
                  <Ship className="w-3.5 h-3.5 text-[#e89b2d]" aria-hidden="true" />
                  <Smartphone className="w-3.5 h-3.5 text-[#e89b2d]" aria-hidden="true" />
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-5">
                <Link href="/track" className="hover:text-white transition-colors">
                  Suivi client public
                </Link>
                <Link href="/login" className="hover:text-white transition-colors inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" aria-hidden="true" />
                  <span>Connexion agence</span>
                </Link>
                <Link href="/dashboard" className="text-[#e89b2d] hover:text-[#f3aa3e] font-semibold">
                  Ouvrir l&apos;espace agence
                </Link>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
