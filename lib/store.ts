import fs from "node:fs";
import path from "node:path";
import {
  createDefaultPlatformSettings,
  createDemoSeedData,
  DEMO_ADMIN_EMAIL,
  DEMO_AGENCY_ID,
} from "../db/seed-data";
import {
  Agency,
  AgencyUser,
  Batch,
  Parcel,
  PARCEL_STATUS_META,
  ParcelStatus,
  PAYMENT_STATUS_META,
  PlatformSettings,
  PublicAgencyProfile,
  PublicTrackedParcel,
  SubscriptionEvent,
  TrackCargoDatabase,
  TransportMode,
} from "./types";
import { validateTrackingQuery } from "./validation";

export interface MultiTenantJsonDb {
  platformSettings: PlatformSettings;
  agencies: Agency[];
  users: AgencyUser[];
  batches: Array<Batch & { agencyId: string }>;
  parcels: Array<Parcel & { agencyId: string }>;
  subscriptionEvents: SubscriptionEvent[];
}

function getDbPaths(): { dataDir: string; dbPath: string } {
  const override = process.env.TRACKCARGO_DB_PATH?.trim();
  const dbPath = override
    ? path.resolve(override)
    : path.join(process.cwd(), "data", "trackcargo.json");
  return { dataDir: path.dirname(dbPath), dbPath };
}

export function slugifyAgencyName(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return clean || "agence-cargo";
}

function createSeedMultiTenantJson(): MultiTenantJsonDb {
  const demo = createDemoSeedData();
  return {
    platformSettings: createDefaultPlatformSettings(),
    agencies: [demo.agency],
    users: [
      {
        id: "usr-demo-1",
        agencyId: DEMO_AGENCY_ID,
        email: DEMO_ADMIN_EMAIL,
        passwordHash: "scrypt:locked:locked",
        fullName: "Responsable Démo Ivoire Cargo",
        role: "AGENCY_ADMIN",
        createdAt: demo.agency.createdAt,
      },
    ],
    batches: demo.batches.map((b) => ({ ...b, agencyId: DEMO_AGENCY_ID })),
    parcels: demo.parcels.map((p) => ({ ...p, agencyId: DEMO_AGENCY_ID })),
    subscriptionEvents: [],
  };
}

let memoryMultiFallback: MultiTenantJsonDb | null = null;

function isLegacySingleAgencyJson(raw: unknown): raw is TrackCargoDatabase {
  return Boolean(
    raw &&
      typeof raw === "object" &&
      "agency" in raw &&
      !("agencies" in raw)
  );
}

export function readMultiTenantJsonDb(): MultiTenantJsonDb {
  const { dataDir, dbPath } = getDbPaths();
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(dbPath)) {
      const seed = createSeedMultiTenantJson();
      fs.writeFileSync(dbPath, JSON.stringify(seed, null, 2), "utf8");
      return seed;
    }
    const parsed = JSON.parse(fs.readFileSync(dbPath, "utf8")) as unknown;
    if (isLegacySingleAgencyJson(parsed)) {
      const seed = createSeedMultiTenantJson();
      const upgraded: MultiTenantJsonDb = {
        ...seed,
        agencies: [parsed.agency],
        batches: (parsed.batches || []).map((b) => ({
          ...b,
          agencyId: parsed.agency.id,
        })),
        parcels: (parsed.parcels || []).map((p) => ({
          ...p,
          agencyId: parsed.agency.id,
        })),
      };
      return upgraded;
    }
    const mt = parsed as MultiTenantJsonDb;
    if (!mt.platformSettings) {
      mt.platformSettings = createDefaultPlatformSettings();
    }
    mt.agencies ||= [];
    mt.users ||= [];
    mt.batches ||= [];
    mt.parcels ||= [];
    mt.subscriptionEvents ||= [];
    return mt;
  } catch {
    if (!memoryMultiFallback) {
      memoryMultiFallback = createSeedMultiTenantJson();
    }
    return memoryMultiFallback;
  }
}

