/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check, MapPin, Plane, Ship } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import ContainerStage3D, { type CorridorId } from "@/components/ContainerStage3D";
import GlobeStage3D from "@/components/GlobeStage3D";
import Navbar from "@/components/Navbar";
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
  },
  canton_air: {
    id: "canton_air",
    label: "Canton · Aérien",
    unitName: "Unité ULD AKE · Aluminium aéronautique",
    origin: "Guangzhou Baiyun",
    arrival: "Fret FHB, Abidjan",
    eta: "5 à 8 jours",
    rateLabel: "Au kilogramme",
  },
  istanbul_dubai: {
    id: "istanbul_dubai",
    label: "Istanbul & Dubaï",
    unitName: "Caisse export cerclée · Négoce",
    origin: "Laleli & Deira",
    arrival: "Comptoir Treichville",
    eta: "6 à 12 jours",
    rateLabel: "Colis et valeur",
  },
};

type BatchStep = {
  id: "RECUE_ORIGINE" | "EN_TRANSIT" | "ARRIVEE_ABIDJAN" | "PRET_RETRAIT";
  code: string;
  buttonLabel: string;
  progressPct: number;
  videoFraction: number;
  locationLine: string;
  whatsappSample: string;
  waveState: string;
};

const BATCH_STEPS: BatchStep[] = [
  {
    id: "RECUE_ORIGINE",
    code: "01",
    buttonLabel: "Embarquement & Pesée",
    progressPct: 18,
    videoFraction: 0.1,
    locationLine: "Guangzhou & Yiwu · 42 colis pesés et scellés",
    whatsappSample:
      "Bonjour Aminata, votre colis TC-8841 (14,5 kg) est bien enregistré au départ. Suivez son trajet en direct sans appeler le comptoir.",
    waveState: "Montant fixé à 48 000 FCFA · Lien prêt dès le départ",
  },
  {
    id: "EN_TRANSIT",
    code: "02",
    buttonLabel: "Traversée Air & Mer",
    progressPct: 52,
    videoFraction: 0.38,
    locationLine: "Lot #CG-402 · En transit direct vers Abidjan",
    whatsappSample:
      "Le lot #CG-402 qui contient votre colis TC-8841 est en route vers Abidjan. Arrivée estimée dans 9 jours.",
    waveState: "Prépaiement Wave ou Orange Money ouvert 24h/24",
  },
  {
    id: "ARRIVEE_ABIDJAN",
    code: "03",
    buttonLabel: "Accostage Quai de Vridi",
    progressPct: 82,
    videoFraction: 0.66,
    locationLine: "Port de Vridi · Déchargement sous portique",
    whatsappSample:
      "Bonne nouvelle, le lot #CG-402 vient d'accoster au terminal de Vridi. Vous serez alertée dès l'ouverture du retrait.",
    waveState: "42 invitations de règlement générées automatiquement",
  },
  {
    id: "PRET_RETRAIT",
    code: "04",
    buttonLabel: "Disponible à Abidjan",
    progressPct: 100,
    videoFraction: 0.92,
    locationLine: "Treichville · Prêt contre code TC ou Pass QR",
    whatsappSample:
      "Votre colis TC-8841 est disponible au comptoir de Treichville. Réglez les 48 000 FCFA par Wave ou Orange Money et présentez votre QR.",
    waveState: "Bon de sortie délivré dès confirmation du règlement",
  },
];

