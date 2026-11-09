"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  MessageSquare,
  Plane,
  Radio,
  ShieldCheck,
  Ship,
  Smartphone,
  Warehouse,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import ScrollCraftRunner from "@/components/ScrollCraftRunner";
import ContainerStage3D, { CorridorId } from "@/components/ContainerStage3D";
import TrackingLookup from "@/components/TrackingLookup";
import { formatFcfa } from "@/lib/format";

type BatchStepKey =
  | "RECUE_ORIGINE"
  | "EN_TRANSIT"
  | "ARRIVEE_ABIDJAN"
  | "PRET_RETRAIT";

const CORRIDORS: Record<
  CorridorId,
  {
    id: CorridorId;
    label: string;
    shortTag: string;
    originCity: string;
    modeText: string;
    sampleBatch: string;
  }
> = {
  yiwu_sea: {
    id: "yiwu_sea",
    label: "Yiwu · Maritime",
    shortTag: "Corridor Yiwu -> Port Vridi",
    originCity: "Yiwu, Chine",
    modeText: "Conteneur 40 pieds · au CBM",
    sampleBatch: "CON-YW-2611",
  },
  canton_air: {
    id: "canton_air",
    label: "Canton · Aérien",
    shortTag: "Corridor Guangzhou -> Aéroport FHB",
    originCity: "Guangzhou, Chine",
    modeText: "Fret express · facturé au kg",
    sampleBatch: "AIR-GZ-2614",
  },
  istanbul_dubai: {
    id: "istanbul_dubai",
    label: "Dubaï & Istanbul",
    shortTag: "Corridor Dubaï / Istanbul -> Abidjan",
    originCity: "Dubaï & Istanbul",
    modeText: "Lots textiles & négoce mixte",
    sampleBatch: "MIX-DB-2609",
  },
};

const BATCH_STEPS: Array<{
  key: BatchStepKey;
  pill: string;
  title: string;
  summary: string;
  waPreview: string;
  progressPct: number;
  updatedAt: string;
}> = [
  {
    key: "RECUE_ORIGINE",
    pill: "1. Reçu entrepôt",
    title: "Réception et pesée enregistrées",
    summary: "Chaque carton est pesé et étiqueté avant le chargement du lot.",
    waPreview:
      "Votre colis a bien été pesé à l'entrepôt de départ. Suivez votre code TC directement en ligne.",
    progressPct: 24,
    updatedAt: "09:15",
  },
  {
    key: "EN_TRANSIT",
    pill: "2. En transit",
    title: "Lot expédié vers Abidjan",
    summary:
      "Tous les colis du conteneur passent en transit en un seul clic.",
    waPreview:
      "Le lot est en route vers Abidjan. Votre page de suivi affiche la prochaine date estimée d'arrivée.",
    progressPct: 54,
    updatedAt: "14:20",
  },
  {
    key: "ARRIVEE_ABIDJAN",
    pill: "3. Arrivé Abidjan",
    title: "Dédouanement en cours sur place",
    summary:
      "Vos clients voient l'arrivée à Vridi ou FHB sans appeler le standard.",
    waPreview:
      "Votre conteneur est arrivé à Abidjan. Le tri et les formalités de douane viennent de démarrer.",
    progressPct: 78,
    updatedAt: "11:05",
  },
  {
    key: "PRET_RETRAIT",
    pill: "4. Prêt au retrait",
    title: "42 colis prêts au comptoir Treichville",
    summary:
      "Les messages WhatsApp partent avec le montant en FCFA et le lien Wave.",
    waPreview:
      "Votre colis est disponible au retrait à Treichville. 144 000 FCFA payables par Wave dès maintenant avant votre passage.",
    progressPct: 100,
    updatedAt: "18:35",
  },
];

const LANES = [
  {
    id: "canton-air",
    corridor: "Chine · Aérien",
    title: "Guangzhou vers Aéroport FHB",
    meta: "Facturation au kg · Vol cargo",
    desc: "Saisissez le poids exact au départ. Le tarif en FCFA s'affiche directement sur la fiche client.",
    img: "/media/v2-lane-air.webp",
    alt: "Soute fret aérien et palettes aluminium sous soleil matinal avant embarquement",
    icon: Plane,
  },
  {
    id: "yiwu-sea",
    corridor: "Chine · Maritime",
    title: "Yiwu et Ningbo vers Port Vridi",
    meta: "Conteneur 40 pieds · Au CBM",
    desc: "Passez cinquante colis d'un même conteneur à l'étape suivante en une seule validation.",
    img: "/media/v2-lane-sea.webp",
    alt: "Porte-conteneurs bleu et orange accosté sous grue portuaire en plein jour",
    icon: Ship,
  },
  {
    id: "istanbul-dubai",
    corridor: "Turquie & Émirats",
    title: "Istanbul et Dubaï vers Abidjan",
    meta: "Prêt-à-porter et négoce mixte",
    desc: "Chaque client retrouve ses colis sous le même numéro WhatsApp sans retenir de tableau.",
    img: "/media/v2-lane-istanbul.webp",
    alt: "Halle logistique claire organisée par palettes cerclées et conteneurs bleus",
    icon: Warehouse,
  },
  {
    id: "abidjan-comptoir",
    corridor: "Abidjan · Comptoir",
    title: "Retrait Treichville, Adjamé et Marcory",
    meta: "Bordereau et paiement Wave",
    desc: "Le client arrive au comptoir avec son reçu déjà réglé ou son code prêt à scanner.",
    img: "/media/v2-lane-abidjan.webp",
    alt: "Comptoir d'accueil ensoleillé d'entrepôt logistique avec étagères rangées",
    icon: Smartphone,
  },
];