export function writeMultiTenantJsonDb(db: MultiTenantJsonDb): void {
  memoryMultiFallback = db;
  const { dataDir, dbPath } = getDbPaths();
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const tmpPath = `${dbPath}.${process.pid}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(tmpPath, dbPath);
  } catch {
    // Ignored when filesystem is unavailable
  }
}

export function readDb(): TrackCargoDatabase {
  const mt = readMultiTenantJsonDb();
  const demoAgency =
    mt.agencies.find((a) => a.id === DEMO_AGENCY_ID) || mt.agencies[0];
  if (!demoAgency) {
    const seed = createDemoSeedData();
    return { agency: seed.agency, batches: seed.batches, parcels: seed.parcels };
  }
  return {
    agency: demoAgency,
    batches: mt.batches.filter((b) => b.agencyId === demoAgency.id),
    parcels: mt.parcels.filter((p) => p.agencyId === demoAgency.id),
  };
}

export function writeDb(db: TrackCargoDatabase): void {
  const mt = readMultiTenantJsonDb();
  const idx = mt.agencies.findIndex((a) => a.id === db.agency.id);
  if (idx >= 0) {
    mt.agencies[idx] = db.agency;
  } else {
    mt.agencies.push(db.agency);
  }
  mt.batches = [
    ...mt.batches.filter((b) => b.agencyId !== db.agency.id),
    ...db.batches.map((b) => ({ ...b, agencyId: db.agency.id })),
  ];
  mt.parcels = [
    ...mt.parcels.filter((p) => p.agencyId !== db.agency.id),
    ...db.parcels.map((p) => ({ ...p, agencyId: db.agency.id })),
  ];
  writeMultiTenantJsonDb(mt);
}

export function resetDatabase(): TrackCargoDatabase {
  const seed = createDemoSeedData();
  const mt = readMultiTenantJsonDb();
  mt.agencies = [
    ...mt.agencies.filter((a) => a.id !== DEMO_AGENCY_ID),
    seed.agency,
  ];
  mt.batches = [
    ...mt.batches.filter((b) => b.agencyId !== DEMO_AGENCY_ID),
    ...seed.batches.map((b) => ({ ...b, agencyId: DEMO_AGENCY_ID })),
  ];
  mt.parcels = [
    ...mt.parcels.filter((p) => p.agencyId !== DEMO_AGENCY_ID),
    ...seed.parcels.map((p) => ({ ...p, agencyId: DEMO_AGENCY_ID })),
  ];
  writeMultiTenantJsonDb(mt);
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
    ? `${originUrl}/a/${agency.slug}?q=${parcel.trackingCode}`
    : `https://trackcargo.ci/a/${agency.slug}?q=${parcel.trackingCode}`;
  const statusLabel = PARCEL_STATUS_META[parcel.status].label;
  const paymentNote =
    parcel.paymentStatus === "IMPAYE"
      ? `Frais de fret : *${formatFcfa(parcel.amountFcfa)}* (Payable via Wave/OM ou au retrait)`
      : `Statut paiement : *${PAYMENT_STATUS_META[parcel.paymentStatus].label}*`;

  const lines = [
    `Bonjour *${parcel.clientName}*`,
    `Mise à jour de votre colis *${parcel.trackingCode}* chez *${agency.name}* (${agency.commune}) :`,
    ``,
    `Contenu : ${parcel.description} (${parcel.weightKg} kg)`,
    batch ? `Lot : ${batch.code} (${batch.origin})` : "",
    `Statut actuel : *${statusLabel}*`,
    paymentNote,
    ``,
    `Suivez votre colis et téléchargez votre reçu ici :`,
    trackUrl,
    ``,
    `Merci pour votre confiance !`,
  ].filter(Boolean);

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
}

export function generateTrackingCodeFromSet(existingCodes: Set<string>): string {
  for (let attempt = 0; attempt < 25; attempt++) {
    const num = Math.floor(1000 + Math.random() * 8999);
    const code = `TC-${num}`;
    if (!existingCodes.has(code)) return code;
  }
  for (let attempt = 0; attempt < 40; attempt++) {
    const num = Math.floor(10000 + Math.random() * 89999);
    const code = `TC-${num}`;
    if (!existingCodes.has(code)) return code;
  }
  const num = Math.floor(100000 + Math.random() * 899999);
  return `TC-${num}`;
}

export function generateTrackingCode(existing: Parcel[]): string {
  return generateTrackingCodeFromSet(
    new Set(existing.map((p) => p.trackingCode.toUpperCase()))
  );
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
        ? "Port Autonome d'Abidjan (Vridi) : Dédouanement"
        : "Aéroport FHB Port-Bouët : Dédouanement";
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
  agency: Pick<Agency, "ratePerKgAirFcfa" | "ratePerCbmSeaFcfa">
): number {
  if (mode === "aerien") {
    return Math.round(Math.max(weightKg, 0.5) * agency.ratePerKgAirFcfa);
  }
  if (volumeCbm > 0) {
    return Math.round(volumeCbm * agency.ratePerCbmSeaFcfa);
  }
  return Math.round(Math.max(weightKg, 1) * (agency.ratePerKgAirFcfa * 0.35));
}

export function toPublicAgency(agency: Agency): PublicAgencyProfile {
  return {
    slug: agency.slug,
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
  const prefix = phone.startsWith("+")
    ? `+${digits.slice(0, 5)}`
    : digits.slice(0, 4);
  const suffix = digits.slice(-2);
  return `${prefix}••••${suffix}`;
}

export function maskClientName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Client";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]?.toUpperCase() || ""}.`;
}

export function toPublicTrackedParcel(
  p: Parcel,
  batch?: Batch
): PublicTrackedParcel {
  return {
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
    batch,
  };
}

// Synchronous wrappers kept for deterministic unit tests in tests/unit-security.test.ts
export function updateAgencyProfile(patch: Partial<Agency>): Agency {
  const db = readDb();
  const next: Agency = {
    ...db.agency,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  writeDb({ ...db, agency: next });
  return next;
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
  const matched = db.parcels
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
    .map((p) =>
      toPublicTrackedParcel(
        p,
        db.batches.find((b) => b.id === p.batchId)
      )
    );

  return { agency: publicAgency, parcels: matched };
}