const CORRIDOR_CARDS = [
  {
    city: "Guangzhou · Aérien",
    timing: "5 à 8 jours",
    billing: "Au kilogramme",
    detail:
      "Pesée exacte à l'entrepôt en Chine, code TC attribué et solde en FCFA prêt avant même l'atterrissage à l'aéroport FHB d'Abidjan.",
    image: "/media/v5-air-horizon.webp",
    alt: "Cargo aérien survolant la courbure lumineuse du globe entre Guangzhou et Abidjan",
  },
  {
    city: "Yiwu · Maritime",
    timing: "42 à 50 jours",
    billing: "CBM et carton",
    detail:
      "Un seul changement sur le lot met à jour quarante clients ensemble au moment où le porte-conteneurs quitte Ningbo puis accoste à Vridi.",
    image: "/media/v5-ship-constellation.webp",
    alt: "Porte-conteneurs en haute mer relié aux arcs lumineux de la carte mondiale vers Abidjan",
  },
  {
    city: "Istanbul & Dubaï",
    timing: "6 à 12 jours",
    billing: "Sac et valeur",
    detail:
      "Chaque commande est associée au numéro WhatsApp de la cliente pour éviter les erreurs de sacs et de colis à la remise.",
    image: "/media/v5-drone-corridor.webp",
    alt: "Vue aérienne d'un avion cargo survolant un canal portuaire bordé de conteneurs",
  },
  {
    city: "Terminal & Comptoir Abidjan",
    timing: "Retrait rapide",
    billing: "Pass QR & Mobile Money",
    detail:
      "Votre équipe saisit le code TC ou scanne le QR client dès le dépotage, vérifie le solde exact et imprime le bon de sortie.",
    image: "/media/v5-yard-tropical.webp",
    alt: "Conteneurs maritimes multicolores alignés sous un grand ciel bleu tropical au terminal",
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
    a: "Non. Ils cliquent sur le lien reçu sur WhatsApp et voient leur colis, son poids, son pass QR et le montant exact directement dans le navigateur de leur téléphone.",
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

const ONBOARDING_STEPS = [
  {
    num: "I",
    title: "Activez votre portail /a/votre-agence",
    detail:
      "Renseignez le nom de votre agence, votre numéro WhatsApp et vos tarifs au kilo ou au CBM.",
  },
  {
    num: "II",
    title: "Enregistrez ou importez votre lot en cours",
    detail:
      "Créez un conteneur ou un vol et générez automatiquement les codes TC et pass QR de chaque client.",
  },
  {
    num: "III",
    title: "Diffusez sur WhatsApp et encaissez sans appel",
    detail:
      "Vos clients suivent l'arrivée à Vridi et règlent leur solde Wave ou Orange Money avant de passer au comptoir.",
  },
];

function CertifiedQrMatrix() {
  const size = 11;
  const pattern = [
    1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1,
    1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 1,
    1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1,
    0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0,
    1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1,
    0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0,
    1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1,
    0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0,
    1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1,
    1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1,
    1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1,
  ];
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="w-12 h-12 shrink-0"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {pattern.map((bit, idx) => {
        if (!bit) return null;
        const r = Math.floor(idx / size);
        const c = idx % size;
        return <rect key={idx} x={c} y={r} width={1} height={1} fill="#050d1a" />;
      })}
    </svg>
  );
}

export default function HomePage() {
  const [corridor, setCorridor] = useState<CorridorId>("yiwu_sea");
  const [heroStageMode, setHeroStageMode] = useState<"globe" | "unit">("globe");
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const activeCorridor = CORRIDORS[corridor];
  const currentStep = BATCH_STEPS[activeStepIndex] ?? BATCH_STEPS[0];

  // Synchronize Peak scrub progress (--sc-p) with the 4-stage Command HUD
  useEffect(() => {
    let raf = 0;
    const handleScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const quayEl = document.getElementById("act-quai");
        if (quayEl) {
          const rawP = getComputedStyle(quayEl).getPropertyValue("--sc-p").trim();
          const p = parseFloat(rawP);
          if (!Number.isNaN(p) && p > 0) {
            const idx = Math.min(
              BATCH_STEPS.length - 1,
              Math.floor(p * BATCH_STEPS.length)
            );
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

  const handleSelectBatchStep = (idx: number) => {
    setActiveStepIndex(idx);
    const step = BATCH_STEPS[idx];
    const quayEl = document.getElementById("act-quai");
    const videoEl = quayEl?.querySelector("video") as HTMLVideoElement | null;
    if (videoEl && step && videoEl.duration > 0) {
      try {
        videoEl.currentTime = step.videoFraction * videoEl.duration;
      } catch {}
    }
  };

  return (
    <div id="tc-showcase-root" className="min-h-screen bg-[#f8fafc] text-[#0b1324]">
      <ScrollCraftRunner rootId="tc-showcase-root" />
      <div data-sc-progress aria-hidden="true" />
      <div className="sc-grain" aria-hidden="true" />

      <Navbar activeCorridorLabel={activeCorridor.label} />

      <main>
        {/* =================================================================
            ACTE 1 — Plein Écran : Horizon Océanique & Globe 3D Constellation
            (flow, 100svh plein cadre saphir, Globe 3D flottant sans boîte fermée)
           ================================================================= */}
        <section
          id="act-ouverture"
          data-sc-act="flow"
          className="sc-act tc-ocean-hero relative min-h-[calc(100svh-4rem)] flex items-center py-8 sm:py-12 lg:py-14 overflow-hidden border-b border-white/10"
        >
          {/* Plan arrière : Porte-conteneurs & Constellation Mondiale fondus dans l'océan */}
          <div
            className="tc-ocean-hero-backdrop"
            data-sc-parallax="-0.14"
            aria-hidden="true"
          >
            <img
              src="/media/v5-ship-constellation.webp"
              alt=""
              className="w-full h-full object-cover object-center opacity-50"
            />
          </div>

          {/* Plan médian : Grille de navigation orbitale */}
          <div className="tc-ocean-hero-grid" aria-hidden="true" />

          <div className="sc-wrap relative z-10 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
              {/* Colonne gauche : 4 éléments stricts à contraste maximal sur fond saphir */}
              <div className="lg:col-span-6 space-y-5 sm:space-y-6">
                <h1 className="sc-display sc-display--xl tc-hero-title text-white tracking-tight">
                  Chaque expédition suivie en direct, de l&apos;embarquement au retrait à Abidjan.
                </h1>

                <p className="text-[15.5px] sm:text-[17.5px] leading-[1.6] text-[#cbd5e1] max-w-[46ch]">
                  Attribuez un code TC dès la pesée, alertez quarante clients sur WhatsApp en un
                  geste et encaissez par Wave ou Orange Money avant le passage au comptoir.
                </p>

                {/* Élément 3 : Sélecteur de corridor en verre saphir */}
                <div
                  role="group"
                  aria-label="Choisir une ligne logistique"
                  className="grid grid-cols-3 sm:inline-flex items-center gap-1 rounded-[14px] sm:rounded-full bg-white/8 backdrop-blur-xl p-1.5 border border-white/16 w-full sm:w-auto"
                >
                  {(Object.keys(CORRIDORS) as CorridorId[]).map((id) => {
                    const active = corridor === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setCorridor(id)}
                        aria-pressed={active}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-[10px] sm:rounded-full px-2.5 sm:px-4 py-2 text-[11px] sm:text-[13px] font-semibold transition-[background-color,color] duration-150 cursor-pointer truncate text-center ${
                          active
                            ? "bg-gradient-to-b from-[#ff6426] to-[#d9460f] text-white shadow-sm"
                            : "text-[#cbd5e1] hover:text-white hover:bg-white/10"
                        }`}
                      >
                        <span className="truncate">{CORRIDORS[id].label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Élément 4 : Duo d'actions principales */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-1">
                  <Link href="/register" className="tc-btn-primary w-full sm:w-auto text-center">
                    <span>Ouvrir mon agence</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <a href="#portail-live" className="tc-btn-ghost w-full sm:w-auto text-center">
                    Tester un code TC
                  </a>
                </div>
              </div>

              {/* Colonne droite : Globe 3D Constellation flottant librement dans l'espace (zéro boîte fermée) */}
              <div className="lg:col-span-6 relative">
                {/* Halo atmosphérique derrière la sphère 3D */}
                <div
                  className="pointer-events-none absolute inset-0 -m-6 rounded-full bg-[radial-gradient(circle_at_50%_48%,rgba(56,189,248,0.22)_0%,rgba(232,74,20,0.12)_42%,transparent_72%)]"
                  aria-hidden="true"
                />

                {/* Bascule rapide Globe 3D / Conteneur 3D */}
                <div className="relative z-20 flex justify-end mb-2">
                  <div className="inline-flex items-center gap-1 rounded-full bg-[#09192f]/90 backdrop-blur-md p-1 border border-white/16">
                    <button
                      type="button"
                      onClick={() => setHeroStageMode("globe")}
                      aria-pressed={heroStageMode === "globe"}
                      className={`rounded-full px-3.5 py-1 text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                        heroStageMode === "globe"
                          ? "bg-[#38bdf8] text-[#050d1a]"
                          : "text-[#cbd5e1] hover:text-white"
                      }`}
                    >
                      Globe Constellation 3D
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroStageMode("unit")}
                      aria-pressed={heroStageMode === "unit"}
                      className={`rounded-full px-3.5 py-1 text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                        heroStageMode === "unit"
                          ? "bg-[#38bdf8] text-[#050d1a]"
                          : "text-[#cbd5e1] hover:text-white"
                      }`}
                    >
                      Unité Cargo 3D
                    </button>
                  </div>
                </div>

                {/* Scène WebGL 3D Plein Cadre */}
                <div className="relative z-10 h-[310px] sm:h-[420px] lg:h-[490px] w-full">
                  {heroStageMode === "globe" ? (
                    <GlobeStage3D
                      corridor={corridor}
                      activeStep={currentStep.id}
                      className="w-full h-full"
                    />
                  ) : (
                    <ContainerStage3D
                      corridor={corridor}
                      activeStep={currentStep.id}
                      className="w-full h-full"
                    />
                  )}
                </div>

                {/* Bandeau télémétrique flottant en verre dépoli */}
                <div className="relative z-20 -mt-2 rounded-[16px] bg-[#09192f]/88 backdrop-blur-xl border border-white/15 px-4 py-3 grid grid-cols-3 divide-x divide-white/12 text-[11.5px] font-mono text-white shadow-2xl">
                  <div className="pr-2 truncate">
                    <span className="text-[#94a3b8] block text-[10px] uppercase">Corridor actif</span>
                    <strong className="text-white font-semibold">
                      {activeCorridor.origin} → Abidjan
                    </strong>
                  </div>
                  <div className="px-3 truncate">
                    <span className="text-[#94a3b8] block text-[10px] uppercase">Transit moyen</span>
                    <strong className="text-[#38bdf8] font-semibold">
                      {activeCorridor.eta}
                    </strong>
                  </div>
                  <div className="pl-3 truncate">
                    <span className="text-[#94a3b8] block text-[10px] uppercase">Facturation</span>
                    <strong className="text-[#ffb088] font-semibold">
                      {activeCorridor.rateLabel}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            ACTE 2 — Architecture & Réalisme : Fresque Photographique Air-Mer & Pass Certifié
            (flow, zéro coupure de titre, zéro cube beige, grandes photographies HD)
           ================================================================= */}
        <section
          id="act-comptoir"
          data-sc-act="flow"
          className="sc-act tc-daylight-band py-14 sm:py-20 lg:py-24 border-b border-[#0b1324]/10"
        >
          <div className="sc-wrap space-y-10 sm:space-y-12">
            {/* En-tête éditorial aéré sur 12 colonnes (impossible à rogner) */}
            <div
              data-sc-in="up"
              className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-10 items-end"
            >
              <div className="lg:col-span-7">
                <h2 className="sc-display sc-display--lg text-[#0b1324]">
                  Le comptoir respire enfin. Vos clients savent exactement où est leur colis.
                </h2>
              </div>
              <div className="lg:col-span-5">
                <p className="text-[15.5px] sm:text-[16.5px] leading-[1.6] text-[#475569]">
                  Chaque expédition pesée à Guangzhou, Yiwu, Istanbul ou Dubaï génère son billet de
                  fret numérique, son code TC et son pass QR jusqu&apos;à la remise à Abidjan.
                </p>
              </div>
            </div>

            {/* Fresque asymétrique : Grande photo Canal Air-Mer à gauche + Grappin Doré & Pass TC-8841 à droite */}
            <div
              data-sc-in="up"
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
            >
              {/* Colonne gauche (7 col) : Photographie grand angle Air + Mer + Comparatif Avant/Avec intégré */}
              <div className="lg:col-span-7 relative rounded-[24px] overflow-hidden border border-[#0b1324]/12 bg-[#050d1a] shadow-[var(--sc-e3)] flex flex-col justify-end min-h-[420px] sm:min-h-[520px]">
                <img
                  src="/media/v5-air-sea-canal.webp"
                  alt="Avion cargo décollant au-dessus d'un canal maritime et d'un porte-conteneurs sous un ciel bleu éclatant"
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050d1a]/95 via-[#050d1a]/45 to-transparent"
                  aria-hidden="true"
                />

                <div className="relative z-10 p-5 sm:p-7 space-y-4 text-white">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/16">
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-[0.08em] text-[#94a3b8]">
                        Sans registre numérique
                      </span>
                      <p className="text-[13.5px] text-[#cbd5e1] leading-[1.5]">
                        Appels incessants jusqu&apos;à 22 h pour connaître la position du bateau et
                        captures Mobile Money dispersées dans WhatsApp.
                      </p>
                    </div>
                    <div className="space-y-1 sm:pl-4 sm:border-l border-white/16">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-[0.08em] text-[#38bdf8]">
                        Avec TrackCargo CI
                      </span>
                      <p className="text-[13.5px] text-white font-medium leading-[1.5]">
                        Un seul clic sur le lot prévient quarante destinataires avec leur code TC,
                        leur pass QR et leur montant exact prêt à régler.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Colonne droite (5 col) : Diptyque photo HD (Grappin doré + Triptyque multimodal) & Billet de Fret TC-8841 */}
              <div className="lg:col-span-5 flex flex-col justify-between gap-6">
                {/* Duo photographique réaliste : Levage sous portique + Triptyque Mer / Route / Air */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative h-48 sm:h-52 rounded-[20px] overflow-hidden border border-[#0b1324]/12 shadow-[var(--sc-e2)] bg-[#050d1a]">
                    <img
                      src="/media/v5-crane-hoist.webp"
                      alt="Grappin jaune de portique soulevant un conteneur maritime à l'heure dorée"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                  <div className="relative h-48 sm:h-52 rounded-[20px] overflow-hidden border border-[#0b1324]/12 shadow-[var(--sc-e2)] bg-[#050d1a]">
                    <img
                      src="/media/v5-multimodal-triptych.webp"
                      alt="Vue aérienne multimodale combinant porte-conteneurs, camion et avion cargo"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                </div>

                {/* Billet de Fret & Pass QR Certifié (remplace l'ancien cube carton 3D beige) */}
                <div className="rounded-[22px] bg-white border border-[#0b1324]/14 shadow-[var(--sc-e2)] overflow-hidden flex-1 flex flex-col justify-between">
                  <div className="bg-[#050d1a] text-white px-5 py-4 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10.5px] font-mono uppercase tracking-[0.1em] text-[#38bdf8] block">
                        Bordereau numérique certifié
                      </span>
                      <div className="text-lg font-mono font-bold text-white mt-0.5">
                        TC-8841 · Lot #CG-402
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/20 border border-emerald-400/35 text-emerald-300 text-xs font-semibold px-3 py-1">
                      Prêt au retrait
                    </span>
                  </div>

                  <div className="p-5 grid grid-cols-3 divide-x divide-[#0b1324]/10 text-xs font-mono">
                    <div className="pr-3">
                      <span className="text-[#475569] block">Origine</span>
                      <strong className="text-[#0b1324] font-semibold mt-0.5 flex items-center gap-1">
                        <Plane className="w-3.5 h-3.5 text-[#d9460f]" aria-hidden="true" />
                        Guangzhou
                      </strong>
                    </div>
                    <div className="px-3">
                      <span className="text-[#475569] block">Arrivée</span>
                      <strong className="text-[#0b1324] font-semibold mt-0.5 flex items-center gap-1">
                        <Ship className="w-3.5 h-3.5 text-[#0e3a6c]" aria-hidden="true" />
                        Vridi / FHB
                      </strong>
                    </div>
                    <div className="pl-3">
                      <span className="text-[#475569] block">Poids pesé</span>
                      <strong className="text-[#0b1324] font-semibold mt-0.5 block">
                        14,5 kg · 48 000 F
                      </strong>
                    </div>
                  </div>

                  <div className="border-t border-[#0b1324]/10 bg-[#f8fafc] px-5 py-3.5 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-[#0b1324] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#d9460f]" aria-hidden="true" />
                        <span>Retrait Comptoir Treichville</span>
                      </div>
                      <p className="text-[11.5px] text-[#475569]">
                        Scan QR instantané à la remise · Zéro litige
                      </p>
                    </div>
                    <div className="rounded-[10px] bg-white p-1.5 border border-[#0b1324]/12 shadow-2xs">
                      <CertifiedQrMatrix />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            ACTE 3 — Silence Maîtrisé (Authored Silence avant le Pic)
            Diptyque cinématique : Portiques à l'heure dorée & Corridor Drone
           ================================================================= */}
        <section
          id="act-entrepot"
          data-sc-act="flow"
          className="sc-act tc-daylight-band py-12 sm:py-18"
        >
          <div className="sc-wrap">
            <figure
              data-sc-reveal="up"
              data-sc-reveal-at="0.06 0.62"
              className="space-y-3.5"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-8 overflow-hidden rounded-[22px] border border-[#0b1324]/12 bg-[#050d1a] shadow-[var(--sc-e3)]">
                  <img
                    src="/media/v5-quay-golden.webp"
                    alt="Portiques géants bleus déchargeant un porte-conteneurs à l'heure dorée devant les équipes de quai"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-[38svh] sm:h-[52svh] lg:h-[62svh] object-cover object-center block"
                  />
                </div>
                <div className="md:col-span-4 overflow-hidden rounded-[22px] border border-[#0b1324]/12 bg-[#050d1a] shadow-[var(--sc-e3)]">
                  <img
                    src="/media/v5-drone-corridor.webp"
                    alt="Vue aérienne verticale d'un avion cargo survolant un canal portuaire bordé de conteneurs"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-[34svh] sm:h-[52svh] lg:h-[62svh] object-cover object-center block"
                  />
                </div>
              </div>
              <figcaption className="pt-3 border-t border-[#0b1324]/12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-xs sm:text-[13px] font-mono text-[#475569]">
                <span className="text-[#0b1324] font-semibold">
                  Terminal Maritime &amp; Corridor Aérien · Connexion directe vers Abidjan
                </span>
                <span>
                  Traçabilité continue du chargement d&apos;origine jusqu&apos;à la remise au client.
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* =================================================================
            ACTE 4 — LE PIC : Odyssée HD en 4 Étapes & HUD de Commande Latéral
            (scrub 2.85vh sur v6-odyssey.mp4 encodé depuis vos 4 photos HD)
           ================================================================= */}
        <section
          id="act-quai"
          data-sc-act="scrub"
          data-sc-span="2.85"
          data-sc-dwell="0.35"
          className="sc-act tc-slate-band"
        >
          <div
            data-sc-stage
            className="sc-stage tc-stage-below-nav bg-[#050d1a] overflow-hidden"
          >
            <img
              src="/media/v5-quay-golden.webp"
              alt="Portiques et porte-conteneurs au terminal maritime à l'heure dorée"
              className="sc-stage__poster"
            />
            <video
              data-sc-scrub
              data-sc-src="/media/v6-odyssey.mp4"
              data-sc-src-mobile="/media/v6-odyssey-m.mp4"
              muted
              playsInline
              preload="none"
              poster="/media/v5-quay-golden.webp"
              className="w-full h-full object-cover object-center"
            />

            {/* Voile directionnel à gauche laissant toute la partie droite de l'image HD libre */}
            <div className="tc-odyssey-scrim" aria-hidden="true" />

            {/* HUD de Commande Latéral Asymétrique (remplace l'ancien bloc rectangulaire du bas) */}
            <div className="relative z-20 h-full sc-wrap flex items-end md:items-center pb-4 sm:pb-6 md:pb-0">
              <div
                data-sc-cue="-0.2"
                className="w-full md:max-w-[30rem] rounded-[24px] bg-[#050d1a]/92 text-white backdrop-blur-2xl border border-white/18 p-4 sm:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_32px_72px_-12px_rgba(0,0,0,0.75)] space-y-4"
              >
                {/* En-tête du HUD avec arc SVG de progression */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/12">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2 w-2 rounded-full bg-[#38bdf8] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-[11.5px] font-mono text-white font-semibold truncate">
                      {currentStep.locationLine}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#38bdf8] shrink-0">
                    {currentStep.progressPct} %
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-mono uppercase tracking-[0.1em] text-[#94a3b8]">
                    Lot #CG-402 · 42 colis groupés
                  </span>
                  <h2 className="text-[18px] sm:text-[22px] font-bold text-white leading-[1.2] tracking-tight">
                    Un seul geste met à jour tout l&apos;arrivage
                  </h2>
                </div>

                {/* Liste verticale / grille 2x2 des 4 jalons avec sélection directe de la scène HD */}
                <div className="grid grid-cols-2 gap-2">
                  {BATCH_STEPS.map((step, idx) => {
                    const selected = idx === activeStepIndex;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => handleSelectBatchStep(idx)}
                        className={`rounded-[14px] px-3 py-2.5 text-left transition-[background-color,border-color,transform] duration-150 cursor-pointer border ${
                          selected
                            ? "bg-gradient-to-br from-[#ef5316] to-[#c83d09] text-white border-white/30 shadow-md"
                            : "bg-white/8 text-[#cbd5e1] hover:bg-white/14 border-white/10"
                        }`}
                      >
                        <span
                          className={`block text-[10px] font-mono uppercase ${
                            selected ? "text-white/90" : "text-[#38bdf8]"
                          }`}
                        >
                          Étape {step.code}
                        </span>
                        <span className="block text-[12.5px] font-semibold truncate mt-0.5">
                          {step.buttonLabel}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Aperçu de la notification envoyée aux 42 clients (zéro icône de marque) */}
                <div className="rounded-[14px] bg-[#0a192f]/95 border border-white/14 p-3.5 space-y-2">
                  <p className="text-[12.5px] sm:text-[13px] text-[#f8fafc] leading-[1.5]">
                    « {currentStep.whatsappSample} »
                  </p>
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] font-mono text-[#fde68a]">
                    <span>{currentStep.waveState}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            ACTE 5 — Ampleur : Les 4 Corridors (pan 1.80vh desktop & mobile)
            Photographies HD grand spectacle 100 % pures sans badges ni logos
           ================================================================= */}
        <section
          id="act-lignes"
          data-sc-act="pan"
          data-sc-span="1.80"
          className="sc-act tc-slate-band scroll-mt-16 border-t border-white/10"
        >
          <div
            data-sc-stage
            className="sc-stage tc-stage-below-nav bg-[#050d1a] overflow-hidden"
          >
            <div className="tc-rail-track" data-sc-pan="0.04">
              <div className="tc-rail-lead">
                <h2 className="sc-display sc-display--lg text-white mb-4">
                  Un seul outil pour vos quatre lignes d&apos;activité.
                </h2>
                <p className="text-[15px] text-[#cbd5e1] leading-[1.6] max-w-[34ch]">
                  Faites défiler pour parcourir vos corridors aériens et maritimes jusqu&apos;à la
                  remise au client à Abidjan.
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
                  <div className="h-48 sm:h-54 w-full overflow-hidden bg-[#122847]">
                    <img
                      src={card.image}
                      alt={card.alt}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center block group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-5 sm:p-6 flex flex-col justify-between flex-1 gap-3">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/12 text-[11.5px] font-mono text-[#94a3b8]">
                        <span className="uppercase tracking-wider">{card.billing}</span>
                        <span className="text-[#38bdf8] font-semibold">{card.timing}</span>
                      </div>
                      <h3 className="text-[19px] sm:text-[21px] font-bold text-white tracking-tight">
                        {card.city}
                      </h3>
                      <p className="text-[13.5px] sm:text-[14px] text-[#cbd5e1] leading-[1.55]">
                        {card.detail}
                      </p>
                    </div>
                  </div>
                </article>
              ))}

              <div className="tc-rail-end relative overflow-hidden">
                <img
                  src="/media/v5-ship-golden-map.webp"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-35"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#050d1a] via-[#050d1a]/65 to-transparent"
                  aria-hidden="true"
                />
                <div className="relative z-10 space-y-3">
                  <h3 className="text-[22px] sm:text-[24px] font-bold text-white leading-[1.15]">
                    Configurez vos propres lignes en cinq minutes.
                  </h3>
                  <p className="text-[14px] text-white/90 leading-[1.55]">
                    Votre lien personnalisé s&apos;adapte automatiquement à vos tarifs au kilo et
                    au mètre cube.
                  </p>
                </div>
                <div className="relative z-10 pt-4">
                  <Link href="/register" className="tc-btn-primary w-full text-center">
                    <span>Ouvrir mon agence</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            ACTE 6 — Preuve en Direct (/api/track), Tarifs FCFA, FAQ & Clôture
            (flow, zéro fausse fenêtre navigateur, FAQ en filets, clôture Constellation)
           ================================================================= */}
        <section id="act-engagement" data-sc-act="flow" className="sc-act tc-daylight-band">
          {/* 6A. Banc d'essai client en direct — SEULE section avec BrandLogo */}
          <div
            id="portail-live"
            className="scroll-mt-20 pt-14 sm:pt-20 pb-14 sm:pb-18 border-b border-[#0b1324]/10"
          >
            <div className="sc-wrap max-w-5xl space-y-7">
              <div data-sc-in="up" className="max-w-2xl space-y-3">
                <p className="text-[11.5px] font-mono font-bold uppercase tracking-[0.1em] text-[#d9460f]">
                  Démonstration interactive en direct
                </p>
                <h2 className="sc-display sc-display--lg text-[#0b1324]">
                  Essayez le suivi exact que voit votre client.
                </h2>
                <p className="text-[15px] sm:text-[16px] text-[#475569] leading-[1.6]">
                  Cliquez sur l&apos;un des codes ci-dessous pour consulter la position du lot, le
                  pass QR de retrait et le règlement Wave ou Orange Money.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#0b1324]/12 px-3 py-1 text-[12px] font-medium text-[#0b1324] shadow-2xs">
                    <BrandLogo brand="whatsapp" size="xs" decorative />
                    <span>Alertes WhatsApp</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#0b1324]/12 px-3 py-1 text-[12px] font-medium text-[#0b1324] shadow-2xs">
                    <BrandLogo brand="wave" size="xs" decorative />
                    <span>Wave</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#0b1324]/12 px-3 py-1 text-[12px] font-medium text-[#0b1324] shadow-2xs">
                    <BrandLogo brand="orange-money" size="xs" withWhiteSurface={false} decorative />
                    <span>Orange Money</span>
                  </span>
                </div>
              </div>

              <div data-sc-in="up">
                <TrackingLookup initialQuery="TC-8841" compact />
              </div>
            </div>
          </div>

          {/* 6B. Registre Tarifaire FCFA (zéro icône de marque dans l'en-tête) */}
          <div
            id="tarifs"
            className="scroll-mt-20 py-14 sm:py-18 border-b border-[#0b1324]/10"
          >
            <div className="sc-wrap max-w-5xl">
              <div data-sc-in="up" className="max-w-2xl mb-8 sm:mb-10 space-y-2.5">
                <p className="text-[11.5px] font-mono font-bold uppercase tracking-[0.1em] text-[#d9460f]">
                  Forfaits mensuels fixes
                </p>
                <h2 className="sc-display sc-display--lg text-[#0b1324]">
                  Des tarifs fixes en FCFA, sans commission sur vos encaissements.
                </h2>
                <p className="text-[15px] sm:text-[16px] text-[#475569]">
                  Chaque forfait démarre avec 14 jours d&apos;essai complet sans engagement. Vos
                  encaissements arrivent directement sur vos comptes marchands habituels.
                </p>
              </div>

              <div
                data-sc-in=""
                data-sc-stagger="80"
                className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch"
              >
                {PLANS.map((plan) => (
                  <div
                    key={plan.name}
                    className={`relative rounded-[22px] p-6 sm:p-7 flex flex-col justify-between gap-6 transition-transform duration-200 ${
                      plan.featured
                        ? "bg-[#050d1a] text-white border border-white/15 shadow-[0_28px_60px_-16px_rgba(5,13,26,0.4)] md:-translate-y-1"
                        : "bg-white text-[#0b1324] border border-[#0b1324]/12 shadow-[var(--sc-e1)]"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {plan.featured && (
                          <span className="inline-flex items-center rounded-full bg-[#d9460f] text-white text-[11px] font-mono font-bold uppercase tracking-[0.06em] px-3 py-0.5">
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

                      <div className="pt-1 pb-2.5 border-b border-current/12">
                        <p className="text-[30px] font-bold font-mono tabular-nums tracking-tight">
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
                                  ? "bg-[#38bdf8]/20 text-[#38bdf8]"
                                  : "bg-[#fff4ee] text-[#d9460f]"
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
                      <span>Ouvrir mon agence</span>
                      <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 6C. Questions fréquentes en filets architecturaux (zéro boîtes) */}
          <div id="faq" className="py-14 sm:py-18">
            <div data-sc-in="up" className="sc-wrap max-w-4xl">
              <h2 className="sc-display sc-display--lg text-[#0b1324] mb-6">
                Questions fréquentes
              </h2>
              <div className="border-y border-[#0b1324]/14 divide-y divide-[#0b1324]/12">
                {FAQS.map((item) => (
                  <details key={item.q} className="group py-4 sm:py-5">
                    <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-[15px] sm:text-[16.5px] font-semibold text-[#0b1324]">
                      <span>{item.q}</span>
                      <span className="h-7 w-7 rounded-full border border-[#0b1324]/16 text-[#d9460f] font-mono text-[18px] inline-flex items-center justify-center shrink-0 group-open:rotate-45 group-open:bg-[#fff4ee] transition-transform">
                        +
                      </span>
                    </summary>
                    <p className="mt-2.5 text-[14.5px] text-[#475569] leading-[1.6] max-w-[66ch]">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>

          {/* 6D. Clôture Manifeste Asymétrique 2-Colonnes + Toile de fond Constellation */}
          <div id="act-cloture" className="tc-slate-band relative overflow-hidden py-16 sm:py-22">
            <img
              src="/media/v5-ship-golden-map.webp"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 w-full h-full object-cover object-center opacity-28"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#050d1a] via-[#050d1a]/88 to-[#050d1a]/70"
              aria-hidden="true"
            />
            <div className="sc-wrap relative z-10 max-w-5xl">
              <div
                data-sc-in="up"
                className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start"
              >
                <div className="lg:col-span-7 space-y-5">
                  <h2 className="sc-display sc-display--lg text-white">
                    Ouvrez votre lien client sur le prochain arrivage.
                  </h2>
                  <p className="text-[15.5px] sm:text-[17px] text-[#cbd5e1] max-w-[48ch] leading-[1.6]">
                    Créez votre agence en quelques minutes, importez vos premiers codes TC et
                    partagez le lien à vos clients dès aujourd&apos;hui.
                  </p>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-1">
                    <Link href="/register" className="tc-btn-primary w-full sm:w-auto text-center">
                      <span>Ouvrir mon agence</span>
                      <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                    <Link href="/login" className="tc-btn-ghost w-full sm:w-auto text-center">
                      Connexion agence
                    </Link>
                  </div>
                </div>

                {/* Registre de mise en route en 3 lignes (filets 1px) */}
                <div className="lg:col-span-5 border-y border-white/14 divide-y divide-white/12">
                  {ONBOARDING_STEPS.map((step) => (
                    <div key={step.num} className="py-3.5 flex items-baseline gap-3.5">
                      <span className="font-mono text-xs font-bold text-[#38bdf8] w-6 shrink-0">
                        {step.num}.
                      </span>
                      <div className="space-y-1">
                        <h3 className="text-[14.5px] font-semibold text-white">{step.title}</h3>
                        <p className="text-[13px] text-[#cbd5e1] leading-[1.5]">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <footer className="mt-12 pt-7 border-t border-white/12 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[#cbd5e1]">
                <p>TrackCargo CI · Logiciel de suivi fret pour transitaires en Côte d&apos;Ivoire</p>
                <div className="flex items-center gap-5">
                  <Link href="/track" className="hover:text-white transition-colors">
                    Portail colis
                  </Link>
                  <Link href="/register" className="hover:text-white transition-colors">
                    Ouvrir mon agence
                  </Link>
                  <Link href="/login" className="hover:text-white transition-colors">
                    Espace agence
                  </Link>
                </div>
              </footer>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
