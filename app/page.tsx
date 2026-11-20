/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import ContainerStage3D, { type CorridorId } from "@/components/ContainerStage3D";
import GlobeStage3D from "@/components/GlobeStage3D";
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
  buttonLabel: string;
  progressPct: number;
  locationLine: string;
  whatsappSample: string;
  waveState: string;
};

const BATCH_STEPS: BatchStep[] = [
  {
    id: "RECUE_ORIGINE",
    buttonLabel: "1. Reçu au dépôt",
    progressPct: 18,
    locationLine: "Guangzhou · 42 colis pesés et étiquetés",
    whatsappSample:
      "Bonjour Aminata, votre colis TC-8841 (14,5 kg) est bien arrivé à notre dépôt de Guangzhou. Suivez son trajet ici sans nous appeler.",
    waveState: "Montant bloqué à 48 000 FCFA, payable à l'arrivée",
  },
  {
    id: "EN_TRANSIT",
    buttonLabel: "2. En transit",
    progressPct: 52,
    locationLine: "Lot #CG-402 · Traversée en cours vers Abidjan",
    whatsappSample:
      "Le lot #CG-402 qui contient votre colis TC-8841 est en route vers Abidjan. Arrivée estimée dans 9 jours.",
    waveState: "Lien de prépaiement disponible à tout moment",
  },
  {
    id: "ARRIVEE_ABIDJAN",
    buttonLabel: "3. Arrivé à Abidjan",
    progressPct: 82,
    locationLine: "Port de Vridi · Dépotage prévu sous 24 h",
    whatsappSample:
      "Bonne nouvelle, le lot #CG-402 vient d'accoster à Vridi. Vous serez prévenue dès que votre colis passera au comptoir.",
    waveState: "42 liens Wave préparés automatiquement pour le comptoir",
  },
  {
    id: "PRET_RETRAIT",
    buttonLabel: "4. Prêt au retrait",
    progressPct: 100,
    locationLine: "Treichville · Prêt contre code TC ou pass QR",
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

export default function HomePage() {
  const [corridor, setCorridor] = useState<CorridorId>("yiwu_sea");
  const [heroStageMode, setHeroStageMode] = useState<"globe" | "unit">("globe");
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  const activeCorridor = CORRIDORS[corridor];
  const currentStep = BATCH_STEPS[activeStepIndex] ?? BATCH_STEPS[0];

  // Synchronize Peak scrub progress (--sc-p) with the 4-stage batch console
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

  return (
    <div id="tc-showcase-root" className="min-h-screen bg-[#f4f1ea] text-[#11161f]">
      <ScrollCraftRunner rootId="tc-showcase-root" />
      <div data-sc-progress aria-hidden="true" />
      <div className="sc-grain" aria-hidden="true" />

      <Navbar activeCorridorLabel={activeCorridor.label} />

      <main>
        {/* =================================================================
            ACTE 1 — Reconnaissance : Globe 3D Constellation & Canal Air-Mer
            (flow, 4 éléments texte stricts à gauche + Théâtre 3D multi-plans à droite)
           ================================================================= */}
        <section
          id="act-ouverture"
          data-sc-act="flow"
          className="sc-act tc-daylight-band relative min-h-[calc(100svh-4rem)] flex items-center py-6 sm:py-10 lg:py-12 border-b border-[#11161f]/12 overflow-hidden"
        >
          {/* Plan d'ambiance aérien plein soleil (canal maritime + avion cargo) masqué vers la gauche */}
          <div
            className="tc-hero-ambient-photo"
            data-sc-parallax="-0.14"
            aria-hidden="true"
          >
            <img
              src="/media/v5-air-sea-canal.webp"
              alt=""
              className="w-full h-full object-cover object-center opacity-35"
            />
          </div>

          <div className="sc-wrap relative z-10 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
              {/* Colonne gauche : exactement 4 éléments (h1, p, sélecteur, CTAs) */}
              <div className="lg:col-span-6 space-y-4 sm:space-y-6">
                <h1 className="sc-display sc-display--xl tc-hero-title text-[#11161f] tracking-tight">
                  Chaque colis suivi en direct. Zéro appel au comptoir.
                </h1>

                <p className="text-[15px] sm:text-[17px] leading-[1.6] text-[#243247] max-w-[46ch]">
                  Attribuez un code TC dès la pesée, prévenez tout un conteneur sur WhatsApp et
                  encaissez par Wave ou Orange Money à Abidjan.
                </p>

                {/* Élément 3 : Sélecteur tactile de corridor synchronisé au Globe 3D & à l'Unité 3D */}
                <div
                  role="group"
                  aria-label="Choisir une ligne logistique"
                  className="grid grid-cols-3 sm:inline-flex items-center gap-1 rounded-[12px] sm:rounded-full bg-white p-1 border border-[#11161f]/14 shadow-[var(--sc-e1)] w-full sm:w-auto"
                >
                  {(Object.keys(CORRIDORS) as CorridorId[]).map((id) => {
                    const active = corridor === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setCorridor(id)}
                        aria-pressed={active}
                        className={`inline-flex items-center justify-center gap-1.5 rounded-[8px] sm:rounded-full px-2 sm:px-3.5 py-2 text-[11px] sm:text-[13px] font-semibold transition-[background-color,color] duration-150 cursor-pointer truncate text-center ${
                          active
                            ? "bg-[#0f1724] text-white"
                            : "text-[#4e5969] hover:text-[#11161f] hover:bg-[#f4f1ea]"
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

                {/* Élément 4 : Duo d'actions principales */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 pt-0.5">
                  <Link href="/register" className="tc-btn-primary w-full sm:w-auto text-center">
                    <span>Ouvrir mon agence</span>
                    <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                  <a href="#portail-live" className="tc-btn-ghost w-full sm:w-auto text-center">
                    Tester un code TC
                  </a>
                </div>
              </div>

              {/* Colonne droite : Théâtre 3D Multi-Plans (Globe Constellation 3D + Conteneur/ULD 3D) */}
              <div className="lg:col-span-6">
                <div className="tc-hero-viewport">
                  {/* Plan 1 (Arrière) : Carte mondiale des routes lumineuses & navires en parallaxe */}
                  <div
                    className="tc-hero-rear-plate"
                    data-sc-parallax="-0.12"
                    aria-hidden="true"
                  >
                    <img
                      src="/media/v5-world-routes.webp"
                      alt=""
                      className="w-full h-full object-cover object-center opacity-45"
                    />
                  </div>

                  {/* Plan 2 (Médian) : Grille de coordonnées océanique */}
                  <div className="tc-hero-mid-grid" aria-hidden="true" />

                  {/* Sélecteur de caméra 3D (Globe Corridors 3D vs Unité de Fret 3D) */}
                  <div className="absolute top-3 right-3 z-30 inline-flex items-center gap-1 rounded-full bg-[#07162c]/85 backdrop-blur-md p-1 border border-white/16">
                    <button
                      type="button"
                      onClick={() => setHeroStageMode("globe")}
                      aria-pressed={heroStageMode === "globe"}
                      className={`rounded-full px-3 py-1 text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                        heroStageMode === "globe"
                          ? "bg-[#c8430e] text-white"
                          : "text-[#cbd5e1] hover:text-white"
                      }`}
                    >
                      Globe 3D
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroStageMode("unit")}
                      aria-pressed={heroStageMode === "unit"}
                      className={`rounded-full px-3 py-1 text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                        heroStageMode === "unit"
                          ? "bg-[#c8430e] text-white"
                          : "text-[#cbd5e1] hover:text-white"
                      }`}
                    >
                      Unité 3D
                    </button>
                  </div>

                  {/* Plan 3 (Premier plan) : Scène WebGL 3D Interactive */}
                  <div className="relative z-10 h-[250px] sm:h-[360px] lg:h-[440px] w-full">
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

                  {/* Barre de lecture technique en filet 1px sous la scène 3D */}
                  <div className="relative z-20 border-t border-white/14 bg-[#07162c]/92 backdrop-blur-md px-3.5 sm:px-5 py-3 grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-3 sm:divide-x divide-white/12 text-[11.5px] font-mono text-white">
                    <div className="truncate">
                      <span className="text-[#9eb0c9]">Trajet : </span>
                      <strong className="text-white font-semibold">
                        {activeCorridor.origin} → Abidjan
                      </strong>
                    </div>
                    <div className="sm:pl-3 truncate">
                      <span className="text-[#9eb0c9]">Délai : </span>
                      <strong className="text-[#fde68a] font-semibold">
                        {activeCorridor.eta}
                      </strong>
                    </div>
                    <div className="sm:pl-3 truncate">
                      <span className="text-[#9eb0c9]">Mode : </span>
                      <strong className="text-[#ff966b] font-semibold">
                        {activeCorridor.rateLabel}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            ACTE 2 — Tension & Bascule : Triptyque Multimodal & Scanner 3D QR
            (pin 1.65vh, registre en filets 1px + scan laser 3D du colis TC-8841)
           ================================================================= */}
        <section
          id="act-comptoir"
          data-sc-act="pin"
          data-sc-span="1.65"
          className="sc-act tc-daylight-band border-b border-[#11161f]/12"
        >
          <div
            data-sc-stage
            className="sc-stage tc-stage-below-nav bg-[#f4f1ea] flex items-center"
          >
            <div className="sc-wrap w-full">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-12 items-center">
                <div className="lg:col-span-6 space-y-4 sm:space-y-5">
                  <h2 className="sc-display sc-display--lg tc-act2-title text-[#11161f]">
                    Fini les captures Wave perdues et les appels à 22 heures.
                  </h2>

                  <p className="hidden sm:block text-[16px] leading-[1.6] text-[#4e5969] max-w-[48ch]">
                    Chaque carton pesé en Chine, en Turquie ou à Dubaï garde sa fiche claire
                    jusqu&apos;à la remise au comptoir à Abidjan.
                  </p>

                  {/* Registre comparatif en filets 1px (zéro cartes imbriquées) */}
                  <div className="border-y border-[#11161f]/14 divide-y divide-[#11161f]/12">
                    <div className="py-3 sm:py-3.5 grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-4 items-baseline">
                      <span className="sm:col-span-4 text-[11px] font-mono font-bold uppercase tracking-[0.08em] text-[#4e5969]">
                        Avant · Sans registre
                      </span>
                      <p className="sm:col-span-8 text-[13px] sm:text-[14px] text-[#4e5969] leading-[1.5]">
                        Les clients demandent chaque jour où est le bateau, et les preuves Mobile
                        Money se mélangent dans les groupes WhatsApp.
                      </p>
                    </div>
                    <div className="py-3 sm:py-3.5 grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-4 items-baseline">
                      <span className="sm:col-span-4 text-[11px] font-mono font-bold uppercase tracking-[0.08em] text-[#c8430e]">
                        Avec TrackCargo CI
                      </span>
                      <p className="sm:col-span-8 text-[13px] sm:text-[14px] text-[#11161f] font-medium leading-[1.5]">
                        Une mise à jour sur le lot prévient quarante clients avec leur code TC, leur
                        pass QR et leur solde exact prêt à régler.
                      </p>
                    </div>
                  </div>

                  {/* Bandeau photographique multimodal Mer · Route · Air */}
                  <div className="hidden sm:grid grid-cols-12 gap-3 items-center pt-1">
                    <div className="col-span-5 h-20 rounded-[12px] overflow-hidden border border-[#11161f]/12">
                      <img
                        src="/media/v5-multimodal-triptych.webp"
                        alt="Triptyque aérien du fret maritime, routier et aérien"
                        className="w-full h-full object-cover object-center"
                      />
                    </div>
                    <p className="col-span-7 text-xs font-mono text-[#4e5969] leading-[1.5]">
                      <strong className="text-[#11161f] block">
                        Suivi multimodal Mer · Air · Comptoir
                      </strong>
                      Facturation automatique au CBM (maritime) ou au kilogramme (aérien) dès
                      l&apos;enregistrement du lot.
                    </p>
                  </div>
                </div>

                {/* Scène 3D macro avec faisceau de scan laser QR + vignette grappin portuaire */}
                <div className="lg:col-span-6">
                  <div className="rounded-[20px] bg-white border border-[#11161f]/12 overflow-hidden shadow-[var(--sc-e2)]">
                    <div className="relative h-[165px] sm:h-[260px] lg:h-[380px] w-full bg-gradient-to-b from-[#faf8f4] to-[#eae5da]/60">
                      <ParcelShowcase3D className="w-full h-full" />
                      {/* Vignette photo réaliste du grappin portuaire en médaillon discret */}
                      <div className="hidden sm:block absolute top-3 right-3 w-20 h-24 rounded-[10px] overflow-hidden border border-[#11161f]/16 shadow-md pointer-events-none">
                        <img
                          src="/media/v5-crane-hoist.webp"
                          alt="Levage d'un conteneur par portique à l'heure dorée"
                          className="w-full h-full object-cover object-center"
                        />
                      </div>
                    </div>
                    <div className="border-t border-[#11161f]/10 bg-white px-4 py-2.5 flex items-center justify-between gap-2 text-[11.5px] font-mono text-[#11161f]">
                      <span className="font-semibold">
                        Scanner 3D · Colis TC-8841 (14,5 kg)
                      </span>
                      <span className="text-[#c8430e] font-semibold truncate">
                        Pass QR &amp; Cerclage vérifiés
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            ACTE 3 — Silence Maîtrisé (Authored Silence avant le Pic)
            Diptyque photographique grand angle (Portiques dorés + Cour tropicale)
            Zéro badge sur les photos, une seule légende architecturale en filet 1px
           ================================================================= */}
        <section
          id="act-entrepot"
          data-sc-act="flow"
          className="sc-act tc-daylight-band py-10 sm:py-16"
        >
          <div className="sc-wrap">
            <figure
              data-sc-reveal="up"
              data-sc-reveal-at="0.06 0.62"
              className="space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-7 overflow-hidden rounded-[20px] border border-[#11161f]/12 bg-[#eae5da] shadow-[var(--sc-e2)]">
                  <img
                    src="/media/v5-quay-golden.webp"
                    alt="Portiques à conteneurs géants et opérateurs sur le quai à l'heure dorée"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-[36svh] sm:h-[50svh] lg:h-[58svh] object-cover object-center block"
                  />
                </div>
                <div className="md:col-span-5 overflow-hidden rounded-[20px] border border-[#11161f]/12 bg-[#eae5da] shadow-[var(--sc-e2)]">
                  <img
                    src="/media/v5-yard-tropical.webp"
                    alt="Conteneurs maritimes alignés sous un ciel bleu tropical éclatant"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-[32svh] sm:h-[50svh] lg:h-[58svh] object-cover object-center block"
                  />
                </div>
              </div>
              <figcaption className="pt-2.5 border-t border-[#11161f]/12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-xs sm:text-[13px] font-mono text-[#4e5969]">
                <span className="text-[#11161f] font-semibold">
                  Terminal à conteneurs &amp; Baie de dépotage · Port de Vridi, Abidjan
                </span>
                <span>
                  Du déchargement sous portique au retrait client en un seul registre synchronisé.
                </span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* =================================================================
            ACTE 4 — LE PIC : Quai de Vridi & Console de Dispatch (scrub 2.85vh)
            75 % supérieurs dégagés au soleil + console unique en bas (0 logo)
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
            className="sc-stage tc-stage-below-nav bg-[#0f1724] overflow-hidden"
          >
            <img
              src="/media/v5-quay-golden.webp"
              alt="Terminal à conteneurs du port d'Abidjan sous le soleil"
              className="sc-stage__poster"
            />
            <video
              data-sc-scrub
              data-sc-src="/media/v2-quay.mp4"
              data-sc-src-mobile="/media/v2-quay-m.mp4"
              muted
              playsInline
              preload="none"
              poster="/media/v5-quay-golden.webp"
              className="w-full h-full object-cover object-center"
            />

            {/* Voile sombre uniquement en bas pour laisser ~75% du quai au soleil */}
            <div className="tc-slate-scrim" aria-hidden="true" />

            {/* Console de Dispatch unique en bas */}
            <div className="absolute z-20 bottom-3 sm:bottom-6 inset-x-0 px-4 sm:px-8">
              <div className="max-w-4xl mx-auto rounded-[20px] bg-[#0f1724]/92 backdrop-blur-2xl border border-white/16 p-3.5 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_28px_64px_-12px_rgba(0,0,0,0.68)] space-y-3">
                {/* Ligne supérieure : statut direct + tracé SVG d'itinéraire */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-white/12">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full bg-[#f0642d] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="text-[11.5px] sm:text-xs font-mono text-white font-medium">
                      {currentStep.locationLine}
                    </span>
                  </div>

                  <div className="hidden md:flex items-center gap-3 min-w-[230px]">
                    <span className="text-[11px] font-mono text-[#cbd5e1]">
                      {activeCorridor.origin}
                    </span>
                    <svg
                      viewBox="0 0 180 24"
                      className="w-32 h-5 overflow-visible"
                      aria-hidden="true"
                    >
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

                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                  <h2
                    data-sc-cue="-0.2"
                    className="text-[16px] sm:text-[20px] font-semibold text-white tracking-tight"
                  >
                    Un clic met à jour tout le conteneur à la fois
                  </h2>
                  <span className="text-[11px] font-mono uppercase tracking-[0.08em] text-[#cbd5e1]">
                    Lot #CG-402 · 42 colis groupés
                  </span>
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
                        className={`rounded-full px-3 py-2 text-left text-[12px] font-semibold transition-[background-color,color,border-color] duration-150 cursor-pointer truncate ${
                          selected
                            ? "bg-gradient-to-b from-[#d44811] to-[#b83b09] text-white shadow-xs border border-white/20"
                            : "bg-white/10 text-[#e2e8f0] hover:bg-white/18 border border-transparent"
                        }`}
                      >
                        {step.buttonLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Aperçu WhatsApp & Wave en langage simple (zéro icône de marque) */}
                <div className="rounded-[12px] bg-white/8 border border-white/14 px-3 py-2 sm:px-3.5 sm:py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
            className="sc-stage tc-stage-below-nav bg-[#0f1724] overflow-hidden"
          >
            <div className="tc-rail-track" data-sc-pan="0.04">
              <div className="tc-rail-lead">
                <h2 className="sc-display sc-display--lg text-white mb-4">
                  Un seul outil pour vos quatre lignes d&apos;activité.
                </h2>
                <p className="text-[15px] text-[#cbd5e1] leading-[1.6] max-w-[34ch]">
                  Faites défiler pour voir comment votre équipe suit chaque trajet de la Chine, de
                  Dubaï ou de la Turquie jusqu&apos;à la remise au client.
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
                  <div className="h-44 sm:h-52 w-full overflow-hidden bg-[#1e2d45]">
                    <img
                      src={card.image}
                      alt={card.alt}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center block group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-4 sm:p-6 flex flex-col justify-between flex-1 gap-3">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/12 text-[11.5px] font-mono text-[#9eb0c9]">
                        <span className="uppercase tracking-wider">{card.billing}</span>
                        <span className="text-[#fde68a]">{card.timing}</span>
                      </div>
                      <h3 className="text-[18px] sm:text-[20px] font-bold text-white tracking-tight">
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
                  className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-22 mix-blend-screen"
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
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white text-[#11161f] font-bold text-[14px] px-5 py-3 hover:bg-[#f4f1ea] transition-colors shadow-md"
                  >
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
            (flow, zéro fausse fenêtre navigateur, FAQ en filets, clôture 2-col)
           ================================================================= */}
        <section id="act-engagement" data-sc-act="flow" className="sc-act tc-daylight-band">
          {/* 6A. Banc d'essai client en direct — SEULE section avec BrandLogo */}
          <div
            id="portail-live"
            className="scroll-mt-20 pt-12 sm:pt-18 pb-12 sm:pb-16 border-b border-[#11161f]/12"
          >
            <div className="sc-wrap max-w-5xl space-y-7">
              <div data-sc-in="up" className="max-w-2xl space-y-3">
                <p className="text-[11.5px] font-mono font-bold uppercase tracking-[0.1em] text-[#c8430e]">
                  Démonstration interactive en direct
                </p>
                <h2 className="sc-display sc-display--lg text-[#11161f]">
                  Essayez le suivi exact que voit votre client.
                </h2>
                <p className="text-[15px] sm:text-[15.5px] text-[#4e5969] leading-[1.6]">
                  Cliquez sur l&apos;un des codes ci-dessous pour consulter la position du lot, le
                  pass QR de retrait et le règlement Wave ou Orange Money.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#11161f]/12 px-3 py-1 text-[12px] font-medium text-[#11161f] shadow-2xs">
                    <BrandLogo brand="whatsapp" size="xs" decorative />
                    <span>Alertes WhatsApp</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#11161f]/12 px-3 py-1 text-[12px] font-medium text-[#11161f] shadow-2xs">
                    <BrandLogo brand="wave" size="xs" decorative />
                    <span>Wave</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#11161f]/12 px-3 py-1 text-[12px] font-medium text-[#11161f] shadow-2xs">
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
            className="scroll-mt-20 py-12 sm:py-16 border-b border-[#11161f]/12"
          >
            <div className="sc-wrap max-w-5xl">
              <div data-sc-in="up" className="max-w-2xl mb-8 sm:mb-10 space-y-2.5">
                <p className="text-[11.5px] font-mono font-bold uppercase tracking-[0.1em] text-[#c8430e]">
                  Forfaits mensuels fixes
                </p>
                <h2 className="sc-display sc-display--lg text-[#11161f]">
                  Des tarifs fixes en FCFA, sans commission sur vos encaissements.
                </h2>
                <p className="text-[15px] sm:text-[15.5px] text-[#4e5969]">
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
                    className={`relative rounded-[20px] p-6 sm:p-7 flex flex-col justify-between gap-6 transition-transform duration-200 ${
                      plan.featured
                        ? "bg-[#0f1724] text-white border border-white/15 shadow-[0_28px_60px_-16px_rgba(15,23,36,0.34)] md:-translate-y-1"
                        : "bg-white text-[#11161f] border border-[#11161f]/12 shadow-[var(--sc-e1)]"
                    }`}
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        {plan.featured && (
                          <span className="inline-flex items-center rounded-full bg-[#c8430e] text-white text-[11px] font-mono font-bold uppercase tracking-[0.06em] px-3 py-0.5">
                            Le plus choisi à Abidjan
                          </span>
                        )}
                        <h3 className="text-[20px] font-bold tracking-tight">{plan.name}</h3>
                        <p
                          className={`mt-1 text-[13.5px] leading-[1.5] ${
                            plan.featured ? "text-[#cbd5e1]" : "text-[#4e5969]"
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
                                  ? "bg-[#f0642d]/20 text-[#ff966b]"
                                  : "bg-[#fff4ee] text-[#c8430e]"
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
          <div id="faq" className="py-12 sm:py-16">
            <div data-sc-in="up" className="sc-wrap max-w-4xl">
              <h2 className="sc-display sc-display--lg text-[#11161f] mb-6">
                Questions fréquentes
              </h2>
              <div className="border-y border-[#11161f]/14 divide-y divide-[#11161f]/12">
                {FAQS.map((item) => (
                  <details key={item.q} className="group py-4 sm:py-5">
                    <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-[15px] sm:text-[16.5px] font-semibold text-[#11161f]">
                      <span>{item.q}</span>
                      <span className="h-7 w-7 rounded-full border border-[#11161f]/16 text-[#c8430e] font-mono text-[18px] inline-flex items-center justify-center shrink-0 group-open:rotate-45 group-open:bg-[#fff4ee] transition-transform">
                        +
                      </span>
                    </summary>
                    <p className="mt-2.5 text-[14.5px] text-[#4e5969] leading-[1.6] max-w-[66ch]">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>

          {/* 6D. Clôture Manifeste Asymétrique 2-Colonnes + Toile de fond Constellation */}
          <div id="act-cloture" className="tc-slate-band relative overflow-hidden py-14 sm:py-20">
            <img
              src="/media/v5-ship-golden-map.webp"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 w-full h-full object-cover object-center opacity-18"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#0f1724] via-[#0f1724]/88 to-[#0f1724]/75"
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
                      <span className="font-mono text-xs font-bold text-[#ff966b] w-6 shrink-0">
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
