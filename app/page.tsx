"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ContainerStage3D, { type CorridorId } from "@/components/ContainerStage3D";
import Navbar from "@/components/Navbar";
import ParcelShowcase3D from "@/components/ParcelShowcase3D";
import ScrollCraftRunner from "@/components/ScrollCraftRunner";
import TrackingLookup from "@/components/TrackingLookup";
import { formatFcfa } from "@/lib/format";
import { PLAN_META, type PlanTier } from "@/lib/types";

type CorridorSpec = {
  id: CorridorId;
  label: string;
  unitName: string;
  origin: string;
  arrival: string;
  eta: string;
  rateLabel: string;
  summary: string;
};

const CORRIDORS: Record<CorridorId, CorridorSpec> = {
  yiwu_sea: {
    id: "yiwu_sea",
    label: "Yiwu · Maritime",
    unitName: "Conteneur ISO 40 pieds · Acier maritime",
    origin: "Yiwu & Ningbo",
    arrival: "Terminal de Vridi, Abidjan",
    eta: "42 à 50 jours",
    rateLabel: "CBM et carton",
    summary:
      "Idéal pour le groupage au mètre cube. Dès le chargement du conteneur à Yiwu, chaque destinataire suit son code TC et règle son reliquat avant le retrait.",
  },
  canton_air: {
    id: "canton_air",
    label: "Canton · Aérien",
    unitName: "Unité ULD AKE · Aluminium aéronautique",
    origin: "Guangzhou Baiyun",
    arrival: "Fret FHB, Abidjan",
    eta: "5 à 8 jours",
    rateLabel: "Facturation au kilo",
    summary:
      "Conçu pour les commandes urgentes pesées à l'entrepôt. Le poids exact, le tarif au kilogramme et le lien de paiement Wave partent sans saisie répétée.",
  },
  istanbul_dubai: {
    id: "istanbul_dubai",
    label: "Istanbul & Dubaï",
    unitName: "Caisse export cerclée · Négoce",
    origin: "Laleli & Deira",
    arrival: "Comptoir Treichville",
    eta: "6 à 12 jours",
    rateLabel: "Colis et valeur",
    summary:
      "Adapté aux boutiques de prêt-à-porter et d'électronique. Vos clientes reçoivent la photo au départ puis viennent retirer leurs sacs avec un reçu Wave prêt.",
  },
};

type BatchStep = {
  id: "RECUE_ORIGINE" | "EN_TRANSIT" | "ARRIVEE_ABIDJAN" | "PRET_RETRAIT";
  stepLabel: string;
  buttonLabel: string;
  progressPct: number;
  arcStop: number;
  locationLine: string;
  whatsappSample: string;
  waveState: string;
};

const BATCH_STEPS: BatchStep[] = [
  {
    id: "RECUE_ORIGINE",
    stepLabel: "01 · Dépôt en Chine",
    buttonLabel: "1. Reçu au dépôt",
    progressPct: 18,
    arcStop: 0.22,
    locationLine: "Guangzhou · 42 colis pesés et étiquetés",
    whatsappSample:
      "Bonjour Aminata, votre colis TC-8841 (14,5 kg) est bien arrivé à notre dépôt de Guangzhou. Suivez son trajet ici sans nous appeler.",
    waveState: "Montant bloqué à 48 000 FCFA, payable à l'arrivée",
  },
  {
    id: "EN_TRANSIT",
    stepLabel: "02 · En mer ou en vol",
    buttonLabel: "2. En transit",
    progressPct: 52,
    arcStop: 0.54,
    locationLine: "Lot #CG-402 · Traversée en cours vers Abidjan",
    whatsappSample:
      "Le lot #CG-402 qui contient votre colis TC-8841 est en route vers Abidjan. Arrivée estimée dans 9 jours.",
    waveState: "Lien de prépaiement disponible à tout moment",
  },
  {
    id: "ARRIVEE_ABIDJAN",
    stepLabel: "03 · Débarqué à Vridi",
    buttonLabel: "3. Arrivé à Abidjan",
    progressPct: 82,
    arcStop: 0.84,
    locationLine: "Port de Vridi · Dépotage prévu sous 24 h",
    whatsappSample:
      "Bonne nouvelle, le lot #CG-402 vient d'accoster à Vridi. Vous serez prévenue dès que votre colis passera au comptoir.",
    waveState: "42 liens Wave préparés automatiquement pour le comptoir",
  },
  {
    id: "PRET_RETRAIT",
    stepLabel: "04 · Disponible à Treichville",
    buttonLabel: "4. Prêt au retrait",
    progressPct: 100,
    arcStop: 1,
    locationLine: "Treichville · Prêt contre code ou QR",
    whatsappSample:
      "Votre colis TC-8841 est prêt au comptoir de Treichville. Réglez les 48 000 FCFA par Wave ou Orange Money avant de passer.",
    waveState: "Reçu généré automatiquement après validation Wave",
  },
];

