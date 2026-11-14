/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import ContainerStage3D, { type CorridorId } from "@/components/ContainerStage3D";
import Navbar from "@/components/Navbar";
import ParcelShowcase3D from "@/components/ParcelShowcase3D";
import ScrollCraftRunner from "@/components/ScrollCraftRunner";
import TrackingLookup from "@/components/TrackingLookup";
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
      "Adapté aux boutiques de prêt-à-porter et d'électronique. Vos clientes reçoivent leur code TC dès le départ puis retirent leurs sacs avec leur pass QR officiel.",
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
      "Pesée exacte à l'entrepôt en Chine, code TC attribué et solde en FCFA prêt avant même l'atterrissage à Abidjan.",
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
          className="sc-act tc-daylight-band relative min-h-[calc(100svh-4.5rem)] flex items-center pt-4 pb-6 sm:pt-8 sm:pb-12 overflow-hidden"
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
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-10 items-center">
              {/* Colonne gauche : hiérarchie éditoriale lumineuse */}
              <div className="lg:col-span-6 space-y-3 sm:space-y-5">
                <p className="inline-flex items-center gap-2 border-l-2 border-[#c9410e] pl-2.5 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-[0.12em] text-[#334155]">
                  <span>Abidjan · Groupage Maritime &amp; Aérien</span>
                </p>

                <h1 className="sc-display sc-display--xl tc-hero-title text-[#0d131d] tracking-tight">
                  Vos clients suivent leur colis sans appeler le comptoir.
                </h1>

                <p className="text-[14px] sm:text-[17px] leading-[1.58] text-[#243247] max-w-[48ch]">
                  Un code TC par carton, des alertes WhatsApp en un geste et un lien Wave ou Orange
                  Money prêt dès que le lot arrive à Vridi.
                </p>

                {/* Sélecteur de corridor synchronisé au modèle 3D */}
                <div className="space-y-2 pt-0.5">
                  <div
                    role="group"
                    aria-label="Choisir une ligne logistique"
                    className="grid grid-cols-3 sm:inline-flex items-center gap-1 rounded-[14px] sm:rounded-full bg-white/95 backdrop-blur-md p-1 border border-[#0d131d]/12 shadow-[var(--sc-e1)] w-full sm:w-auto"
                  >
                    {(Object.keys(CORRIDORS) as CorridorId[]).map((id) => {
                      const active = corridor === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setCorridor(id)}
                          aria-pressed={active}
                          className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] sm:rounded-full px-1.5 sm:px-3.5 py-2 text-[11px] sm:text-[13px] font-semibold transition-all cursor-pointer truncate text-center ${
                            active
                              ? "bg-[#0d1522] text-white shadow-sm"
                              : "text-[#334155] hover:text-[#0d131d] hover:bg-[#f1efe8]"
                          }`}
                        >
                          {active && (
                            <span
                              className="hidden sm:inline-block h-1.5 w-1.5 rounded-full bg-[#f0642d] shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <span className="truncate">{CORRIDORS[id].label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-[12px] bg-white/85 backdrop-blur-xs border border-[#0d131d]/10 px-3 py-1.5 text-[11px] sm:text-[12px] font-mono text-[#243247] shadow-2xs">
                    <span className="font-semibold text-[#0d131d]">
                      {activeCorridor.origin} → {activeCorridor.arrival}
                    </span>
                    <span className="text-[#c9410e] font-bold">·</span>
                    <span>{activeCorridor.eta}</span>
                    <span className="hidden sm:inline text-[#525e70]">
                      ({activeCorridor.rateLabel})
                    </span>
                  </div>
                </div>

                {/* Actions principales */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 pt-0.5">
                  <Link href="/register" className="tc-btn-primary w-full sm:w-auto text-center">
                    <span>Essayer 14 jours gratuits</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <a href="#portail-live" className="tc-btn-ghost w-full sm:w-auto text-center">
                    Tester le suivi client
                  </a>
                </div>
              </div>

              {/* Colonne droite : Scène WebGL PBR avec halo solaire subtil */}
              <div className="lg:col-span-6 relative">
                <div
                  className="pointer-events-none absolute inset-0 -m-4 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.68)_0%,rgba(201,65,14,0.08)_46%,transparent_72%)]"
                  aria-hidden="true"
                />
                <div className="relative h-[220px] sm:h-[340px] lg:h-[520px] w-full">
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
          <div className="sc-stage tc-stage-below-nav bg-[#f7f6f2] flex items-start pt-3 sm:items-center sm:pt-0">
            <div className="sc-wrap w-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5 lg:gap-12 items-center">
                <div className="lg:col-span-6 space-y-2.5 sm:space-y-5">
                  <p className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-[0.1em] text-[#c9410e]">
                    Le quotidien du comptoir
                  </p>
                  <h2 className="sc-display sc-display--lg tc-act2-title text-[#0d131d]">
                    Fini les captures Wave perdues et les appels à 22 heures.
                  </h2>

                  <p className="hidden sm:block text-[16px] leading-[1.6] text-[#475569] max-w-[48ch]">
                    Chaque carton pesé en Chine ou à Dubaï garde sa fiche claire jusqu&apos;à la
                    remise au comptoir à Abidjan.
                  </p>

                  {/* Comparatif sculpté Avant / Avec TrackCargo CI */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5 pt-1">
                    <div className="rounded-[14px] bg-[#eeebe3]/85 border border-[#0d131d]/10 p-3 sm:p-4 space-y-1">
                      <p className="text-[10.5px] sm:text-[11.5px] font-mono font-bold uppercase tracking-[0.08em] text-[#525e70]">
                        Avant · Papier &amp; groupes
                      </p>
                      <p className="text-[12px] sm:text-[13.5px] text-[#475569] leading-[1.45] sm:leading-[1.52]">
                        Les clients demandent chaque jour où est le bateau, et les reçus Mobile
                        Money se mélangent dans WhatsApp.
                      </p>
                    </div>
                    <div className="rounded-[14px] bg-white border border-[#c9410e]/30 border-t-2 border-t-[#c9410e] p-3 sm:p-4 space-y-1 shadow-[0_14px_32px_-14px_rgba(201,65,14,0.16)]">
                      <p className="text-[10.5px] sm:text-[11.5px] font-mono font-bold uppercase tracking-[0.08em] text-[#c9410e]">
                        Avec TrackCargo CI
                      </p>
                      <p className="text-[12px] sm:text-[13.5px] text-[#0d131d] font-medium leading-[1.45] sm:leading-[1.52]">
                        Une mise à jour sur le lot prévient quarante clients avec leur code TC et
                        leur solde prêt à régler.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scène 3D macro : carton TC-8841 cerclé sur palette bois */}
                <div className="lg:col-span-6 relative">
                  <div
                    className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.75)_0%,transparent_70%)]"
                    aria-hidden="true"
                  />
                  <div className="relative h-[155px] sm:h-[250px] lg:h-[440px] w-full">
                    <ParcelShowcase3D className="w-full h-full" />
                  </div>
                  <div className="hidden sm:flex justify-center mt-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/90 border border-[#0d131d]/10 px-3.5 py-1 text-[11.5px] font-mono text-[#334155] shadow-2xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#c9410e]" aria-hidden="true" />
                      Colis TC-8841 · 14,5 kg · Étiquette QR et cerclage synchronisés
                    </span>
                  </div>
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
          className="sc-act tc-daylight-band py-8 sm:py-16"
        >
          <div className="sc-wrap space-y-6">
            <figure
              data-sc-reveal="up"
              data-sc-reveal-at="0.06 0.62"
              className="relative overflow-hidden rounded-[24px] p-2 sm:p-3 bg-white border border-[#0d131d]/10 shadow-[0_28px_68px_-20px_rgba(13,21,34,0.18)]"
            >
              <div className="relative overflow-hidden rounded-[16px] bg-[#eeebe3]">
                <img
                  src="/media/v2-warehouse-day.webp"
                  alt="Baie de pesée et palettes rangées dans l'entrepôt clair de Treichville"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-[34svh] sm:h-[48svh] lg:h-[54svh] object-cover object-center block"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d1522]/65 via-transparent to-transparent"
                  aria-hidden="true"
                />
                <figcaption className="absolute bottom-3 left-3 right-3 sm:bottom-5 sm:left-5 sm:right-auto inline-flex items-center gap-2.5 rounded-full bg-[#0d1522]/85 backdrop-blur-md border border-white/15 px-3.5 py-1.5 text-[11.5px] sm:text-xs font-mono text-white">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Baie de réception &amp; pesée · Treichville, Abidjan</span>
                </figcaption>
              </div>
            </figure>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
              <div className="rounded-[16px] bg-white border border-[#0d131d]/10 px-4 py-3.5 shadow-2xs text-center sm:text-left">
                <div className="text-base sm:text-lg font-bold font-mono text-[#0d131d]">
                  &lt; 10 secondes
                </div>
                <p className="text-xs sm:text-[13px] text-[#525e70] mt-0.5">
                  pour peser un carton, générer son code TC et son pass QR
                </p>
              </div>
              <div className="rounded-[16px] bg-white border border-[#0d131d]/10 px-4 py-3.5 shadow-2xs text-center sm:text-left">
                <div className="text-base sm:text-lg font-bold font-mono text-[#c9410e]">
                  0 FCFA de commission
                </div>
                <p className="text-xs sm:text-[13px] text-[#525e70] mt-0.5">
                  les règlements Wave et Orange Money arrivent sur votre compte
                </p>
              </div>
              <div className="rounded-[16px] bg-white border border-[#0d131d]/10 px-4 py-3.5 shadow-2xs text-center sm:text-left">
                <div className="text-base sm:text-lg font-bold font-mono text-[#0d131d]">
                  100 % navigateur
                </div>
                <p className="text-xs sm:text-[13px] text-[#525e70] mt-0.5">
                  vos clients consultent leur colis en un clic depuis WhatsApp
                </p>
              </div>
            </div>
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
              <div className="max-w-4xl mx-auto rounded-[20px] bg-[#0d1522]/90 backdrop-blur-2xl border border-white/16 p-3.5 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_28px_64px_-12px_rgba(0,0,0,0.65)] space-y-3">
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
                            ? "bg-gradient-to-b from-[#d84812] to-[#b83809] text-white shadow-sm border border-white/20"
                            : "bg-white/10 text-[#e2e8f0] hover:bg-white/18 border border-transparent"
                        }`}
                      >
                        {step.buttonLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Aperçu WhatsApp & Wave en langage simple */}
                <div className="rounded-[12px] bg-white/10 border border-white/14 px-3 py-2 sm:px-3.5 sm:py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <p className="text-[12px] sm:text-[13px] text-[#f1f5f9] leading-[1.45]">
                    {currentStep.whatsappSample}
                  </p>
                  <span className="text-[11px] font-mono text-[#fde68a] shrink-0">
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
          className="sc-act tc-daylight-band scroll-mt-20 py-10 sm:py-16"
        >
          <div className="sc-wrap max-w-5xl">
            <div data-sc-in="up" className="max-w-2xl mb-7 sm:mb-9 space-y-3">
              <p className="text-[12px] font-mono font-bold uppercase tracking-[0.1em] text-[#c9410e]">
                Démonstration interactive en direct
              </p>
              <h2 className="sc-display sc-display--lg text-[#0d131d]">
                Essayez le suivi exact que voit votre client.
              </h2>
              <p className="text-[15px] sm:text-[15.5px] text-[#475569] leading-[1.6]">
                Cliquez sur l&apos;un des numéros ci-dessous pour consulter la position du lot, le
                pass QR de retrait et le bouton de paiement Wave ou Orange Money.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#0d131d]/10 px-3 py-1 text-[12px] font-medium text-[#334155] shadow-xs">
                  <BrandLogo brand="whatsapp" size="xs" decorative />
                  <span>Alertes WhatsApp</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#0d131d]/10 px-3 py-1 text-[12px] font-medium text-[#334155] shadow-xs">
                  <BrandLogo brand="wave" size="xs" decorative />
                  <span>Wave</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#0d131d]/10 px-3 py-1 text-[12px] font-medium text-[#334155] shadow-xs">
                  <BrandLogo brand="orange-money" size="xs" withWhiteSurface={false} decorative />
                  <span>Orange Money</span>
                </span>
              </div>
            </div>

            <div
              data-sc-in="up"
              className="rounded-[24px] bg-[#eeebe3]/85 border border-[#0d131d]/12 p-2.5 sm:p-5 shadow-[0_28px_68px_-22px_rgba(13,21,34,0.16)] space-y-3"
            >
              <div className="flex items-center justify-between gap-2 px-2 py-1 text-xs font-mono text-[#525e70]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#c9410e]/80" aria-hidden="true" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" aria-hidden="true" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" aria-hidden="true" />
                  <span className="ml-2 text-[#0d131d] font-semibold truncate">
                    trackcargo.ci/a/votre-agence
                  </span>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] text-emerald-800 border border-[#0d131d]/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" aria-hidden="true" />
                  Portail dédié par agence
                </span>
              </div>
              <TrackingLookup initialQuery="TC-8841" compact />
            </div>
          </div>
        </section>

        {/* =================================================================
            ACTE 6 — Les quatre lignes logistiques (pan desktop / empilé mobile)
           ================================================================= */}
        <div id="act-lignes" className="tc-slate-band scroll-mt-20">
          {/* Mobile (< md) : cartes empilées lisibles sans recadrage horizontal */}
          <section data-sc-act="flow" className="md:hidden sc-act tc-slate-band py-10">
            <div className="sc-wrap space-y-5">
              <div className="space-y-2">
                <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#f0642d]">
                  Corridors internationaux
                </p>
                <h2 className="sc-display sc-display--lg text-white">
                  Un seul outil pour vos quatre lignes d&apos;activité.
                </h2>
                <p className="text-[14.5px] text-[#cbd5e1] leading-[1.55]">
                  Suivez chaque trajet de la Chine ou de la Turquie jusqu&apos;à la remise au
                  comptoir.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {CORRIDOR_CARDS.map((card, idx) => (
                  <article
                    key={card.city}
                    className="rounded-[18px] bg-[#142033] border border-white/14 overflow-hidden shadow-lg"
                  >
                    <div className="relative h-44 w-full overflow-hidden bg-[#1c2c44]">
                      <img
                        src={card.image}
                        alt={card.alt}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center block"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#142033] via-transparent to-transparent"
                        aria-hidden="true"
                      />
                      <span className="absolute top-3 left-3 rounded-full bg-[#0d1522]/80 backdrop-blur-md border border-white/15 px-2.5 py-0.5 text-[11px] font-mono text-white">
                        0{idx + 1}
                      </span>
                      <span className="absolute top-3 right-3 rounded-full bg-[#0d1522]/80 backdrop-blur-md border border-white/15 px-2.5 py-0.5 text-[11px] font-mono text-[#fde68a]">
                        {card.timing}
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      <p className="text-[11.5px] font-mono text-[#9eb0c9] uppercase tracking-wider">
                        {card.billing}
                      </p>
                      <h3 className="text-[18px] font-bold text-white tracking-tight">
                        {card.city}
                      </h3>
                      <p className="text-[13.5px] text-[#cbd5e1] leading-[1.5]">
                        {card.detail}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <div className="rounded-[18px] bg-gradient-to-br from-[#d84812] to-[#b13507] border border-white/22 p-5 text-white space-y-3 shadow-lg">
                <p className="text-[11px] font-mono uppercase tracking-[0.08em] text-white/90">
                  Prêt pour votre agence
                </p>
                <h3 className="text-[20px] font-bold leading-[1.2]">
                  Configurez vos propres lignes en cinq minutes.
                </h3>
                <p className="text-[13.5px] text-white/90 leading-[1.5]">
                  Votre lien personnalisé s&apos;adapte automatiquement à vos tarifs au kilo et au
                  mètre cube.
                </p>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-[#0d131d] font-bold text-[14px] px-5 py-3 w-full hover:bg-[#f7f6f2] transition"
                >
                  <span>Créer mon agence</span>
                  <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>

          {/* Desktop (>= md) : rail horizontal ScrollCraft */}
          <section
            data-sc-act="pan"
            data-sc-span="1.85"
            className="hidden md:block sc-act tc-slate-band"
          >
            <div className="sc-stage tc-stage-below-nav bg-[#0d1522] overflow-hidden">
              <div className="tc-rail-track" data-sc-pan="0.04">
                <div className="tc-rail-lead">
                  <p className="text-xs font-mono uppercase tracking-[0.12em] text-[#f0642d] mb-2">
                    Corridors internationaux
                  </p>
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
                    className="tc-lane-card group"
                    style={
                      idx > 0
                        ? {
                            opacity: "clamp(0.68, calc(0.58 + var(--sc-p, 1) * 0.75), 1)",
                          }
                        : undefined
                    }
                  >
                    <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-[#142033]">
                      <img
                        src={card.image}
                        alt={card.alt}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover object-center block group-hover:scale-105 transition-transform duration-500"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#16243a] via-transparent to-transparent"
                        aria-hidden="true"
                      />
                      <span className="absolute top-3.5 left-3.5 rounded-full bg-[#0d1522]/80 backdrop-blur-md border border-white/15 px-2.5 py-0.5 text-[11px] font-mono text-white">
                        0{idx + 1}
                      </span>
                      <span className="absolute top-3.5 right-3.5 rounded-full bg-[#0d1522]/80 backdrop-blur-md border border-white/15 px-3 py-0.5 text-[11px] font-mono text-[#fde68a]">
                        {card.timing}
                      </span>
                    </div>
                    <div className="p-5 sm:p-6 flex flex-col justify-between flex-1 gap-4">
                      <div className="space-y-2">
                        <p className="text-[11.5px] font-mono uppercase tracking-wider text-[#9eb0c9]">
                          {card.billing}
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
                      Votre lien personnalisé s&apos;adapte automatiquement à vos tarifs au kilo et
                      au mètre cube.
                    </p>
                  </div>
                  <div className="pt-4">
                    <Link
                      href="/register"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-[#0d131d] font-bold text-[14px] px-5 py-3 hover:bg-[#f7f6f2] transition shadow-md"
                    >
                      <span>Créer mon agence</span>
                      <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* =================================================================
            ACTE 7 — Tarifs FCFA, FAQ & Clôture sobre (flow)
           ================================================================= */}
        <section id="act-tarifs" data-sc-act="flow" className="sc-act tc-daylight-band">
          {/* Tarifs clairs FCFA */}
          <div id="tarifs" className="scroll-mt-24 pt-12 sm:pt-16 pb-10 sm:pb-14">
            <div className="sc-wrap max-w-5xl">
              <div data-sc-in="up" className="max-w-2xl mb-8 space-y-2.5">
                <p className="text-xs font-mono font-bold uppercase tracking-[0.1em] text-[#c9410e]">
                  Abonnements transparents
                </p>
                <h2 className="sc-display sc-display--lg text-[#0d131d]">
                  Des tarifs fixes en FCFA, sans commission sur vos encaissements.
                </h2>
                <p className="text-[15px] sm:text-[15.5px] text-[#475569]">
                  Chaque forfait démarre avec 14 jours d&apos;essai complet sans engagement.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center rounded-full bg-white border border-[#0d131d]/10 px-3 py-1 text-[12px] font-medium text-[#334155]">
                    Wave direct
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white border border-[#0d131d]/10 px-3 py-1 text-[12px] font-medium text-[#334155]">
                    Orange Money
                  </span>
                  <span className="inline-flex items-center rounded-full bg-white border border-[#0d131d]/10 px-3 py-1 text-[12px] font-medium text-[#334155]">
                    Notifications WhatsApp
                  </span>
                </div>
              </div>

              <div data-sc-in="" data-sc-stagger="80" className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
                {PLANS.map((plan) => (
                  <div
                    key={plan.name}
                    className={`relative rounded-[20px] p-6 sm:p-7 flex flex-col justify-between gap-6 transition-transform duration-200 ${
                      plan.featured
                        ? "bg-gradient-to-b from-[#162540] to-[#0d1522] text-white border border-white/15 shadow-[0_28px_60px_-16px_rgba(13,21,34,0.34)] md:-translate-y-1.5"
                        : "bg-white text-[#0d131d] border border-[#0d131d]/12 shadow-[var(--sc-e1)]"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {plan.featured && (
                          <span className="inline-flex items-center rounded-full bg-[#c9410e] text-white text-[11px] font-mono font-bold uppercase tracking-[0.06em] px-3 py-0.5">
                            Le plus choisi à Abidjan
                          </span>
                        )}
                        <h3 className="text-[20px] font-bold tracking-tight">{plan.name}</h3>
                        <p
                          className={`mt-1 text-[13.5px] leading-[1.5] ${
                            plan.featured ? "text-[#cbd5e1]" : "text-[#475569]"
                          }`}
                        >
                          {plan.description}
                        </p>
                      </div>

                      <div className="pt-1 pb-2 border-b border-current/10">
                        <p className="text-[30px] font-bold font-mono tracking-tight">
                          {plan.price.toLocaleString("fr-FR")}{" "}
                          <span className="text-[14px] font-sans font-medium opacity-80">
                            FCFA / mois
                          </span>
                        </p>
                      </div>

                      <ul className="space-y-2.5 text-[13.5px]">
                        {plan.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2.5">
                            <span
                              className={`mt-0.5 h-4 w-4 rounded-full inline-flex items-center justify-center shrink-0 ${
                                plan.featured
                                  ? "bg-[#f0642d]/20 text-[#ff966b]"
                                  : "bg-[#fff4ee] text-[#c9410e]"
                              }`}
                              aria-hidden="true"
                            >
                              <Check className="w-3 h-3" />
                            </span>
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
                      <span>Essayer 14 jours gratuits</span>
                      <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Questions directes sous forme de cartes sculptées */}
          <div className="pb-12 sm:pb-16">
            <div data-sc-in="up" className="sc-wrap max-w-4xl">
              <h2 className="text-[22px] sm:text-[28px] font-bold text-[#0d131d] mb-5 tracking-tight">
                Questions fréquentes
              </h2>
              <div className="space-y-3">
                {FAQS.map((item) => (
                  <details
                    key={item.q}
                    className="group rounded-[16px] bg-white border border-[#0d131d]/10 px-5 py-4 shadow-2xs open:border-[#c9410e]/35 open:shadow-md transition-all"
                  >
                    <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-[15px] sm:text-[16px] font-semibold text-[#0d131d]">
                      <span>{item.q}</span>
                      <span className="h-7 w-7 rounded-full bg-[#f7f6f2] text-[#c9410e] font-mono text-[18px] inline-flex items-center justify-center shrink-0 group-open:rotate-45 group-open:bg-[#fff4ee] transition-transform">
                        +
                      </span>
                    </summary>
                    <p className="mt-2.5 text-[14px] text-[#475569] leading-[1.6] max-w-[66ch]">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Clôture architecturale ardoise sobre + pied de page */}
        <section
          id="act-cloture"
          className="tc-slate-band relative overflow-hidden py-14 sm:py-20"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(240,100,45,0.18)_0%,transparent_62%)]"
            aria-hidden="true"
          />
          <div data-sc-in="up" className="sc-wrap relative z-10 max-w-4xl text-center space-y-5">
            <p className="text-xs font-mono uppercase tracking-[0.12em] text-[#ff966b]">
              Démarrage immédiat · Sans carte bancaire
            </p>
            <h2 className="sc-display sc-display--xl text-white">
              Ouvrez votre lien client sur le prochain arrivage.
            </h2>
            <p className="text-[15.5px] sm:text-[17.5px] text-[#cbd5e1] max-w-[50ch] mx-auto leading-[1.6]">
              Créez votre agence en quelques minutes, importez vos premiers codes TC et partagez
              le lien à vos clients dès aujourd&apos;hui.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-2.5 sm:gap-3 pt-2">
              <Link href="/register" className="tc-btn-primary w-full sm:w-auto">
                <span>Essayer 14 jours gratuits</span>
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link href="/login" className="tc-btn-ghost w-full sm:w-auto">
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
