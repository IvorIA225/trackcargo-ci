import fs from "node:fs";
import path from "node:path";
import {
  Agency,
  Batch,
  Parcel,
  PARCEL_STATUS_META,
  ParcelStatus,
  PAYMENT_STATUS_META,
  PaymentStatus,
  PublicAgencyProfile,
  PublicTrackedParcel,
  TrackCargoDatabase,
  TransportMode,
} from "./types";
import { validateTrackingQuery } from "./validation";

function getDbPaths(): { dataDir: string; dbPath: string } {
  const override = process.env.TRACKCARGO_DB_PATH?.trim();
  const dbPath = override
    ? path.resolve(override)
    : path.join(process.cwd(), "data", "trackcargo.json");
  return { dataDir: path.dirname(dbPath), dbPath };
}

function createSeedDatabase(): TrackCargoDatabase {
  const now = new Date().toISOString();

  const agency: Agency = {
    id: "ag-abidjan-1",
    slug: "ivoire-cargo-express",
    name: "Ivoire Cargo Express",
    commune: "Treichville",
    address: "Rue 17 Avenue 21, face Station Total, Treichville, Abidjan",
    whatsappPhone: "+2250747182383",
    waveLink: "https://pay.wave.com/m/M_ci_ivoirecargo",
    orangeMoneyNumber: "07 47 18 23 83",
    ratePerKgAirFcfa: 8500,
    ratePerCbmSeaFcfa: 320000,
    updatedAt: now,
  };

  const batches: Batch[] = [
    {
      id: "batch-air-1",
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
      code: "CON-YW-2610M",
      mode: "maritime",
      origin: "Yiwu, Chine",
      destination: "Port Autonome d'Abidjan / Treichville",
      departureDate: "2026-09-25",
      etaDate: "2026-11-12",
      status: "ARRIVEE_ABIDJAN",
      notes: "Conteneur 40 pieds arrivé au terminal Vridi, sortie prévue sous 48h.",
      createdAt: "2026-09-25T10:30:00.000Z",
    },
    {
      id: "batch-air-2",
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
          location: "Vol Cargo Canton → Abidjan",
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
          location: "Vol Cargo Canton → Abidjan",
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
          location: "Vol Cargo Istanbul → Abidjan",
          timestamp: "2026-11-07T22:00:00.000Z",
        },
      ],
      createdAt: "2026-11-06T14:15:00.000Z",
    },
  ];

  return { agency, batches, parcels };
}

let memoryFallback: TrackCargoDatabase | null = null;

export function readDb(): TrackCargoDatabase {
  const { dataDir, dbPath } = getDbPaths();
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
      const seed = createSeedDatabase();
      fs.writeFileSync(dbPath, JSON.stringify(seed, null, 2), "utf8");
      return seed;
    }
    const raw = fs.readFileSync(dbPath, "utf8");
    return JSON.parse(raw) as TrackCargoDatabase;
  } catch {
    if (!memoryFallback) {
      memoryFallback = createSeedDatabase();
    }
    return memoryFallback;
  }
}

