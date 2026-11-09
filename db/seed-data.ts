import {
  Agency,
  Batch,
  Parcel,
  PARCEL_STATUS_META,
  PlatformSettings,
} from "../lib/types";

export const DEMO_AGENCY_ID = "ag-abidjan-1";
export const DEMO_AGENCY_SLUG = "ivoire-cargo-express";
export const DEMO_ADMIN_EMAIL = "demo@ivoirecargo.ci";

export function createDefaultPlatformSettings(): PlatformSettings {
  return {
    id: "default",
    founderName: "TrackCargo CI",
    founderWhatsapp:
      process.env.FOUNDER_WHATSAPP?.trim() || "+2250747182383",
    founderWaveLink:
      process.env.FOUNDER_WAVE_LINK?.trim() ||
      "https://pay.wave.com/m/M_ci_trackcargoci",
    founderOmNumber:
      process.env.FOUNDER_OM_NUMBER?.trim() || "07 47 18 23 83",
    updatedAt: new Date().toISOString(),
  };
}

export function createDemoSeedData(): {
  agency: Agency;
  batches: Batch[];
  parcels: Parcel[];
} {
  const now = new Date();
  const nowIso = now.toISOString();
  // Demo stays active well into the future unless explicitly modified in Super Admin
  const farFutureIso = new Date(
    now.getTime() + 365 * 86400_000
  ).toISOString();

  const agency: Agency = {
    id: DEMO_AGENCY_ID,
    slug: DEMO_AGENCY_SLUG,
    name: "Ivoire Cargo Express",
    commune: "Treichville",
    address: "Rue 17 Avenue 21, face Station Total, Treichville, Abidjan",
    whatsappPhone: "+2250747182383",
    waveLink: "https://pay.wave.com/m/M_ci_ivoirecargo",
    orangeMoneyNumber: "07 47 18 23 83",
    ratePerKgAirFcfa: 8500,
    ratePerCbmSeaFcfa: 320000,
    plan: "PRO",
    subscriptionStatus: "ACTIVE",
    trialEndsAt: farFutureIso,
    currentPeriodEnd: farFutureIso,
    manualSuspended: false,
    isDemo: true,
    createdAt: "2026-10-01T08:00:00.000Z",
    updatedAt: nowIso,
  };

  const batches: Batch[] = [
    {
      id: "batch-air-1",
      agencyId: DEMO_AGENCY_ID,
      code: "AIR-GZ-2611A",
      mode: "aerien",
      origin: "Guangzhou (Canton), Chine",
      destination: "Entrepôt Treichville, Abidjan",
      departureDate: "2026-11-01",
      etaDate: "2026-11-09",
      status: "PRET_RETRAIT",
      notes: "Vol cargo Express dédouané ce matin à Port-Bouët.",
      createdAt: "2026-11-01T09:00:00.000Z",
    },
    {
      id: "batch-sea-1",
      agencyId: DEMO_AGENCY_ID,
      code: "CON-YW-2610M",
      mode: "maritime",
      origin: "Yiwu, Chine",
      destination: "Port Autonome d'Abidjan / Treichville",
      departureDate: "2026-09-25",
      etaDate: "2026-11-12",
      status: "ARRIVEE_ABIDJAN",
      notes:
        "Conteneur 40 pieds arrivé au terminal Vridi, sortie prévue sous 48h.",
      createdAt: "2026-09-25T10:30:00.000Z",
    },
    {
      id: "batch-air-2",
      agencyId: DEMO_AGENCY_ID,
      code: "AIR-IST-2611B",
      mode: "aerien",
      origin: "Istanbul, Turquie",
      destination: "Entrepôt Treichville, Abidjan",
      departureDate: "2026-11-06",
      etaDate: "2026-11-14",
      status: "EN_TRANSIT",
      notes: "Lot prêt-à-porter & chaussures femme.",
      createdAt: "2026-11-06T14:15:00.000Z",
    },
  ];

  const parcels: Parcel[] = [
    {
      id: "pcl-1",
      agencyId: DEMO_AGENCY_ID,
      trackingCode: "TC-8841",
      batchId: "batch-air-1",
      clientName: "Awa Koné (Boutique Glamour)",
      clientPhone: "+2250708123456",
      description: "2 cartons perruques & accessoires beauté",
      weightKg: 8.5,
      volumeCbm: 0.08,
      amountFcfa: 72250,
      paymentStatus: "IMPAYE",
      status: "PRET_RETRAIT",
      history: [
        {
          status: "RECUE_ORIGINE",
          label: PARCEL_STATUS_META.RECUE_ORIGINE.label,
          location: "Entrepôt Guangzhou, Chine",
          timestamp: "2026-11-01T11:20:00.000Z",
        },
        {
          status: "EN_TRANSIT",
          label: PARCEL_STATUS_META.EN_TRANSIT.label,
          location: "Vol Cargo Canton -> Abidjan",
          timestamp: "2026-11-03T18:00:00.000Z",
        },
        {
          status: "ARRIVEE_ABIDJAN",
          label: PARCEL_STATUS_META.ARRIVEE_ABIDJAN.label,
          location: "Aéroport FHB, Port-Bouët",
          timestamp: "2026-11-07T08:45:00.000Z",
        },
        {
          status: "PRET_RETRAIT",
          label: PARCEL_STATUS_META.PRET_RETRAIT.label,
          location: "Entrepôt Treichville, Abidjan",
          timestamp: "2026-11-09T00:10:00.000Z",
        },
      ],
      createdAt: "2026-11-01T11:20:00.000Z",
    },
    {
      id: "pcl-2",
      agencyId: DEMO_AGENCY_ID,
      trackingCode: "TC-8842",
      batchId: "batch-sea-1",
      clientName: "Jean-Marc Kouassi (JM Tech)",
      clientPhone: "+2250544987654",
      description: "12 cartons coques iPhone, chargeurs & montres",
      weightKg: 65,
      volumeCbm: 0.45,
      amountFcfa: 144000,
      paymentStatus: "PAYE_WAVE",
      status: "ARRIVEE_ABIDJAN",
      history: [
        {
          status: "RECUE_ORIGINE",
          label: PARCEL_STATUS_META.RECUE_ORIGINE.label,
          location: "Entrepôt Yiwu, Chine",
          timestamp: "2026-09-25T10:30:00.000Z",
        },
        {
          status: "EN_TRANSIT",
          label: PARCEL_STATUS_META.EN_TRANSIT.label,
          location: "Navire Maritime vers Port d'Abidjan",
          timestamp: "2026-09-28T06:00:00.000Z",
        },
        {
          status: "ARRIVEE_ABIDJAN",
          label: PARCEL_STATUS_META.ARRIVEE_ABIDJAN.label,
          location: "Port Autonome d'Abidjan (Vridi)",
          timestamp: "2026-11-08T15:20:00.000Z",
        },
      ],
      notifiedWhatsappAt: "2026-11-08T16:00:00.000Z",
      createdAt: "2026-09-25T10:30:00.000Z",
    },
    {
      id: "pcl-3",
      agencyId: DEMO_AGENCY_ID,
      trackingCode: "TC-8843",
      batchId: "batch-air-1",
      clientName: "Fatoumata Traoré",
      clientPhone: "+2250102334455",
      description: "1 sac lots cosmétiques & sérums",
      weightKg: 4,
      volumeCbm: 0.03,
      amountFcfa: 34000,
      paymentStatus: "PAYE_OM",
      status: "LIVRE",
      history: [
        {
          status: "RECUE_ORIGINE",
          label: PARCEL_STATUS_META.RECUE_ORIGINE.label,
          location: "Entrepôt Guangzhou, Chine",
          timestamp: "2026-11-01T12:00:00.000Z",
        },
        {
          status: "EN_TRANSIT",
          label: PARCEL_STATUS_META.EN_TRANSIT.label,
          location: "Vol Cargo Canton -> Abidjan",
          timestamp: "2026-11-03T18:00:00.000Z",
        },
        {
          status: "ARRIVEE_ABIDJAN",
          label: PARCEL_STATUS_META.ARRIVEE_ABIDJAN.label,
          location: "Aéroport FHB, Port-Bouët",
          timestamp: "2026-11-07T08:45:00.000Z",
        },
        {
          status: "PRET_RETRAIT",
          label: PARCEL_STATUS_META.PRET_RETRAIT.label,
          location: "Entrepôt Treichville, Abidjan",
          timestamp: "2026-11-08T09:15:00.000Z",
        },
        {
          status: "LIVRE",
          label: PARCEL_STATUS_META.LIVRE.label,
          location: "Remis à Cocody Angré par coursier",
          timestamp: "2026-11-08T17:30:00.000Z",
        },
      ],
      notifiedWhatsappAt: "2026-11-08T09:20:00.000Z",
      createdAt: "2026-11-01T12:00:00.000Z",
    },
    {
      id: "pcl-4",
      agencyId: DEMO_AGENCY_ID,
      trackingCode: "TC-8844",
      batchId: "batch-air-2",
      clientName: "Mireille Koffi (Babi Chic)",
      clientPhone: "+2250779556677",
      description: "3 ballots robes & escarpins Istanbul",
      weightKg: 14,
      volumeCbm: 0.12,
      amountFcfa: 119000,
      paymentStatus: "IMPAYE",
      status: "EN_TRANSIT",
      history: [
        {
          status: "RECUE_ORIGINE",
          label: PARCEL_STATUS_META.RECUE_ORIGINE.label,
          location: "Entrepôt Laleli, Istanbul",
          timestamp: "2026-11-06T14:15:00.000Z",
        },
        {
          status: "EN_TRANSIT",
          label: PARCEL_STATUS_META.EN_TRANSIT.label,
          location: "Vol Cargo Istanbul -> Abidjan",
          timestamp: "2026-11-07T22:00:00.000Z",
        },
      ],
      createdAt: "2026-11-06T14:15:00.000Z",
    },
  ];

  return { agency, batches, parcels };
}
