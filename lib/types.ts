export type TransportMode = "aerien" | "maritime";

export type ParcelStatus =
  | "RECUE_ORIGINE"
  | "EN_TRANSIT"
  | "ARRIVEE_ABIDJAN"
  | "PRET_RETRAIT"
  | "LIVRE";

export type PaymentStatus =
  | "IMPAYE"
  | "PAYE_WAVE"
  | "PAYE_OM"
  | "PAYE_CASH";

export interface TrackingEvent {
  status: ParcelStatus;
  label: string;
  location: string;
  timestamp: string;
}

export interface Agency {
  id: string;
  slug: string;
  name: string;
  commune: string;
  address: string;
  whatsappPhone: string;
  waveLink: string;
  orangeMoneyNumber: string;
  ratePerKgAirFcfa: number;
  ratePerCbmSeaFcfa: number;
  updatedAt: string;
}

export interface Batch {
  id: string;
  code: string;
  mode: TransportMode;
  origin: string;
  destination: string;
  departureDate: string;
  etaDate: string;
  status: ParcelStatus;
  notes?: string;
  createdAt: string;
}

export interface Parcel {
  id: string;
  trackingCode: string;
  batchId: string;
  clientName: string;
  clientPhone: string;
  description: string;
  weightKg: number;
  volumeCbm: number;
  amountFcfa: number;
  paymentStatus: PaymentStatus;
  status: ParcelStatus;
  history: TrackingEvent[];
  notifiedWhatsappAt?: string;
  createdAt: string;
}

export interface TrackCargoDatabase {
  agency: Agency;
  batches: Batch[];
  parcels: Parcel[];
}

export interface PublicAgencyProfile {
  name: string;
  commune: string;
  address: string;
  whatsappPhone: string;
  waveLink: string;
  orangeMoneyNumber: string;
}

export interface PublicTrackedParcel {
  id: string;
  trackingCode: string;
  batchId: string;
  clientName: string;
  clientPhone: string;
  description: string;
  weightKg: number;
  volumeCbm: number;
  amountFcfa: number;
  paymentStatus: PaymentStatus;
  status: ParcelStatus;
  history: TrackingEvent[];
  createdAt: string;
  batch?: Batch;
}

export const PARCEL_STATUS_META: Record<
  ParcelStatus,
  {
    step: number;
    label: string;
    shortLabel: string;
    description: string;
    badgeClass: string;
  }
> = {
  RECUE_ORIGINE: {
    step: 1,
    label: "Reçu à l'entrepôt d'origine",
    shortLabel: "Reçu Chine/Origine",
    description: "Colis réceptionné, pesé et étiqueté avant chargement.",
    badgeClass: "bg-slate-100 text-slate-800 border-slate-300",
  },
  EN_TRANSIT: {
    step: 2,
    label: "En transit international",
    shortLabel: "En transit",
    description: "Expédié en vol cargo ou en conteneur vers Abidjan.",
    badgeClass: "bg-sky-100 text-sky-800 border-sky-200",
  },
  ARRIVEE_ABIDJAN: {
    step: 3,
    label: "Arrivé à Abidjan (Dédouanement)",
    shortLabel: "Arrivé Abidjan",
    description: "Arrivé au port ou à l'aéroport FHB, dédouanement en cours.",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
  },
  PRET_RETRAIT: {
    step: 4,
    label: "Disponible pour retrait / livraison",
    shortLabel: "Prêt au retrait",
    description: "Colis dédouané et disponible à l'entrepôt d'Abidjan.",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  LIVRE: {
    step: 5,
    label: "Livré au client",
    shortLabel: "Livré",
    description: "Colis remis au client ou expédié par coursier.",
    badgeClass: "bg-teal-100 text-teal-900 border-teal-200",
  },
};

export const PAYMENT_STATUS_META: Record<
  PaymentStatus,
  { label: string; badgeClass: string; isPaid: boolean }
> = {
  IMPAYE: {
    label: "À payer au retrait",
    badgeClass: "bg-rose-100 text-rose-800 border-rose-200",
    isPaid: false,
  },
  PAYE_WAVE: {
    label: "Payé (Wave)",
    badgeClass: "bg-cyan-100 text-cyan-900 border-cyan-300",
    isPaid: true,
  },
  PAYE_OM: {
    label: "Payé (Orange Money)",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-200",
    isPaid: true,
  },
  PAYE_CASH: {
    label: "Payé (Espèces)",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    isPaid: true,
  },
};