export function writeDb(db: TrackCargoDatabase): void {
  memoryFallback = db;
  const { dataDir, dbPath } = getDbPaths();
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const tmpPath = `${dbPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(tmpPath, dbPath);
  } catch {
    // Fallback to in-memory store on read-only serverless environments
  }
}

export function resetDatabase(): TrackCargoDatabase {
  const seed = createSeedDatabase();
  writeDb(seed);
  return seed;
}

export function formatFcfa(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "").replace(/^00/, "+");
}

export function buildWhatsappNotifyUrl(
  parcel: Parcel,
  agency: Agency,
  batch?: Batch,
  originUrl?: string
): string {
  const cleanPhone = normalizePhone(parcel.clientPhone).replace(/^\+/, "");
  const trackUrl = originUrl
    ? `${originUrl}/track/${parcel.trackingCode}`
    : `https://trackcargo.ci/track/${parcel.trackingCode}`;
  const statusLabel = PARCEL_STATUS_META[parcel.status].label;
  const paymentNote =
    parcel.paymentStatus === "IMPAYE"
      ? `💰 Frais de fret : *${formatFcfa(parcel.amountFcfa)}* (À régler via Wave/OM ou au retrait)`
      : `✅ Statut paiement : *${PAYMENT_STATUS_META[parcel.paymentStatus].label}*`;

  const lines = [
    `Bonjour *${parcel.clientName}* 👋`,
    `Mise à jour de votre colis *${parcel.trackingCode}* chez *${agency.name}* (${agency.commune}) :`,
    ``,
    `📦 Contenu : ${parcel.description} (${parcel.weightKg} kg)`,
    batch ? `🚢 Lot : ${batch.code} (${batch.origin})` : "",
    `📍 Statut actuel : *${statusLabel}*`,
    paymentNote,
    ``,
    `🔎 Suivez votre colis et téléchargez votre reçu ici :`,
    trackUrl,
    ``,
    `Merci pour votre confiance !`,
  ].filter(Boolean);

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function generateTrackingCode(existing: Parcel[]): string {
  const existingSet = new Set(existing.map((p) => p.trackingCode));
  let code = "";
  do {
    const num = Math.floor(1000 + Math.random() * 8999);
    code = `TC-${num}`;
  } while (existingSet.has(code));
  return code;
}

export function locationForStatus(
  status: ParcelStatus,
  agency: Agency,
  batch?: Batch
): string {
  switch (status) {
    case "RECUE_ORIGINE":
      return batch?.origin || "Entrepôt d'origine";
    case "EN_TRANSIT":
      return batch?.mode === "maritime"
        ? "Navire maritime en route vers Port d'Abidjan"
        : "Vol cargo international vers Abidjan";
    case "ARRIVEE_ABIDJAN":
      return batch?.mode === "maritime"
        ? "Port Autonome d'Abidjan (Vridi) — Dédouanement"
        : "Aéroport FHB Port-Bouët — Dédouanement";
    case "PRET_RETRAIT":
      return `Entrepôt ${agency.name}, ${agency.commune}, Abidjan`;
    case "LIVRE":
      return `Remis au destinataire (${agency.commune}, Abidjan)`;
  }
}

export function computeParcelAmount(
  mode: TransportMode,
  weightKg: number,
  volumeCbm: number,
  agency: Agency
): number {
  if (mode === "aerien") {
    return Math.round(Math.max(weightKg, 0.5) * agency.ratePerKgAirFcfa);
  }
  if (volumeCbm > 0) {
    return Math.round(volumeCbm * agency.ratePerCbmSeaFcfa);
  }
  return Math.round(Math.max(weightKg, 1) * (agency.ratePerKgAirFcfa * 0.35));
}

export function updateAgencyProfile(patch: Partial<Agency>): Agency {
  const db = readDb();
  db.agency = {
    ...db.agency,
    ...patch,
    slug:
      patch.name
        ? patch.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
        : db.agency.slug,
    updatedAt: new Date().toISOString(),
  };
  writeDb(db);
  return db.agency;
}

export function createBatchRecord(input: {
  code: string;
  mode: TransportMode;
  origin: string;
  destination: string;
  departureDate: string;
  etaDate: string;
  notes?: string;
}): Batch {
  const db = readDb();
  const batch: Batch = {
    id: `batch-${Date.now()}`,
    code: input.code.trim().toUpperCase(),
    mode: input.mode,
    origin: input.origin.trim(),
    destination: input.destination.trim(),
    departureDate: input.departureDate,
    etaDate: input.etaDate,
    status: "RECUE_ORIGINE",
    notes: input.notes?.trim() || "",
    createdAt: new Date().toISOString(),
  };
  db.batches.unshift(batch);
  writeDb(db);
  return batch;
}

export function bulkUpdateBatchStatus(
  batchId: string,
  newStatus: ParcelStatus
): { batch: Batch | null; updatedCount: number } {
  const db = readDb();
  const batch = db.batches.find((b) => b.id === batchId);
  if (!batch) return { batch: null, updatedCount: 0 };

  const now = new Date().toISOString();
  batch.status = newStatus;
  let updatedCount = 0;

  for (const parcel of db.parcels) {
    if (parcel.batchId === batchId && parcel.status !== newStatus) {
      parcel.status = newStatus;
      parcel.history.push({
        status: newStatus,
        label: PARCEL_STATUS_META[newStatus].label,
        location: locationForStatus(newStatus, db.agency, batch),
        timestamp: now,
      });
      updatedCount++;
    }
  }

  writeDb(db);
  return { batch, updatedCount };
}

export function createParcelRecord(input: {
  batchId: string;
  clientName: string;
  clientPhone: string;
  description: string;
  weightKg: number;
  volumeCbm?: number;
  amountFcfa?: number;
}): Parcel {
  const db = readDb();
  const batch = db.batches.find((b) => b.id === input.batchId);
  if (!batch) {
    throw new Error("BATCH_NOT_FOUND");
  }
  const now = new Date().toISOString();
  const volumeCbm = input.volumeCbm ?? 0;
  const computedAmount =
    input.amountFcfa && input.amountFcfa > 0
      ? input.amountFcfa
      : computeParcelAmount(
          batch.mode,
          input.weightKg,
          volumeCbm,
          db.agency
        );

  const initialStatus: ParcelStatus = batch.status || "RECUE_ORIGINE";
  const parcel: Parcel = {
    id: `pcl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    trackingCode: generateTrackingCode(db.parcels),
    batchId: batch.id,
    clientName: input.clientName.trim(),
    clientPhone: normalizePhone(input.clientPhone.trim()),
    description: input.description.trim(),
    weightKg: Number(input.weightKg) || 1,
    volumeCbm: Number(volumeCbm) || 0,
    amountFcfa: computedAmount,
    paymentStatus: "IMPAYE",
    status: initialStatus,
    history: [
      {
        status: initialStatus,
        label: PARCEL_STATUS_META[initialStatus].label,
        location: locationForStatus(initialStatus, db.agency, batch),
        timestamp: now,
      },
    ],
    createdAt: now,
  };

  db.parcels.unshift(parcel);
  writeDb(db);
  return parcel;
}

export function updateParcelRecord(
  id: string,
  patch: {
    status?: ParcelStatus;
    paymentStatus?: PaymentStatus;
    markWhatsappNotified?: boolean;
  }
): Parcel | null {
  const db = readDb();
  const parcel = db.parcels.find((p) => p.id === id);
  if (!parcel) return null;

  const batch = db.batches.find((b) => b.id === parcel.batchId);
  const now = new Date().toISOString();

  if (patch.status && patch.status !== parcel.status) {
    parcel.status = patch.status;
    parcel.history.push({
      status: patch.status,
      label: PARCEL_STATUS_META[patch.status].label,
      location: locationForStatus(patch.status, db.agency, batch),
      timestamp: now,
    });
  }

  if (patch.paymentStatus) {
    parcel.paymentStatus = patch.paymentStatus;
  }

  if (patch.markWhatsappNotified) {
    parcel.notifiedWhatsappAt = now;
  }

  writeDb(db);
  return parcel;
}

export function toPublicAgency(agency: Agency): PublicAgencyProfile {
  return {
    name: agency.name,
    commune: agency.commune,
    address: agency.address,
    whatsappPhone: agency.whatsappPhone,
    waveLink: agency.waveLink,
    orangeMoneyNumber: agency.orangeMoneyNumber,
  };
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return "••••";
  const prefix = phone.startsWith("+") ? `+${digits.slice(0, 5)}` : digits.slice(0, 4);
  const suffix = digits.slice(-2);
  return `${prefix}••••${suffix}`;
}

export function maskClientName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Client";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]?.toUpperCase() || ""}.`;
}

export function getPublicAgency(): PublicAgencyProfile {
  return toPublicAgency(readDb().agency);
}

export function searchTracking(query: string): {
  agency: PublicAgencyProfile;
  parcels: PublicTrackedParcel[];
} {
  const db = readDb();
  const publicAgency = toPublicAgency(db.agency);
  const parsed = validateTrackingQuery(query);
  if (!parsed.ok) {
    return { agency: publicAgency, parcels: [] };
  }

  const { kind, normalized } = parsed.data;
  const matched: PublicTrackedParcel[] = db.parcels
    .filter((p) => {
      if (kind === "code") {
        return p.trackingCode.toUpperCase() === normalized;
      }
      const phoneDigits = p.clientPhone.replace(/\D/g, "");
      if (phoneDigits === normalized) return true;
      if (normalized.length >= 8 && phoneDigits.endsWith(normalized)) {
        return true;
      }
      return false;
    })
    .map((p) => ({
      id: p.id,
      trackingCode: p.trackingCode,
      batchId: p.batchId,
      clientName: maskClientName(p.clientName),
      clientPhone: maskPhone(p.clientPhone),
      description: p.description,
      weightKg: p.weightKg,
      volumeCbm: p.volumeCbm,
      amountFcfa: p.amountFcfa,
      paymentStatus: p.paymentStatus,
      status: p.status,
      history: p.history,
      createdAt: p.createdAt,
      batch: db.batches.find((b) => b.id === p.batchId),
    }));

  return { agency: publicAgency, parcels: matched };
}