export default function HomePage() {
  const [selectedCorridor, setSelectedCorridor] =
    useState<CorridorId>("yiwu_sea");
  const [activeStep, setActiveStep] = useState<BatchStepKey>("EN_TRANSIT");
  const [monthlyParcels, setMonthlyParcels] = useState<number>(350);
  const [callsPerParcel, setCallsPerParcel] = useState<number>(3);

  const activeCorridor = CORRIDORS[selectedCorridor];
  const currentStep =
    BATCH_STEPS.find((s) => s.key === activeStep) ?? BATCH_STEPS[1];

  const roi = useMemo(() => {
    const avoidedCalls = monthlyParcels * callsPerParcel;
    const savedMinutes = avoidedCalls * 3.5;
    const savedHours = Math.round(savedMinutes / 60);
    const weeklyHours = Math.max(1, Math.round(savedHours / 4));
    const estimatedFcfa = savedHours * 2500;
    return {
      avoidedCalls,
      savedHours,
      weeklyHours,
      estimatedFcfa,
    };
  }, [monthlyParcels, callsPerParcel]);

  return (
    <div id="tc-showcase-root" className="min-h-screen flex flex-col">
      <ScrollCraftRunner rootId="tc-showcase-root" />

      <div data-sc-progress aria-hidden="true" />
      <div className="sc-grain" aria-hidden="true" />

      <Navbar activeCorridorLabel={activeCorridor.label} />

      <main className="flex-1">
        {/* ================================================================
            ACTE 1 — HERO 3D MULTI-PLANS PLEIN JOUR (pin, 2.20vh)
           ================================================================ */}
        <section
          data-sc-act="pin"
          data-sc-span="2.20"
          className="sc-act sc-act--pinned bg-[#f6f3ec]"
          aria-label="Ouverture 3D plein jour sur le port d'Abidjan"
        >
          <div className="sc-stage tc-stage-below-nav" data-sc-stage>
            {/* Plane 1: Full-bleed crisp daylight harbor photography */}
            <div className="tc-hero-plane" style={{ zIndex: 1 }}>
              <picture
                data-sc-parallax="0.16"
                className="block w-full h-[114%] -top-[4%] relative"
              >
                <source
                  media="(max-width: 860px)"
                  srcSet="/media/v2-hero-day-m.webp"
                />
                <img
                  src="/media/v2-hero-day.webp"
                  alt="Terminal portuaire ensoleillé à Abidjan avec grues orange et conteneurs bleu cobalt"
                  className="w-full h-full object-cover object-right"
                />
              </picture>
            </div>

            {/* Plane 2: Subtle sunlit coastal grid accent */}
            <div
              className="pointer-events-none hidden lg:flex items-center gap-2 absolute top-4 right-8 z-20 px-3 py-1.5 rounded-[8px] bg-white/92 backdrop-blur-xs border border-[#09152b]/14 shadow-xs text-[11px] font-mono font-bold text-[#09152b]"
              aria-hidden="true"
            >
              <span className="h-2 w-2 rounded-full bg-[#10b981]" />
              <span>VRIDI · PORT SUD · 09:00</span>
            </div>

            {/* Plane 3: Localized Daylight Alabaster Scrim */}
            <div className="tc-day-scrim" aria-hidden="true" />
            <div className="tc-day-floor" aria-hidden="true" />

            {/* Responsive Two-Zone Stage Grid — flush inside (100svh - 4rem) */}
            <div className="relative z-20 h-full max-w-[82rem] mx-auto px-[var(--sc-gutter)] py-3 sm:py-5 md:py-8 flex flex-col justify-between md:grid md:grid-cols-12 md:items-center gap-2 md:gap-4">
              {/* Left Column Desktop / Bottom Area Mobile: Foreground Copy at opacity 1 from y = 0 */}
              <div className="md:col-span-6 order-last md:order-first flex flex-col justify-end md:justify-center relative z-30">
                <div className="inline-flex self-start items-center gap-2 px-2.5 sm:px-3 py-1 rounded-[6px] bg-[#0a2e6e] text-white text-[10px] sm:text-xs font-mono font-bold tracking-[0.06em] uppercase mb-2 sm:mb-3 shadow-xs">
                  <span
                    className="h-2 w-2 rounded-full bg-[#ff5c1b]"
                    aria-hidden="true"
                  />
                  <span>Agences de groupage · Abidjan</span>
                </div>

                <h1 className="sc-display sc-display--xl tc-hero-title text-[#09152b] font-extrabold max-w-[16ch]">
                  Vos clients suivent leur colis sans vous appeler.
                </h1>

                <p className="hidden sm:block sc-lede text-[#2c3a57] font-medium mt-3 max-w-[44ch]">
                  Validez tout un conteneur en une fois, prévenez sur WhatsApp
                  et encaissez par Wave avant le retrait.
                </p>

                {/* Interactive Corridor Switcher */}
                <div className="mt-2.5 sm:mt-4">
                  <div className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-[0.06em] text-[#43506b] mb-1.5">
                    Basculer le corridor 3D :
                  </div>
                  <div
                    className="flex flex-wrap gap-1.5 sm:gap-2"
                    role="group"
                    aria-label="Sélecteur de corridor 3D"
                  >
                    {(Object.keys(CORRIDORS) as CorridorId[]).map((cid) => {
                      const c = CORRIDORS[cid];
                      const active = selectedCorridor === cid;
                      return (
                        <button
                          key={cid}
                          type="button"
                          onClick={() => setSelectedCorridor(cid)}
                          aria-pressed={active}
                          className={`px-2.5 sm:px-3 py-1.5 rounded-[8px] text-[11px] sm:text-xs font-bold transition-all cursor-pointer border ${
                            active
                              ? "bg-[#0a2e6e] text-white border-[#09152b] shadow-xs"
                              : "bg-white/95 text-[#09152b] border-[#09152b]/20 hover:border-[#0a2e6e]"
                          }`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Primary CTA Row */}
                <div className="mt-3 sm:mt-5 flex flex-wrap items-center gap-2.5 sm:gap-3">
                  <Link
                    href="/dashboard"
                    className="tc-btn-primary !min-h-[44px] sm:!min-h-[48px] text-sm"
                  >
                    <span>Tester sur un vrai lot</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <a
                    href="#portail-live"
                    className="tc-btn-ghost hidden sm:inline-flex"
                  >
                    <span>Essayer le suivi client</span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </a>
                </div>
              </div>

              {/* Right Column Desktop / Upper Frame Mobile: Immediate Daylight WebGL 3D Container */}
              <div
                data-sc-parallax="-0.06"
                className="md:col-span-6 order-first md:order-last h-[190px] sm:h-[270px] md:h-[min(68svh,600px)] w-full flex items-center justify-center relative z-10"
              >
                <ContainerStage3D
                  corridor={selectedCorridor}
                  activeStep={activeStep}
                />
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            ACTE 2 — RÉALITÉ ENTREPÔT & CONTRASTE OPÉRATIONNEL (flow + reveal)
           ================================================================ */}
        <section
          data-sc-act="flow"
          className="tc-daylight-band tc-flow-after-pin border-t border-[#09152b]/10"
          aria-label="Comparaison opérationnelle entrepôt"
        >
          <div className="sc-wrap grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-5" data-sc-in>
              <span className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-[0.07em] text-[#0a2e6e] bg-[#dce7fa] border border-[#0a2e6e]/20 px-3 py-1 rounded-[6px]">
                <span>Avant et après le déploiement</span>
              </span>
              <h2 className="sc-display sc-display--lg tc-act2-title text-[#09152b] font-extrabold">
                Arrêtez de répondre cent fois au même message WhatsApp.
              </h2>
              <p className="text-[#43506b] text-base leading-relaxed max-w-[52ch]">
                Quand un navire accoste à Vridi, votre téléphone sature en
                quelques minutes. Avec TrackCargo CI, vos clients consultent
                leur code directement et préparent le règlement depuis chez eux.
              </p>

              {/* High-contrast operational ledger comparison */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="bg-white rounded-[14px] border border-[#09152b]/14 p-4 sm:p-5 shadow-[var(--sc-e1)] space-y-2.5">
                  <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-rose-700">
                    Carnet papier & Excel
                  </div>
                  <ul className="space-y-2 text-sm text-[#43506b]">
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-rose-600 font-bold">
                        01.
                      </span>
                      <span>
                        Appels répétés dès la mise à quai du conteneur
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-rose-600 font-bold">
                        02.
                      </span>
                      <span>
                        Captures d&apos;écran Wave égarées dans les discussions
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-rose-600 font-bold">
                        03.
                      </span>
                      <span>
                        Erreurs de poids ou de CBM recopiées à la main
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="bg-[#0a2e6e] text-white rounded-[14px] border border-[#09152b] p-4 sm:p-5 shadow-[var(--sc-e2)] space-y-2.5">
                  <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-[#fef08a]">
                    Portail TrackCargo CI
                  </div>
                  <ul className="space-y-2 text-sm text-[#dce7fa]">
                    <li className="flex items-start gap-2">
                      <Check
                        className="w-4 h-4 text-[#ff5c1b] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>
                        Mise à jour globale d&apos;un lot entier en un seul clic
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check
                        className="w-4 h-4 text-[#ff5c1b] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>
                        Lien public unique consultable par téléphone ou code TC
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check
                        className="w-4 h-4 text-[#ff5c1b] shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>
                        Montant FCFA et bouton Wave ou Orange Money prêts
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right: Architectural daylight warehouse reveal plate + authored silence */}
            <div className="lg:col-span-6 space-y-3">
              <div
                data-sc-reveal="left"
                className="rounded-[16px] overflow-hidden border border-[#09152b]/16 shadow-[var(--sc-e3)] bg-white"
              >
                <img
                  src="/media/v2-warehouse-day.webp"
                  alt="Baie de réception claire à Treichville avec balance industrielle et cartons palettisés"
                  className="w-full aspect-[16/10] object-cover"
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-[#43506b] px-1">
                <span>RÉCEPTION TREICHVILLE · BALANCE & TRI DIRECT</span>
                <span className="font-bold text-[#0a2e6e]">
                  {activeCorridor.sampleBatch}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            ACTE 3 — LE PIC : PONT DE CONTRÔLE COBALT & SCRUB QUAI (2.95vh)
           ================================================================ */}
        <section
          id="pont-controle"
          data-sc-act="scrub"
          data-sc-span="2.95"
          data-sc-dwell="0.34"
          className="sc-act sc-act--pinned tc-cobalt-band"
          aria-label="Pont de contrôle logistique synchronisé"
        >
          <div className="sc-stage tc-stage-below-nav" data-sc-stage>
            {/* Frame-matched poster & full-life scrubbed daylight quay clip */}
            <picture className="sc-stage__poster block w-full h-full">
              <source
                media="(max-width: 860px)"
                srcSet="/media/v2-quay-poster-p.webp"
              />
              <img
                src="/media/v2-quay-poster.webp"
                alt="Allée ensoleillée de conteneurs bleu cobalt et orange au quai"
                className="w-full h-full object-cover"
              />
            </picture>
            <video
              data-sc-scrub
              data-sc-src="/media/v2-quay.mp4"
              data-sc-src-mobile="/media/v2-quay-m.mp4"
              muted
              playsInline
              preload="auto"
              aria-hidden="true"
            />

            {/* Deep Cobalt gradient localized behind lower control dock */}
            <div className="tc-cobalt-scrim" aria-hidden="true" />

            {/* Top Floating Corridor Banner — visible cleanly below header */}
            <div className="pointer-events-none absolute top-4 sm:top-5 left-[var(--sc-gutter)] right-[var(--sc-gutter)] z-20 flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-[#0a2e6e] text-white border border-white/25 text-xs font-mono font-bold shadow-md">
                <span
                  className="h-2 w-2 rounded-full bg-[#ff5c1b]"
                  aria-hidden="true"
                />
                <span>{activeCorridor.shortTag}</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] bg-white text-[#09152b] text-xs font-mono font-extrabold shadow-md">
                <span>{activeCorridor.sampleBatch}</span>
                <span>·</span>
                <span className="text-[#0a2e6e]">{activeCorridor.modeText}</span>
              </span>
            </div>

            {/* Interactive SVG Corridor & Batch Control Panel — Always 100% opaque high-contrast */}
            <div className="absolute inset-x-[var(--sc-gutter)] bottom-[clamp(0.75rem,3vh,2.2rem)] z-20 max-w-[72rem] mx-auto">
              <div className="bg-[#0a2e6e] text-white rounded-[16px] border border-white/25 shadow-[var(--sc-e3)] p-4 sm:p-6 space-y-3 sm:space-y-4">
                {/* Scroll-Driven SVG Route Trace */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-white/15 pb-3">
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono font-extrabold uppercase tracking-[0.07em] text-[#fef08a]">
                      Mise à jour de masse · 42 colis groupés
                    </div>
                    <h2 className="font-[family-name:var(--font-archivo)] text-lg sm:text-2xl font-extrabold text-white">
                      {currentStep.title}
                    </h2>
                  </div>

                  {/* Animated SVG Flight/Sea Path Driven by --sc-p */}
                  <div
                    className="w-full md:w-[320px] shrink-0"
                    aria-hidden="true"
                  >
                    <div className="flex justify-between text-[10px] font-mono font-bold text-[#dce7fa] mb-1">
                      <span>{activeCorridor.originCity}</span>
                      <span>Abidjan</span>
                    </div>
                    <svg viewBox="0 0 320 28" className="w-full h-6">
                      <line
                        x1="12"
                        y1="14"
                        x2="308"
                        y2="14"
                        stroke="rgba(255,255,255,0.28)"
                        strokeWidth="3"
                        strokeDasharray="6 6"
                      />
                      <line
                        x1="12"
                        y1="14"
                        x2="308"
                        y2="14"
                        stroke="#ff5c1b"
                        strokeWidth="4"
                        strokeLinecap="round"
                        style={{
                          strokeDasharray: 296,
                          strokeDashoffset:
                            "calc(296 * (1 - clamp(0.15, (var(--sc-p, 0.4) * 1.15), 1)))",
                        }}
                      />
                      <circle cx="12" cy="14" r="5" fill="#ffffff" />
                      <circle
                        cx="160"
                        cy="14"
                        r="4"
                        fill={
                          currentStep.progressPct >= 50 ? "#ff5c1b" : "#113b86"
                        }
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx="308"
                        cy="14"
                        r="5.5"
                        fill={
                          currentStep.progressPct === 100
                            ? "#10b981"
                            : "#ff5c1b"
                        }
                        stroke="#ffffff"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                </div>

                {/* Stage Switcher Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BATCH_STEPS.map((st) => {
                    const selected = st.key === activeStep;
                    return (
                      <button
                        key={st.key}
                        type="button"
                        onClick={() => setActiveStep(st.key)}
                        aria-pressed={selected}
                        className={`px-2.5 sm:px-3 py-2 rounded-[10px] text-xs font-extrabold transition-all cursor-pointer border text-left ${
                          selected
                            ? "bg-[#ff5c1b] text-[#09152b] border-[#09152b] shadow-[0_2px_0_#09152b]"
                            : "bg-[#113b86] text-white border-white/25 hover:bg-[#194da8]"
                        }`}
                      >
                        {st.pill}
                      </button>
                    );
                  })}
                </div>

                {/* Live WhatsApp & Verification Telemetry */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center pt-1">
                  <div className="lg:col-span-8 bg-[#071f4a] rounded-[10px] border border-white/15 px-3.5 py-2.5 flex items-start gap-2.5">
                    <MessageSquare
                      className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div className="text-xs sm:text-sm text-[#f8fafc] leading-snug">
                      <span className="font-bold text-white">
                        Aperçu client WhatsApp :{" "}
                      </span>
                      {currentStep.waPreview}
                    </div>
                  </div>

                  <div className="lg:col-span-4 flex flex-wrap items-center justify-between lg:justify-end gap-2">
                    <span
                      data-sc-verify-state={`3d:${currentStep.key}:${currentStep.updatedAt}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] bg-white text-[#09152b] font-mono text-[11px] font-extrabold"
                    >
                      <CheckCircle2
                        className="w-3.5 h-3.5 text-emerald-700"
                        aria-hidden="true"
                      />
                      <span>{`Mise à jour ${currentStep.updatedAt}`}</span>
                    </span>
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] bg-[#22d3ee] hover:bg-[#38bdf8] text-[#09152b] font-extrabold text-xs no-underline"
                    >
                      <span>Gérer en direct</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            ACTE 4 — PORTAIL CLIENT EN DIRECT (/api/track, flow + data-sc-in)
           ================================================================ */}
        <section
          id="portail-live"
          data-sc-act="flow"
          className="tc-daylight-band tc-flow-after-pin border-b border-[#09152b]/10"
          aria-label="Portail client public testable"
        >
          <div className="sc-wrap space-y-6">
            <div
              className="flex flex-col md:flex-row md:items-end justify-between gap-4"
              data-sc-in
            >
              <div className="space-y-2 max-w-2xl">
                <span className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-[0.07em] text-[#0a2e6e] bg-[#dce7fa] border border-[#0a2e6e]/20 px-3 py-1 rounded-[6px]">
                  <Radio
                    className="w-3.5 h-3.5 text-[#ff5c1b]"
                    aria-hidden="true"
                  />
                  <span>Démonstration client connectée à /api/track</span>
                </span>
                <h2 className="sc-display sc-display--md text-[#09152b] font-extrabold">
                  Testez la fiche que reçoivent vos clients sur leur téléphone.
                </h2>
                <p className="text-sm sm:text-base text-[#43506b]">
                  Cliquez sur{" "}
                  <span className="font-mono font-bold text-[#0a2e6e]">
                    TC-8841
                  </span>
                  ,{" "}
                  <span className="font-mono font-bold text-[#0a2e6e]">
                    TC-8842
                  </span>{" "}
                  ou{" "}
                  <span className="font-mono font-bold text-[#0a2e6e]">
                    TC-8844
                  </span>{" "}
                  pour inspecter le statut, le tarif en FCFA et le bouton Wave.
                </p>
              </div>
              <Link href="/track" className="tc-btn-cobalt shrink-0">
                <span>Ouvrir en pleine page</span>
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>

            <TrackingLookup initialQuery="TC-8841" compact />
          </div>
        </section>

        {/* ================================================================
            ACTE 5 — RAIL HORIZONTAL COBALT PLEIN JOUR (pan, 2.35vh)
           ================================================================ */}
        <section
          data-sc-act="pan"
          data-sc-span="2.35"
          className="sc-act sc-act--pinned tc-cobalt-band"
          aria-label="Corridors aériens et maritimes gérés"
        >
          <div className="sc-stage tc-stage-below-nav" data-sc-stage>
            <div className="tc-rail-track" data-sc-pan="0.72">
              <div className="tc-rail-lead space-y-3">
                <span className="inline-flex items-center gap-1.5 self-start text-[11px] font-mono font-extrabold uppercase tracking-[0.08em] px-2.5 py-1 rounded-[6px] bg-[#ff5c1b] text-[#09152b] border border-[#09152b]">
                  <span>{activeCorridor.label}</span>
                </span>
                <h2 className="sc-display sc-display--lg text-white font-extrabold">
                  Quatre corridors, un seul tableau.
                </h2>
                <p className="text-sm sm:text-base text-[#dce7fa] leading-relaxed">
                  Fret aérien facturé au kilo ou conteneur complet facturé au
                  CBM : toutes vos lignes restent lisibles du départ jusqu&apos;à
                  la remise au comptoir.
                </p>
              </div>

              {LANES.map((lane) => {
                const Icon = lane.icon;
                return (
                  <article
                    key={lane.id}
                    data-sc-tilt="5"
                    className="tc-lane-card"
                  >
                    <div className="relative h-44 sm:h-52 overflow-hidden bg-[#ebe5d8] shrink-0">
                      <img
                        src={lane.img}
                        alt={lane.alt}
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-[#0a2e6e] text-white text-[11px] font-mono font-bold shadow-sm">
                        <Icon
                          className="w-3.5 h-3.5 text-[#ff5c1b]"
                          aria-hidden="true"
                        />
                        <span>{lane.corridor}</span>
                      </span>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="text-xs font-mono font-bold text-[#0a2e6e] uppercase">
                          {lane.meta}
                        </div>
                        <h3 className="font-[family-name:var(--font-archivo)] text-lg sm:text-xl font-extrabold text-[#09152b] leading-snug">
                          {lane.title}
                        </h3>
                        <p className="text-sm text-[#43506b] leading-relaxed">
                          {lane.desc}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-[#09152b]/10 flex items-center justify-between text-xs font-mono font-bold text-[#0a2e6e]">
                        <span>Traçabilité lot complète</span>
                        <span className="text-[#09152b]">Actif</span>
                      </div>
                    </div>
                  </article>
                );
              })}

              <div className="tc-rail-end">
                <div className="space-y-3">
                  <div className="text-xs font-mono font-extrabold uppercase tracking-wider text-[#09152b]">
                    Mise en route rapide
                  </div>
                  <h3 className="font-[family-name:var(--font-archivo)] text-2xl font-extrabold text-[#09152b] leading-tight">
                    Démarrez votre premier lot dès aujourd&apos;hui.
                  </h3>
                  <p className="text-sm font-medium text-[#09152b]/90">
                    Copiez vos lignes Excel existantes, générez les codes TC et
                    partagez votre lien personnalisé aux clients.
                  </p>
                </div>
                <Link
                  href="/dashboard"
                  className="tc-btn-cobalt w-full justify-center mt-4"
                >
                  <span>Ouvrir la démo agence</span>
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            ACTE 6 — CALCULATEUR FCFA, TARIFS ASYMÉTRIQUES, FAQ & CLÔTURE COBALT
           ================================================================ */}
        <section
          data-sc-act="flow"
          className="tc-daylight-band tc-flow-after-pin"
          aria-label="Simulateur de temps gagné et tarification"
        >
          <div className="sc-wrap space-y-16 sm:space-y-24">
            {/* 6A: Interactive FCFA ROI Calculator */}
            <section
              aria-label="Simulateur de gain hebdomadaire en FCFA"
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white rounded-[20px] border border-[#09152b]/14 p-6 sm:p-10 shadow-[var(--sc-e2)]"
              data-sc-in
            >
              <div className="lg:col-span-6 space-y-5">
                <span className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-[0.07em] text-[#0a2e6e] bg-[#dce7fa] px-3 py-1 rounded-[6px]">
                  <Calculator
                    className="w-3.5 h-3.5 text-[#ff5c1b]"
                    aria-hidden="true"
                  />
                  <span>Calculez votre charge WhatsApp</span>
                </span>
                <h2 className="sc-display sc-display--md text-[#09152b] font-extrabold">
                  Combien d&apos;heures vos équipes passent au téléphone chaque
                  mois ?
                </h2>

                <div className="space-y-4 pt-2">
                  <div>
                    <div className="flex justify-between text-sm font-bold text-[#09152b] mb-1.5">
                      <label htmlFor="calc-parcels">
                        Colis gérés chaque mois
                      </label>
                      <span className="font-mono text-[#0a2e6e]">
                        {monthlyParcels} colis
                      </span>
                    </div>
                    <input
                      id="calc-parcels"
                      type="range"
                      min={50}
                      max={1500}
                      step={50}
                      value={monthlyParcels}
                      onChange={(e) =>
                        setMonthlyParcels(Number(e.target.value))
                      }
                      className="w-full cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-sm font-bold text-[#09152b] mb-1.5">
                      <label htmlFor="calc-messages">
                        Relances moyennes par colis
                      </label>
                      <span className="font-mono text-[#0a2e6e]">
                        {callsPerParcel} échanges
                      </span>
                    </div>
                    <input
                      id="calc-messages"
                      type="range"
                      min={1}
                      max={8}
                      step={1}
                      value={callsPerParcel}
                      onChange={(e) =>
                        setCallsPerParcel(Number(e.target.value))
                      }
                      className="w-full cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#f6f3ec] rounded-[16px] border border-[#09152b]/14 p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-[12px] p-4 border border-[#09152b]/10">
                    <div className="text-xs font-mono font-bold text-[#43506b] uppercase">
                      Messages évités / mois
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#0a2e6e] font-mono tabular-nums mt-1">
                      {roi.avoidedCalls.toLocaleString("fr-FR")}
                    </div>
                  </div>
                  <div className="bg-white rounded-[12px] p-4 border border-[#09152b]/10">
                    <div className="text-xs font-mono font-bold text-[#43506b] uppercase">
                      Temps libéré / sem.
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-[#09152b] font-mono tabular-nums mt-1 flex items-center gap-1.5">
                      <Clock3
                        className="w-5 h-5 text-[#ff5c1b]"
                        aria-hidden="true"
                      />
                      <span>{roi.weeklyHours} h</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#0a2e6e] text-white rounded-[12px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-mono uppercase tracking-wider text-[#fef08a] font-bold">
                      Équivalent charge équipe économisée
                    </div>
                    <div className="text-2xl font-extrabold font-mono tabular-nums mt-0.5">
                      {formatFcfa(roi.estimatedFcfa)} / mois
                    </div>
                  </div>
                  <Link href="/dashboard" className="tc-btn-primary shrink-0">
                    <span>Tester maintenant</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </section>

            {/* 6B: Asymmetric 3-Tier Pricing */}
            <section id="tarifs" className="space-y-8" data-sc-in>
              <div className="max-w-2xl space-y-2">
                <span className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-[0.07em] text-[#0a2e6e] bg-[#dce7fa] px-3 py-1 rounded-[6px]">
                  <span>Tarifs agence en FCFA</span>
                </span>
                <h2 className="sc-display sc-display--md text-[#09152b] font-extrabold">
                  Des forfaits simples, sans pourcentage sur vos encaissements.
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                {/* Tier 1 */}
                <div className="bg-white rounded-[16px] border border-[#09152b]/14 p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-[var(--sc-e1)]">
                  <div className="space-y-4">
                    <div className="text-xs font-mono font-bold uppercase text-[#43506b]">
                      Départ
                    </div>
                    <div className="text-3xl font-extrabold font-mono text-[#09152b]">
                      35 000 FCFA
                      <span className="text-sm font-normal text-[#43506b]">
                        {" "}
                        / mois
                      </span>
                    </div>
                    <p className="text-sm text-[#43506b]">
                      Idéal pour démarrer avec un entrepôt à Abidjan et vos
                      premiers lots hebdomadaires.
                    </p>
                    <ul className="space-y-2 text-sm text-[#09152b]">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#0a2e6e]" />
                        <span>Portail public client avec nom d&apos;agence</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#0a2e6e]" />
                        <span>Mises à jour de masse par conteneur</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#0a2e6e]" />
                        <span>Lien marchand Wave &amp; Orange Money</span>
                      </li>
                    </ul>
                  </div>
                  <Link href="/dashboard" className="tc-btn-ghost w-full">
                    <span>Essayer la formule Départ</span>
                  </Link>
                </div>

                {/* Tier 2 — Highlighted Cobalt Elevation */}
                <div className="bg-[#0a2e6e] text-white rounded-[18px] border-2 border-[#09152b] p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-[var(--sc-e3)] lg:-translate-y-2">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-extrabold uppercase text-[#fef08a]">
                        Pack Pro Cargo
                      </span>
                      <span className="px-2.5 py-0.5 rounded-[6px] bg-[#ff5c1b] text-[#09152b] text-[11px] font-extrabold font-mono border border-[#09152b]">
                        Recommandé
                      </span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white">
                      60 000 FCFA
                      <span className="text-sm font-normal text-[#c7d9f7]">
                        {" "}
                        / mois
                      </span>
                    </div>
                    <p className="text-sm text-[#dce7fa]">
                      Pensé pour les transitaires gérant des départs aériens et
                      conteneurs Chine / Dubaï / Turquie en continu.
                    </p>
                    <ul className="space-y-2.5 text-sm text-white">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#ff5c1b]" />
                        <span>Import Excel multi-lignes en un clic</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#ff5c1b]" />
                        <span>Alertes WhatsApp pré-remplies avec solde FCFA</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#ff5c1b]" />
                        <span>Bordereaux imprimables &amp; suivi multi-corridors</span>
                      </li>
                    </ul>
                  </div>
                  <Link href="/dashboard" className="tc-btn-primary w-full">
                    <span>Ouvrir le Pack Pro Cargo</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>

                {/* Tier 3 */}
                <div className="bg-white rounded-[16px] border border-[#09152b]/14 p-6 sm:p-7 flex flex-col justify-between gap-6 shadow-[var(--sc-e1)]">
                  <div className="space-y-4">
                    <div className="text-xs font-mono font-bold uppercase text-[#43506b]">
                      Multi-Entrepôts
                    </div>
                    <div className="text-3xl font-extrabold font-mono text-[#09152b]">
                      100 000 FCFA
                      <span className="text-sm font-normal text-[#43506b]">
                        {" "}
                        / mois
                      </span>
                    </div>
                    <p className="text-sm text-[#43506b]">
                      Pour les structures opérant sur plusieurs points de
                      retrait entre Abidjan et l&apos;intérieur du pays.
                    </p>
                    <ul className="space-y-2 text-sm text-[#09152b]">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#0a2e6e]" />
                        <span>Comptoirs multiples et équipes séparées</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#0a2e6e]" />
                        <span>Accompagnement mise en service sur place</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#0a2e6e]" />
                        <span>Export comptable hebdomadaire Wave et Cash</span>
                      </li>
                    </ul>
                  </div>
                  <Link href="/dashboard" className="tc-btn-ghost w-full">
                    <span>Demander une mise en place</span>
                  </Link>
                </div>
              </div>
            </section>

            {/* 6C: Direct Practical FAQ */}
            <section className="max-w-3xl space-y-4" data-sc-in>
              <h2 className="font-[family-name:var(--font-archivo)] text-2xl sm:text-3xl font-extrabold text-[#09152b]">
                Questions fréquentes
              </h2>
              <div className="divide-y divide-[#09152b]/12 bg-white rounded-[16px] border border-[#09152b]/14 px-5 sm:px-6 shadow-[var(--sc-e1)]">
                {[
                  {
                    q: "Mes clients doivent-ils installer une application pour suivre leur colis ?",
                    a: "Non. Ils ouvrent simplement le lien de votre agence dans leur navigateur mobile et tapent leur code TC ou leur numéro WhatsApp.",
                  },
                  {
                    q: "Comment fonctionnent les paiements Wave et Orange Money ?",
                    a: "Vous renseignez votre propre lien marchand Wave Business et votre numéro Orange Money dans l'espace agence. TrackCargo CI ne prélève aucune commission sur vos transactions.",
                  },
                  {
                    q: "Puis-je importer ma liste de colis déjà préparée dans Excel ?",
                    a: "Oui. Copiez directement vos colonnes Nom, Téléphone, Description et Poids dans l'onglet Import Excel pour générer tous les codes de suivi d'un seul coup.",
                  },
                  {
                    q: "L'outil gère-t-il à la fois le kilo aérien et le CBM maritime ?",
                    a: "Oui. Chaque lot définit son mode de calcul (prix au kilogramme pour l'aérien ou au mètre cube pour le maritime) avec conversion automatique en FCFA.",
                  },
                ].map((item) => (
                  <details key={item.q} className="group py-4">
                    <summary className="flex items-center justify-between gap-4 cursor-pointer font-bold text-[#09152b] text-sm sm:text-base list-none">
                      <span>{item.q}</span>
                      <ChevronDown
                        className="w-4 h-4 text-[#0a2e6e] shrink-0 transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="text-sm text-[#43506b] mt-2.5 leading-relaxed">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </section>

        {/* ================================================================
            CLÔTURE MONOLITHE COBALT + PIED DE PAGE STRUCTURÉ (Direct flow close)
           ================================================================ */}
        <section className="tc-cobalt-band border-t border-[#09152b]">
          <div className="sc-wrap py-16 sm:py-24 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-[0.07em] text-[#fef08a]">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>Déploiement agence en quelques minutes</span>
              </div>
              <h2 className="sc-display sc-display--lg text-white font-extrabold">
                Passez vos prochains conteneurs sur TrackCargo CI.
              </h2>
              <p className="text-base text-[#dce7fa] leading-relaxed">
                Importez un premier Manifeste Excel, activez votre lien client
                et testez le retrait sans encombrer votre comptoir.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link href="/dashboard" className="tc-btn-primary">
                <span>Ouvrir l&apos;espace agence</span>
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link href="/track/TC-8841" className="tc-btn-ghost">
                <span>Voir fiche TC-8841</span>
              </Link>
            </div>
          </div>

          <footer className="bg-[#09152b] text-[#c7d9f7] border-t border-white/12">
            <div className="sc-wrap py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2 font-bold text-white">
                <span>TrackCargo CI</span>
                <span className="text-[#ff5c1b]">·</span>
                <span className="font-normal text-[#c7d9f7]">
                  Logiciel de groupage Chine, Turquie &amp; Dubaï vers Abidjan
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/track" className="hover:text-white no-underline">
                  Suivi public
                </Link>
                <Link
                  href="/track/TC-8841"
                  className="hover:text-white no-underline"
                >
                  Démo TC-8841
                </Link>
                <Link href="/login" className="hover:text-white no-underline">
                  Connexion agence
                </Link>
                <a href="#tarifs" className="hover:text-white no-underline">
                  Tarifs FCFA
                </a>
              </div>
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