const CORRIDOR_CARDS = [
  {
    city: "Guangzhou · Aérien",
    timing: "5 à 8 jours",
    billing: "Au kilogramme",
    detail:
      "Pesée à l'entrepôt en Chine, photo jointe au dossier et lien Wave prêt avant même l'atterrissage à Abidjan.",
    image: "/media/v2-lane-air.webp",
    alt: "Soute fret aérien sur piste en plein jour entre Guangzhou et Abidjan",
  },
  {
    city: "Yiwu · Maritime",
    timing: "42 à 50 jours",
    billing: "CBM et carton",
    detail:
      "Un seul changement sur le lot met à jour quarante clients ensemble au moment où le conteneur quitte Ningbo puis entre à Vridi.",
    image: "/media/v2-lane-sea.webp",
    alt: "Porte-conteneurs au mouillage en eau claire vers le port d'Abidjan",
  },
  {
    city: "Istanbul & Dubaï",
    timing: "6 à 12 jours",
    billing: "Sac et valeur",
    detail:
      "Chaque commande est associée au numéro WhatsApp de la cliente pour éviter les erreurs de sacs à la remise.",
    image: "/media/v2-lane-istanbul.webp",
    alt: "Entrepôt d'exportation textile et palettes organisées pour l'Afrique de l'Ouest",
  },
  {
    city: "Comptoir Abidjan",
    timing: "Retrait rapide",
    billing: "Wave & Orange Money",
    detail:
      "Votre équipe saisit le code TC ou scanne le QR client, encaisse le solde exact et imprime le bon de sortie.",
    image: "/media/v2-lane-abidjan.webp",
    alt: "Comptoir logistique d'accueil des clients à Abidjan",
  },
];

const PLANS: Array<{
  tier: PlanTier;
  name: string;
  price: number;
  description: string;
  features: string[];
  featured: boolean;
}> = [
  {
    tier: "DEPART",
    name: PLAN_META.DEPART.label,
    price: PLAN_META.DEPART.priceFcfa,
    description: PLAN_META.DEPART.summary,
    features: [
      "Portail client dédié à votre agence (/a/votre-slug)",
      "Création de lots aérien & maritime et codes TC",
      "Alertes WhatsApp pré-remplies par colis",
      "1 compte administrateur agence prêt en 2 minutes",
    ],
    featured: false,
  },
  {
    tier: "PRO",
    name: PLAN_META.PRO.label,
    price: PLAN_META.PRO.priceFcfa,
    description: PLAN_META.PRO.summary,
    features: [
      "Import rapide de listes Excel / CSV",
      "Mise à jour d'un conteneur ou vol en un clic",
      "Encaissement Wave Business et Orange Money sans commission",
      "Calcul auto au kilogramme (aérien) et au CBM (maritime)",
    ],
    featured: true,
  },
  {
    tier: "MULTI",
    name: PLAN_META.MULTI.label,
    price: PLAN_META.MULTI.priceFcfa,
    description: PLAN_META.MULTI.summary,
    features: [
      "Volume de colis et de conteneurs illimité",
      "Pilotage multi-corridors (Chine, Dubaï, Turquie, Abidjan)",
      "Suivi des encaissements Wave, Orange Money et espèces",
      "Accompagnement WhatsApp prioritaire au démarrage",
    ],
    featured: false,
  },
];

const FAQS = [
  {
    q: "Combien de temps faut-il pour démarrer sur nos arrivages en cours ?",
    a: "Votre espace est prêt en moins de cinq minutes. Vous importez vos colis en cours ou vous créez un lot test immédiatement avec vos clients.",
  },
  {
    q: "Nos clients doivent-ils télécharger une application mobile ?",
    a: "Non. Ils cliquent sur le lien reçu sur WhatsApp et voient leur colis, son poids et le montant exact directement dans le navigateur de leur téléphone.",
  },
  {
    q: "Prenez-vous une commission sur les paiements Wave ou Orange Money ?",
    a: "Aucune. TrackCargo CI automatise le calcul du montant et le reçu, mais l'argent arrive directement sur votre compte marchand habituel.",
  },
  {
    q: "Que se passe-t-il après les 14 jours d'essai gratuit ?",
    a: "Vous choisissez votre forfait sans frais cachés. Aucune carte bancaire n'est demandée à l'inscription pour tester avec votre équipe.",
  },
];

const TELEMETRY_STOPS = [
  { label: "Dépôt", target: "#act-ouverture" },
  { label: "Carton TC", target: "#act-comptoir" },
  { label: "Quai Vridi", target: "#act-quai" },
  { label: "Portail", target: "#portail-live" },
  { label: "Lignes", target: "#act-lignes" },
];

export default function HomePage() {
  const [corridor, setCorridor] = useState<CorridorId>("yiwu_sea");
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isCompactViewport, setIsCompactViewport] = useState(false);
  const [parcelsPerMonth, setParcelsPerMonth] = useState<number>(650);
  const [messagesPerParcel, setMessagesPerParcel] = useState<number>(4);
  const [activeTelemetryIdx, setActiveTelemetryIdx] = useState<number>(0);
  const [hideFloatingRoute, setHideFloatingRoute] = useState<boolean>(false);

  const quayVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeCorridor = CORRIDORS[corridor];
  const currentStep = BATCH_STEPS[activeStepIndex] ?? BATCH_STEPS[0];

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const syncViewport = () => setIsCompactViewport(mq.matches);
    syncViewport();
    mq.addEventListener("change", syncViewport);
    return () => mq.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    const v = quayVideoRef.current;
    if (!v) return;
    const targetSrc = isCompactViewport ? "/media/v2-quay-m.mp4" : "/media/v2-quay.mp4";
    if (v.getAttribute("data-tc-src") === targetSrc) return;
    v.setAttribute("data-tc-src", targetSrc);
    v.src = targetSrc;
    v.load();
  }, [isCompactViewport]);

  // Synchronized route telemetry observer + Peak scrub step tracking
  useEffect(() => {
    const sectionIds = [
      "act-ouverture",
      "act-comptoir",
      "act-quai",
      "portail-live",
      "act-lignes",
      "act-tarifs",
      "act-cloture",
    ];
    let raf = 0;

    const handleScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const midY = window.innerHeight * 0.45;
        let currentIdx = 0;
        for (let i = 0; i < sectionIds.length; i++) {
          const el = document.getElementById(sectionIds[i]);
          if (!el) continue;
          const rect = el.getBoundingClientRect();
          if (rect.top <= midY && rect.bottom >= 80) {
            currentIdx = i;
          }
        }
        // Hide bottom floating pill in Act 4 Peak (#act-quai), Act 7 Pricing (#act-tarifs), and footer (#act-cloture)
        // so it never competes with the Peak dock, pricing CTAs, or closing links.
        setHideFloatingRoute(currentIdx === 2 || currentIdx >= 5);
        setActiveTelemetryIdx(Math.min(currentIdx, TELEMETRY_STOPS.length - 1));

        const quayEl = document.getElementById("act-quai");
        if (quayEl) {
          const rawP = getComputedStyle(quayEl).getPropertyValue("--sc-p").trim();
          const p = parseFloat(rawP);
          if (!Number.isNaN(p) && p > 0) {
            const idx = Math.min(BATCH_STEPS.length - 1, Math.floor(p * BATCH_STEPS.length));
            setActiveStepIndex((prev) => (prev === idx ? prev : idx));
          }
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const roiStats = useMemo(() => {
    const avoidedMessages = parcelsPerMonth * messagesPerParcel;
    const hoursSaved = Math.round((avoidedMessages * 1.4) / 60);
    const staffValueFcfa = Math.round(hoursSaved * 3200);
    return { avoidedMessages, hoursSaved, staffValueFcfa };
  }, [parcelsPerMonth, messagesPerParcel]);

  return (
    <div id="tc-showcase-root" className="min-h-screen bg-[#f7f6f2] text-[#0d131d]">
      <ScrollCraftRunner rootId="tc-showcase-root" />
      <div data-sc-progress aria-hidden="true" />
      <div className="sc-grain" aria-hidden="true" />

      <Navbar activeCorridorLabel={activeCorridor.label} />

      <main>
        {/* =================================================================
            ACTE 1 — Ouverture 3D cinématique (flow, 100svh, max 4 éléments)
           ================================================================= */}
        <section
          id="act-ouverture"
          data-sc-act="flow"
          className="sc-act tc-daylight-band relative min-h-[calc(100svh-4.5rem)] flex items-center pt-5 pb-8 sm:pt-8 sm:pb-12 overflow-hidden"
        >
          {/* Plan arrière : port d'Abidjan en plein jour + parallax doux */}
          <div className="tc-hero-plane z-0" data-sc-parallax="-0.12" aria-hidden="true">
            <picture className="block w-full h-full">
              <source media="(max-width: 860px)" srcSet="/media/v2-hero-day-m.webp" />
              <img
                src="/media/v2-hero-day.webp"
                alt=""
                className="w-full h-full object-cover object-center opacity-70 sm:opacity-85"
              />
            </picture>
          </div>

          {/* Voile ivoire directionnel sur la colonne de texte */}
          <div className="tc-day-scrim" aria-hidden="true" />
          <div className="tc-day-floor" aria-hidden="true" />

          <div className="sc-wrap relative z-20 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
              {/* Colonne gauche : 4 éléments stricts, zéro pilule eyebrow */}
              <div className="lg:col-span-6 space-y-3.5 sm:space-y-5">
                <h1 className="sc-display sc-display--xl tc-hero-title text-[#0d131d] tracking-tight">
                  Vos clients suivent leur colis sans appeler le comptoir.
                </h1>

                <p className="text-[14.5px] sm:text-[17px] leading-[1.55] text-[#243247] max-w-[48ch]">
                  Un code TC par carton, des alertes WhatsApp en un geste et un lien Wave ou Orange
                  Money prêt dès que le lot arrive à Vridi.
                </p>

                {/* Sélecteur de corridor synchronisé au modèle 3D */}
                <div className="space-y-2 pt-0.5">
                  <div
                    role="group"
                    aria-label="Choisir une ligne logistique"
                    className="inline-flex flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full bg-white/95 p-1 border border-[#0d131d]/12 shadow-sm"
                  >
                    {(Object.keys(CORRIDORS) as CorridorId[]).map((id) => {
                      const active = corridor === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setCorridor(id)}
                          aria-pressed={active}
                          className={`rounded-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-[11.5px] sm:text-[13px] font-semibold transition-all cursor-pointer ${
                            active
                              ? "bg-[#0d1522] text-white shadow-sm"
                              : "text-[#334155] hover:text-[#0d131d] hover:bg-[#f1efe8]"
                          }`}
                        >
                          {CORRIDORS[id].label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11.5px] sm:text-[12.5px] font-mono text-[#334155] pl-1">
                    {activeCorridor.unitName} · {activeCorridor.eta}
                  </p>
                </div>

                {/* Actions principales */}
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 pt-0.5">
                  <Link href="/register" className="tc-btn-primary">
                    Essayer 14 jours gratuits
                  </Link>
                  <a href="#portail-live" className="tc-btn-ghost">
                    Tester le suivi client
                  </a>
                </div>
              </div>

              {/* Colonne droite : Scène WebGL PBR sans socle artificiel ni badges superposés */}
              <div className="lg:col-span-6 relative">
                <div className="relative h-[200px] sm:h-[340px] lg:h-[520px] w-full">
                  <ContainerStage3D
                    corridor={corridor}
                    activeStep={currentStep.id}
                    className="w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            ACTE 2 — Ce qui change au comptoir (pin 1.65vh + Carton 3D PBR)
           ================================================================= */}
        <section
          id="act-comptoir"
          data-sc-act="pin"
          data-sc-span="1.65"
          className="sc-act tc-daylight-band"
        >
          <div className="sc-stage tc-stage-below-nav bg-[#f7f6f2] flex items-start pt-4 sm:items-center sm:pt-0">
            <div className="sc-wrap w-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5 lg:gap-12 items-center">
                <div className="lg:col-span-6 space-y-2.5 sm:space-y-5">
                  <h2 className="sc-display sc-display--lg tc-act2-title text-[#0d131d]">
                    Fini les captures Wave perdues et les appels à 22 heures.
                  </h2>

                  <p className="hidden sm:block text-[16px] leading-[1.6] text-[#475569] max-w-[48ch]">
                    Chaque carton pesé en Chine ou à Dubaï garde sa fiche claire jusqu&apos;à la
                    remise au comptoir à Abidjan.
                  </p>

                  {/* Comparatif épuré sans encadrés lourds */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 pt-2 border-t border-[#0d131d]/12">
                    <div className="space-y-1">
                      <p className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.08em] text-[#525e70]">
                        Avant, sur papier et groupes
                      </p>
                      <p className="text-[12.5px] sm:text-[13.5px] text-[#475569] leading-[1.45] sm:leading-[1.55]">
                        Les clients demandent chaque jour où est le bateau, et les reçus Mobile
                        Money se mélangent dans WhatsApp.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.08em] text-[#c9410e]">
                        Avec TrackCargo CI
                      </p>
                      <p className="text-[12.5px] sm:text-[13.5px] text-[#0d131d] font-medium leading-[1.45] sm:leading-[1.55]">
                        Une mise à jour sur le lot prévient quarante clients avec leur code TC et
                        leur solde prêt à régler.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scène 3D macro : carton TC-8841 cerclé sur palette bois */}
                <div className="lg:col-span-6">
                  <div className="relative h-[165px] sm:h-[260px] lg:h-[450px] w-full">
                    <ParcelShowcase3D className="w-full h-full" />
                  </div>
                  <p className="hidden sm:block text-center text-[12px] font-mono text-[#525e70] mt-2">
                    Colis TC-8841 · 14,5 kg · Étiquette et cerclage synchronisés au défilement
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            ACTE 3 — Respiration silencieuse : Entrepôt de Treichville (reveal up)
           ================================================================= */}
        <section
          id="act-entrepot"
          data-sc-act="flow"
          className="sc-act tc-daylight-band py-8 sm:py-14"
        >
          <div className="sc-wrap">
            <figure
              data-sc-reveal="up"
              data-sc-reveal-at="0.06 0.62"
              className="overflow-hidden rounded-[20px] bg-[#eeebe3] shadow-[0_24px_60px_-20px_rgba(13,21,34,0.16)]"
            >
              <img
                src="/media/v2-warehouse-day.webp"
                alt="Baie de pesée et palettes rangées dans l'entrepôt clair de Treichville"
                className="w-full h-[34svh] sm:h-[48svh] lg:h-[54svh] object-cover object-center block"
              />
            </figure>
            <p className="mt-3.5 text-center text-[14px] sm:text-[15px] text-[#525e70] max-w-[54ch] mx-auto">
              À Treichville, chaque carton pesé reçoit son code TC et son avis de retrait dès son
              entrée en rayon.
            </p>
          </div>
        </section>

        {/* =================================================================
            ACTE 4 — LE PIC : Quai de Vridi & Lot de 42 colis (scrub 2.75vh)
           ================================================================= */}
        <section
          id="act-quai"
          data-sc-act="scrub"
          data-sc-span="2.75"
          data-sc-dwell="0.34"
          className="sc-act tc-slate-band"
        >
          <div className="sc-stage tc-stage-below-nav bg-[#0d1522] overflow-hidden">
            <img
              src={isCompactViewport ? "/media/v2-quay-poster-p.webp" : "/media/v2-quay-poster.webp"}
              alt="Terminal à conteneurs du port d'Abidjan en plein jour"
              className="sc-stage__poster"
            />
            <video
              ref={quayVideoRef}
              data-sc-scrub
              muted
              playsInline
              preload="none"
              poster={isCompactViewport ? "/media/v2-quay-poster-p.webp" : "/media/v2-quay-poster.webp"}
              className="w-full h-full object-cover object-center"
            />

            {/* Voile sombre uniquement en bas pour laisser ~70% du quai au soleil */}
            <div className="tc-slate-scrim" aria-hidden="true" />

            {/* Lecture discrète en haut à gauche */}
            <div className="absolute top-4 left-4 sm:top-6 sm:left-8 z-20 flex items-center gap-2.5 rounded-full bg-[#0d1522]/80 backdrop-blur-md px-3.5 py-1.5 border border-white/15">
              <span className="h-2 w-2 rounded-full bg-[#f0642d]" aria-hidden="true" />
              <span
                data-sc-verify-state={currentStep.id}
                className="text-[11.5px] sm:text-[12px] font-mono text-white/95"
              >
                {currentStep.locationLine}
              </span>
            </div>

            {/* Dock verre dépoli compact centré en bas (sans cap 46rem) */}
            <div className="absolute z-20 bottom-3 sm:bottom-6 inset-x-0 px-4 sm:px-8">
              <div className="max-w-4xl mx-auto rounded-[18px] bg-[#0d1522]/88 backdrop-blur-xl border border-white/14 p-3.5 sm:p-5 shadow-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#cbd5e1]">
                      Lot #CG-402 · 42 colis groupés
                    </p>
                    <h2 className="text-[16px] sm:text-[20px] font-semibold text-white tracking-tight">
                      Un clic met à jour tout le conteneur à la fois
                    </h2>
                  </div>

                  {/* Tracé SVG d'itinéraire synchronisé */}
                  <div className="hidden md:flex items-center gap-3 min-w-[230px]">
                    <span className="text-[11px] font-mono text-[#cbd5e1]">Yiwu</span>
                    <svg viewBox="0 0 180 24" className="w-36 h-6 overflow-visible" aria-hidden="true">
                      <path
                        d="M 6 18 Q 90 2 174 18"
                        fill="none"
                        stroke="rgba(255,255,255,0.22)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 6 18 Q 90 2 174 18"
                        fill="none"
                        stroke="#f0642d"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        pathLength="100"
                        strokeDasharray="100"
                        strokeDashoffset={100 - currentStep.progressPct}
                      />
                      <circle
                        cx={6 + (168 * currentStep.progressPct) / 100}
                        cy={18 - Math.sin((currentStep.progressPct / 100) * Math.PI) * 8}
                        r="4"
                        fill="#ffffff"
                      />
                    </svg>
                    <span className="text-[11px] font-mono text-white font-semibold">Vridi</span>
                  </div>
                </div>

                {/* 4 boutons d'étapes interactives */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {BATCH_STEPS.map((step, idx) => {
                    const selected = idx === activeStepIndex;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => setActiveStepIndex(idx)}
                        className={`rounded-full px-3 py-2 text-left text-[12px] font-semibold transition-all cursor-pointer truncate ${
                          selected
                            ? "bg-[#c9410e] text-white shadow-sm"
                            : "bg-white/10 text-[#e2e8f0] hover:bg-white/18"
                        }`}
                      >
                        {step.buttonLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Aperçu WhatsApp & Wave en langage simple */}
                <div className="rounded-[12px] bg-white/8 border border-white/10 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-[12.5px] sm:text-[13px] text-[#f1f5f9] leading-[1.45]">
                    {currentStep.whatsappSample}
                  </p>
                  <span className="shrink-0 text-[11px] font-mono text-[#fde68a]">
                    {currentStep.waveState}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            ACTE 5 — Banc d'essai client en direct (/api/track)
           ================================================================= */}
        <section
          id="portail-live"
          aria-label="Portail client public testable"
          data-sc-act="flow"
          className="sc-act tc-daylight-band scroll-mt-20 py-12 sm:py-16"
        >
          <div className="sc-wrap max-w-5xl">
            <div data-sc-in="up" className="max-w-2xl mb-8 sm:mb-10 space-y-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[#c9410e]">
                Démonstration en direct
              </p>
              <h2 className="sc-display sc-display--lg text-[#0d131d]">
                Essayez le suivi exact que voit votre client.
              </h2>
              <p className="text-[15.5px] text-[#475569] leading-[1.6]">
                Cliquez sur l&apos;un des numéros ci-dessous pour consulter la position du lot, le
                poids du carton et le bouton de paiement Wave ou Orange Money.
              </p>
            </div>

            <div data-sc-in="up">
              <TrackingLookup initialQuery="TC-8841" compact />
            </div>
          </div>
        </section>

        {/* =================================================================
            ACTE 6 — Les quatre lignes logistiques (pan horizontal 1.85vh)
           ================================================================= */}
        <section
          id="act-lignes"
          data-sc-act="pan"
          data-sc-span="1.85"
          className="sc-act tc-slate-band"
        >
          <div className="sc-stage tc-stage-below-nav bg-[#0d1522] overflow-hidden">
            <div className="tc-rail-track" data-sc-pan="0.04">
              <div className="tc-rail-lead">
                <h2 className="sc-display sc-display--lg text-white mb-4">
                  Un seul outil pour vos quatre lignes d&apos;activité.
                </h2>
                <p className="text-[15px] text-[#cbd5e1] leading-[1.6] max-w-[34ch]">
                  Faites défiler pour voir comment votre équipe suit chaque trajet de la Chine ou
                  de la Turquie jusqu&apos;à la remise au client.
                </p>
              </div>

              {CORRIDOR_CARDS.map((card, idx) => (
                <article
                  key={card.city}
                  data-sc-tilt="4"
                  className="tc-lane-card"
                  style={
                    idx > 0
                      ? {
                          opacity: "clamp(0.68, calc(0.58 + var(--sc-p, 1) * 0.75), 1)",
                        }
                      : undefined
                  }
                >
                  <div className="h-48 sm:h-56 w-full overflow-hidden bg-[#142033]">
                    <img
                      src={card.image}
                      alt={card.alt}
                      className="w-full h-full object-cover object-center block"
                    />
                  </div>
                  <div className="p-5 sm:p-6 flex flex-col justify-between flex-1 gap-4">
                    <div className="space-y-2">
                      <p className="text-[12px] font-mono text-[#cbd5e1]">
                        {card.timing} · {card.billing}
                      </p>
                      <h3 className="text-[20px] font-bold text-white tracking-tight">
                        {card.city}
                      </h3>
                      <p className="text-[14px] text-[#cbd5e1] leading-[1.55]">{card.detail}</p>
                    </div>
                  </div>
                </article>
              ))}

              <div className="tc-rail-end">
                <div className="space-y-3">
                  <p className="text-[12px] font-mono uppercase tracking-[0.08em] text-white/90">
                    Prêt pour votre agence
                  </p>
                  <h3 className="text-[24px] font-bold text-white leading-[1.15]">
                    Configurez vos propres lignes en cinq minutes.
                  </h3>
                  <p className="text-[14px] text-white/90 leading-[1.55]">
                    Votre lien personnalisé s&apos;adapte automatiquement à vos tarifs au kilo et au
                    mètre cube.
                  </p>
                </div>
                <div className="pt-4">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-full bg-white text-[#0d131d] font-bold text-[14px] px-5 py-3 hover:bg-[#f7f6f2] transition"
                  >
                    Créer mon agence
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            ACTE 7 — Simulateur, Tarifs FCFA, FAQ & Clôture sobre (flow)
           ================================================================= */}
        <section id="act-tarifs" data-sc-act="flow" className="sc-act tc-daylight-band">
          {/* Simulateur de temps libéré */}
          <div className="pt-10 pb-10 sm:pt-14 sm:pb-12">
            <div className="sc-wrap max-w-5xl">
              <div
                data-sc-in="up"
                className="rounded-[20px] bg-white border border-[#0d131d]/10 p-5 sm:p-8 shadow-[0_14px_34px_-14px_rgba(13,21,34,0.1)] grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center"
              >
                <div className="lg:col-span-6 space-y-5">
                  <h2 className="sc-display sc-display--lg text-[#0d131d]">
                    Combien d&apos;heures gagnez-vous chaque mois ?
                  </h2>
                  <p className="text-[15px] text-[#475569] leading-[1.6]">
                    Ajustez le volume de colis traités par votre comptoir pour estimer les appels
                    évités dès la mise en ligne du lien de suivi.
                  </p>

                  <div className="space-y-4 pt-2">
                    <div>
                      <div className="flex justify-between text-[13.5px] font-semibold mb-1.5">
                        <label htmlFor="calc-parcels">Colis traités par mois</label>
                        <span className="font-mono text-[#c9410e]">{parcelsPerMonth} colis</span>
                      </div>
                      <input
                        id="calc-parcels"
                        type="range"
                        min={100}
                        max={3000}
                        step={50}
                        value={parcelsPerMonth}
                        onChange={(e) => setParcelsPerMonth(Number(e.target.value))}
                        className="w-full accent-[#c9410e] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[13.5px] font-semibold mb-1.5">
                        <label htmlFor="calc-messages">Relances WhatsApp par colis</label>
                        <span className="font-mono text-[#c9410e]">
                          {messagesPerParcel} échanges
                        </span>
                      </div>
                      <input
                        id="calc-messages"
                        type="range"
                        min={2}
                        max={8}
                        step={1}
                        value={messagesPerParcel}
                        onChange={(e) => setMessagesPerParcel(Number(e.target.value))}
                        className="w-full accent-[#c9410e] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-6 rounded-[16px] bg-[#f7f6f2] border border-[#0d131d]/10 p-6 sm:p-8 space-y-4">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#525e70]">
                    Estimation mensuelle pour votre équipe
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[28px] sm:text-[34px] font-bold text-[#0d131d] font-mono">
                        {roiStats.hoursSaved} h
                      </p>
                      <p className="text-[13px] text-[#475569]">libérées au comptoir</p>
                    </div>
                    <div>
                      <p className="text-[28px] sm:text-[34px] font-bold text-[#c9410e] font-mono">
                        {roiStats.avoidedMessages.toLocaleString("fr-FR")}
                      </p>
                      <p className="text-[13px] text-[#475569]">messages évités</p>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-[#0d131d]/10 flex items-center justify-between gap-4">
                    <span className="text-[13.5px] text-[#475569]">
                      Temps équipe économisé estimé
                    </span>
                    <span className="text-[18px] font-bold text-[#0d131d] font-mono">
                      {formatFcfa(roiStats.staffValueFcfa)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tarifs clairs FCFA */}
          <div id="tarifs" className="scroll-mt-24 pb-10 sm:pb-14">
            <div className="sc-wrap max-w-5xl">
              <div data-sc-in="up" className="max-w-2xl mb-7 space-y-2">
                <h2 className="sc-display sc-display--lg text-[#0d131d]">
                  Des tarifs fixes en FCFA, sans commission sur vos encaissements.
                </h2>
                <p className="text-[15.5px] text-[#475569]">
                  Chaque forfait démarre avec 14 jours d&apos;essai complet sans engagement.
                </p>
              </div>

              <div data-sc-in="" data-sc-stagger="80" className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {PLANS.map((plan) => (
                  <div
                    key={plan.name}
                    className={`rounded-[18px] p-6 sm:p-7 flex flex-col justify-between gap-6 ${
                      plan.featured
                        ? "bg-[#0d1522] text-white shadow-[0_24px_54px_-16px_rgba(13,21,34,0.28)]"
                        : "bg-white text-[#0d131d] border border-[#0d131d]/10 shadow-sm"
                    }`}
                  >
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-[19px] font-bold tracking-tight">{plan.name}</h3>
                        <p
                          className={`mt-1 text-[13.5px] leading-[1.5] ${
                            plan.featured ? "text-[#cbd5e1]" : "text-[#475569]"
                          }`}
                        >
                          {plan.description}
                        </p>
                      </div>

                      <p className="text-[30px] font-bold font-mono tracking-tight">
                        {plan.price.toLocaleString("fr-FR")}{" "}
                        <span className="text-[14px] font-sans font-medium opacity-80">
                          FCFA / mois
                        </span>
                      </p>

                      <ul className="space-y-2.5 text-[13.5px]">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2.5">
                            <span
                              className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                                plan.featured ? "bg-[#f0642d]" : "bg-[#c9410e]"
                              }`}
                              aria-hidden="true"
                            />
                            <span className={plan.featured ? "text-[#e2e8f0]" : "text-[#334155]"}>
                              {feat}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Link
                      href={`/register?plan=${plan.tier}`}
                      className={plan.featured ? "tc-btn-primary w-full" : "tc-btn-cobalt w-full"}
                    >
                      Essayer 14 jours gratuits
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Questions directes */}
          <div className="pb-10 sm:pb-14">
            <div data-sc-in="up" className="sc-wrap max-w-4xl">
              <h2 className="text-[22px] sm:text-[28px] font-bold text-[#0d131d] mb-5 tracking-tight">
                Questions fréquentes
              </h2>
              <div className="divide-y divide-[#0d131d]/12 border-y border-[#0d131d]/12">
                {FAQS.map((item) => (
                  <details key={item.q} className="group py-3.5 sm:py-4">
                    <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-[15px] sm:text-[16px] font-semibold text-[#0d131d]">
                      <span>{item.q}</span>
                      <span className="text-[#c9410e] font-mono text-[18px] group-open:rotate-45 transition-transform">
                        +
                      </span>
                    </summary>
                    <p className="mt-2 text-[14px] text-[#475569] leading-[1.6] max-w-[66ch]">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>

        </section>

        {/* Clôture architecturale ardoise sobre + pied de page */}
        <section id="act-cloture" className="tc-slate-band py-12 sm:py-16">
          <div data-sc-in="up" className="sc-wrap max-w-4xl text-center space-y-5">
            <h2 className="sc-display sc-display--xl text-white">
              Ouvrez votre lien client sur le prochain arrivage.
            </h2>
            <p className="text-[15.5px] sm:text-[17.5px] text-[#cbd5e1] max-w-[50ch] mx-auto leading-[1.6]">
              Créez votre agence en quelques minutes, importez vos premiers codes TC et partagez
              le lien à vos clients dès aujourd&apos;hui.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <Link href="/register" className="tc-btn-primary">
                Essayer 14 jours gratuits
              </Link>
              <Link href="/login" className="tc-btn-ghost">
                Connexion agence
              </Link>
            </div>
          </div>

          <footer className="sc-wrap max-w-5xl mt-12 pt-7 border-t border-white/12 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[#cbd5e1]">
            <p>TrackCargo CI · Logiciel de suivi fret pour transitaires en Côte d&apos;Ivoire</p>
            <div className="flex items-center gap-5">
              <Link href="/track" className="hover:text-white transition">
                Portail colis
              </Link>
              <Link href="/register" className="hover:text-white transition">
                Ouvrir une agence
              </Link>
              <Link href="/login" className="hover:text-white transition">
                Espace agence
              </Link>
            </div>
          </footer>
        </section>
      </main>

      {/* Signature Move : Fil d'acheminement synchronisé (desktop xl+ hors Peak et Clôture) */}
      <nav
        aria-label="Fil d'acheminement de la page"
        className={`hidden xl:flex fixed bottom-4 left-1/2 -translate-x-1/2 z-40 items-center gap-1 rounded-full bg-[#0d1522]/88 backdrop-blur-md border border-white/15 px-2.5 py-1.5 text-[11.5px] text-white shadow-xl transition-opacity duration-200 ${
          hideFloatingRoute ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <span className="font-mono text-[#cbd5e1] px-2.5">{activeCorridor.origin}</span>
        {TELEMETRY_STOPS.map((stop, idx) => {
          const isCurrent = idx === activeTelemetryIdx;
          return (
            <a
              key={stop.target}
              href={stop.target}
              className={`rounded-full px-2.5 py-1 font-medium transition-colors ${
                isCurrent ? "bg-[#c9410e] text-white" : "text-[#cbd5e1] hover:text-white"
              }`}
            >
              {stop.label}
            </a>
          );
        })}
        <span className="font-mono text-[#cbd5e1] px-2.5">Abidjan</span>
      </nav>
    </div>
  );
}
