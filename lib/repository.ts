import crypto from "node:crypto";
import { and, desc, eq, inArray, sql as drizzleSql } from "drizzle-orm";
import {
  ensurePgInitialized,
  isDatabaseMisconfiguredInProd,
  shouldUsePostgres,
} from "../db";
import * as schema from "../db/schema";
import { resetDemoAgencyInPg } from "../db/seed";
import {
  createDefaultPlatformSettings,
  DEMO_AGENCY_ID,
  DEMO_AGENCY_SLUG,
} from "../db/seed-data";
import {
  computeParcelAmount,
  generateTrackingCodeFromSet,
  locationForStatus,
  normalizePhone,
  readMultiTenantJsonDb,
  resetDatabase,
  slugifyAgencyName,
  toPublicAgency,
  toPublicTrackedParcel,
  writeMultiTenantJsonDb,
} from "./store";
import {
  computeExtendedPeriodEnd,
  DEFAULT_TRIAL_DAYS,
  resolveEffectiveSubscription,
} from "./subscription";
import {
  Agency,
  AgencyUser,
  Batch,
  PARCEL_STATUS_META,
  Parcel,
  ParcelStatus,
  PaymentStatus,
  PLAN_META,
  PlanTier,
  PlatformSettings,
  PublicAgencyProfile,
  PublicTrackedParcel,
  ResolvedSubscriptionState,
  SubscriptionEvent,
  TrackCargoDatabase,
  TransportMode,
  UserRole,
} from "./types";
import { validateTrackingQuery } from "./validation";

const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "super-admin",
  "login",
  "register",
  "track",
  "dashboard",
  "a",
]);

function assertDbReady(): void {
  if (isDatabaseMisconfiguredInProd()) {
    throw new Error("DATABASE_URL_NOT_CONFIGURED");
  }
}

function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; cause?: { code?: unknown }; message?: unknown };
  if (e.code === "23505" || e.cause?.code === "23505") return true;
  if (typeof e.message === "string" && e.message.includes("duplicate key")) {
    return true;
  }
  return false;
}

export function allocateUniqueSlug(
  existingSlugs: Iterable<string>,
  rawName: string
): string {
  const taken = new Set(Array.from(existingSlugs, (s) => s.toLowerCase()));
  let base = slugifyAgencyName(rawName);
  if (RESERVED_SLUGS.has(base)) {
    base = `${base}-cargo`;
  }
  if (!taken.has(base)) return base;
  for (let i = 2; i <= 500; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${crypto.randomBytes(2).toString("hex")}`;
}

export function getSuperAdminEmail(): string {
  return (
    process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() ||
    "njeanromuald@gmail.com"
  );
}

function mapRowToAgency(row: typeof schema.agencies.$inferSelect): Agency {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    commune: row.commune,
    address: row.address,
    whatsappPhone: row.whatsappPhone,
    waveLink: row.waveLink,
    orangeMoneyNumber: row.orangeMoneyNumber,
    ratePerKgAirFcfa: row.ratePerKgAirFcfa,
    ratePerCbmSeaFcfa: row.ratePerCbmSeaFcfa,
    plan: row.plan,
    subscriptionStatus: row.subscriptionStatus,
    trialEndsAt: row.trialEndsAt,
    currentPeriodEnd: row.currentPeriodEnd ?? null,
    manualSuspended: Boolean(row.manualSuspended),
    isDemo: Boolean(row.isDemo),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapRowToBatch(row: typeof schema.batches.$inferSelect): Batch {
  return {
    id: row.id,
    agencyId: row.agencyId,
    code: row.code,
    mode: row.mode,
    origin: row.origin,
    destination: row.destination,
    departureDate: row.departureDate,
    etaDate: row.etaDate,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
  };
}

function mapRowToParcel(row: typeof schema.parcels.$inferSelect): Parcel {
  return {
    id: row.id,
    agencyId: row.agencyId,
    trackingCode: row.trackingCode,
    batchId: row.batchId,
    clientName: row.clientName,
    clientPhone: row.clientPhone,
    description: row.description,
    weightKg: row.weightKg,
    volumeCbm: row.volumeCbm,
    amountFcfa: row.amountFcfa,
    paymentStatus: row.paymentStatus,
    status: row.status,
    history: row.history || [],
    notifiedWhatsappAt: row.notifiedWhatsappAt ?? undefined,
    createdAt: row.createdAt,
  };
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  assertDbReady();
  if (!shouldUsePostgres()) {
    return readMultiTenantJsonDb().platformSettings;
  }
  const db = await ensurePgInitialized();
  const rows = await db
    .select()
    .from(schema.platformSettings)
    .where(eq(schema.platformSettings.id, "default"))
    .limit(1);
  return rows[0] || createDefaultPlatformSettings();
}

export async function updatePlatformSettings(
  patch: Partial<
    Pick<
      PlatformSettings,
      | "founderName"
      | "founderWhatsapp"
      | "founderWaveLink"
      | "founderOmNumber"
    >
  >
): Promise<PlatformSettings> {
  assertDbReady();
  const nowIso = new Date().toISOString();
  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    mt.platformSettings = {
      ...mt.platformSettings,
      ...patch,
      updatedAt: nowIso,
    };
    writeMultiTenantJsonDb(mt);
    return mt.platformSettings;
  }

  const db = await ensurePgInitialized();
  const current = await getPlatformSettings();
  const next: PlatformSettings = {
    ...current,
    ...patch,
    updatedAt: nowIso,
  };
  await db
    .insert(schema.platformSettings)
    .values(next)
    .onConflictDoUpdate({
      target: schema.platformSettings.id,
      set: {
        founderName: next.founderName,
        founderWhatsapp: next.founderWhatsapp,
        founderWaveLink: next.founderWaveLink,
        founderOmNumber: next.founderOmNumber,
        updatedAt: next.updatedAt,
      },
    });
  return next;
}

export async function findUserByEmail(
  email: string
): Promise<AgencyUser | null> {
  assertDbReady();
  const cleanEmail = email.trim().toLowerCase();
  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    return mt.users.find((u) => u.email.toLowerCase() === cleanEmail) || null;
  }
  const db = await ensurePgInitialized();
  const rows = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, cleanEmail))
    .limit(1);
  if (!rows[0]) return null;
  return {
    id: rows[0].id,
    agencyId: rows[0].agencyId ?? null,
    email: rows[0].email,
    passwordHash: rows[0].passwordHash,
    fullName: rows[0].fullName,
    role: rows[0].role,
    createdAt: rows[0].createdAt,
  };
}

export async function getAgencyById(agencyId: string): Promise<Agency | null> {
  assertDbReady();
  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    return mt.agencies.find((a) => a.id === agencyId) || null;
  }
  const db = await ensurePgInitialized();
  const rows = await db
    .select()
    .from(schema.agencies)
    .where(eq(schema.agencies.id, agencyId))
    .limit(1);
  return rows[0] ? mapRowToAgency(rows[0]) : null;
}

export async function registerAgencyWithAdmin(input: {
  agencyName: string;
  commune: string;
  whatsappPhone: string;
  fullName: string;
  email: string;
  passwordHash: string;
  plan?: PlanTier;
}): Promise<{
  agency: Agency;
  user: AgencyUser;
  subscription: ResolvedSubscriptionState;
}> {
  assertDbReady();
  const cleanEmail = input.email.trim().toLowerCase();
  if (cleanEmail === getSuperAdminEmail()) {
    throw new Error("EMAIL_EXISTS");
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const trialEndsIso = new Date(
    now.getTime() + DEFAULT_TRIAL_DAYS * 86400_000
  ).toISOString();
  const agencyId = `ag-${crypto.randomUUID()}`;
  const userId = `usr-${crypto.randomUUID()}`;
  const eventId = `evt-${crypto.randomUUID()}`;
  const normalizedWa = normalizePhone(input.whatsappPhone.trim());
  const chosenPlan: PlanTier = input.plan || "PRO";

  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    if (mt.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      throw new Error("EMAIL_EXISTS");
    }
    const slug = allocateUniqueSlug(
      mt.agencies.map((a) => a.slug),
      input.agencyName
    );
    const agency: Agency = {
      id: agencyId,
      slug,
      name: input.agencyName.trim(),
      commune: input.commune.trim(),
      address: `Entrepôt ${input.agencyName.trim()}, ${input.commune.trim()}, Abidjan`,
      whatsappPhone: normalizedWa,
      waveLink: "https://pay.wave.com",
      orangeMoneyNumber: normalizedWa,
      ratePerKgAirFcfa: 8500,
      ratePerCbmSeaFcfa: 320000,
      plan: chosenPlan,
      subscriptionStatus: "TRIAL",
      trialEndsAt: trialEndsIso,
      currentPeriodEnd: null,
      manualSuspended: false,
      isDemo: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const user: AgencyUser = {
      id: userId,
      agencyId,
      email: cleanEmail,
      passwordHash: input.passwordHash,
      fullName: input.fullName.trim(),
      role: "AGENCY_ADMIN",
      createdAt: nowIso,
    };
    mt.agencies.push(agency);
    mt.users.push(user);
    mt.subscriptionEvents.unshift({
      id: eventId,
      agencyId,
      actorEmail: cleanEmail,
      action: "TRIAL_STARTED",
      plan: chosenPlan,
      amountFcfa: 0,
      note: `Essai gratuit ${DEFAULT_TRIAL_DAYS} jours démarré`,
      createdAt: nowIso,
    });
    writeMultiTenantJsonDb(mt);
    return {
      agency,
      user,
      subscription: resolveEffectiveSubscription(agency),
    };
  }

  const db = await ensurePgInitialized();
  const existingEmail = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, cleanEmail))
    .limit(1);
  if (existingEmail.length > 0) {
    throw new Error("EMAIL_EXISTS");
  }

  const existingSlugs = await db
    .select({ slug: schema.agencies.slug })
    .from(schema.agencies);
  const slug = allocateUniqueSlug(
    existingSlugs.map((s) => s.slug),
    input.agencyName
  );

  const agency: Agency = {
    id: agencyId,
    slug,
    name: input.agencyName.trim(),
    commune: input.commune.trim(),
    address: `Entrepôt ${input.agencyName.trim()}, ${input.commune.trim()}, Abidjan`,
    whatsappPhone: normalizedWa,
    waveLink: "https://pay.wave.com",
    orangeMoneyNumber: normalizedWa,
    ratePerKgAirFcfa: 8500,
    ratePerCbmSeaFcfa: 320000,
    plan: chosenPlan,
    subscriptionStatus: "TRIAL",
    trialEndsAt: trialEndsIso,
    currentPeriodEnd: null,
    manualSuspended: false,
    isDemo: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const user: AgencyUser = {
    id: userId,
    agencyId,
    email: cleanEmail,
    passwordHash: input.passwordHash,
    fullName: input.fullName.trim(),
    role: "AGENCY_ADMIN",
    createdAt: nowIso,
  };

  try {
    await db.insert(schema.agencies).values(agency);
    await db.insert(schema.users).values(user);
    await db.insert(schema.subscriptionEvents).values({
      id: eventId,
      agencyId,
      actorEmail: cleanEmail,
      action: "TRIAL_STARTED",
      plan: chosenPlan,
      amountFcfa: 0,
      note: `Essai gratuit ${DEFAULT_TRIAL_DAYS} jours démarré`,
      createdAt: nowIso,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new Error("EMAIL_EXISTS");
    }
    throw err;
  }

  return {
    agency,
    user,
    subscription: resolveEffectiveSubscription(agency),
  };
}

export async function getOverviewForAgency(
  agencyId: string
): Promise<TrackCargoDatabase | null> {
  assertDbReady();
  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    const agency = mt.agencies.find((a) => a.id === agencyId);
    if (!agency) return null;
    const batches = mt.batches.filter((b) => b.agencyId === agencyId);
    const parcels = mt.parcels.filter((p) => p.agencyId === agencyId);
    return {
      agency,
      batches,
      parcels,
      subscription: resolveEffectiveSubscription(agency),
      platformSettings: mt.platformSettings,
    };
  }

  const db = await ensurePgInitialized();
  const [agencyRows, batchRows, parcelRows, settings] = await Promise.all([
    db
      .select()
      .from(schema.agencies)
      .where(eq(schema.agencies.id, agencyId))
      .limit(1),
    db
      .select()
      .from(schema.batches)
      .where(eq(schema.batches.agencyId, agencyId))
      .orderBy(desc(schema.batches.createdAt)),
    db
      .select()
      .from(schema.parcels)
      .where(eq(schema.parcels.agencyId, agencyId))
      .orderBy(desc(schema.parcels.createdAt)),
    getPlatformSettings(),
  ]);

  if (!agencyRows[0]) return null;
  const agency = mapRowToAgency(agencyRows[0]);
  return {
    agency,
    batches: batchRows.map(mapRowToBatch),
    parcels: parcelRows.map(mapRowToParcel),
    subscription: resolveEffectiveSubscription(agency),
    platformSettings: settings,
  };
}

export async function updateAgencyForTenant(
  agencyId: string,
  patch: Partial<
    Pick<
      Agency,
      | "name"
      | "commune"
      | "address"
      | "whatsappPhone"
      | "waveLink"
      | "orangeMoneyNumber"
      | "ratePerKgAirFcfa"
      | "ratePerCbmSeaFcfa"
    >
  >
): Promise<Agency | null> {
  assertDbReady();
  const nowIso = new Date().toISOString();

  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    const idx = mt.agencies.findIndex((a) => a.id === agencyId);
    if (idx < 0) return null;
    mt.agencies[idx] = {
      ...mt.agencies[idx],
      ...patch,
      updatedAt: nowIso,
    };
    writeMultiTenantJsonDb(mt);
    return mt.agencies[idx];
  }

  const db = await ensurePgInitialized();
  const updated = await db
    .update(schema.agencies)
    .set({
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.commune !== undefined ? { commune: patch.commune } : {}),
      ...(patch.address !== undefined ? { address: patch.address } : {}),
      ...(patch.whatsappPhone !== undefined
        ? { whatsappPhone: patch.whatsappPhone }
        : {}),
      ...(patch.waveLink !== undefined ? { waveLink: patch.waveLink } : {}),
      ...(patch.orangeMoneyNumber !== undefined
        ? { orangeMoneyNumber: patch.orangeMoneyNumber }
        : {}),
      ...(patch.ratePerKgAirFcfa !== undefined
        ? { ratePerKgAirFcfa: patch.ratePerKgAirFcfa }
        : {}),
      ...(patch.ratePerCbmSeaFcfa !== undefined
        ? { ratePerCbmSeaFcfa: patch.ratePerCbmSeaFcfa }
        : {}),
      updatedAt: nowIso,
    })
    .where(eq(schema.agencies.id, agencyId))
    .returning();

  return updated[0] ? mapRowToAgency(updated[0]) : null;
}

export async function createBatchForTenant(
  agencyId: string,
  input: {
    code: string;
    mode: TransportMode;
    origin: string;
    destination: string;
    departureDate: string;
    etaDate: string;
    notes?: string;
  }
): Promise<Batch> {
  assertDbReady();
  const nowIso = new Date().toISOString();
  const cleanCode = input.code.trim().toUpperCase();
  const batch: Batch & { agencyId: string } = {
    id: `batch-${crypto.randomUUID()}`,
    agencyId,
    code: cleanCode,
    mode: input.mode,
    origin: input.origin.trim(),
    destination: input.destination.trim(),
    departureDate: input.departureDate,
    etaDate: input.etaDate,
    status: "RECUE_ORIGINE",
    notes: input.notes?.trim() || "",
    createdAt: nowIso,
  };

  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    if (
      mt.batches.some(
        (b) => b.agencyId === agencyId && b.code.toUpperCase() === cleanCode
      )
    ) {
      throw new Error("BATCH_CODE_EXISTS");
    }
    mt.batches.unshift(batch);
    writeMultiTenantJsonDb(mt);
    return batch;
  }

  const db = await ensurePgInitialized();
  try {
    await db.insert(schema.batches).values({
      id: batch.id,
      agencyId: batch.agencyId,
      code: batch.code,
      mode: batch.mode,
      origin: batch.origin,
      destination: batch.destination,
      departureDate: batch.departureDate,
      etaDate: batch.etaDate,
      status: batch.status,
      notes: batch.notes || "",
      createdAt: batch.createdAt,
    });
    return batch;
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new Error("BATCH_CODE_EXISTS");
    }
    throw err;
  }
}

export async function bulkUpdateBatchStatusForTenant(
  agencyId: string,
  batchId: string,
  newStatus: ParcelStatus
): Promise<{ batch: Batch | null; updatedCount: number }> {
  assertDbReady();
  const nowIso = new Date().toISOString();

  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    const agency = mt.agencies.find((a) => a.id === agencyId);
    const batch = mt.batches.find(
      (b) => b.id === batchId && b.agencyId === agencyId
    );
    if (!agency || !batch) return { batch: null, updatedCount: 0 };

    batch.status = newStatus;
    let updatedCount = 0;
    for (const parcel of mt.parcels) {
      if (
        parcel.agencyId === agencyId &&
        parcel.batchId === batchId &&
        parcel.status !== newStatus
      ) {
        parcel.status = newStatus;
        parcel.history.push({
          status: newStatus,
          label: PARCEL_STATUS_META[newStatus].label,
          location: locationForStatus(newStatus, agency, batch),
          timestamp: nowIso,
        });
        updatedCount++;
      }
    }
    writeMultiTenantJsonDb(mt);
    return { batch, updatedCount };
  }

  const db = await ensurePgInitialized();
  const [agencyRows, batchRows] = await Promise.all([
    db
      .select()
      .from(schema.agencies)
      .where(eq(schema.agencies.id, agencyId))
      .limit(1),
    db
      .select()
      .from(schema.batches)
      .where(
        and(eq(schema.batches.id, batchId), eq(schema.batches.agencyId, agencyId))
      )
      .limit(1),
  ]);

  if (!agencyRows[0] || !batchRows[0]) {
    return { batch: null, updatedCount: 0 };
  }

  const agency = mapRowToAgency(agencyRows[0]);
  const batch = mapRowToBatch(batchRows[0]);

  await db
    .update(schema.batches)
    .set({ status: newStatus })
    .where(
      and(eq(schema.batches.id, batchId), eq(schema.batches.agencyId, agencyId))
    );

  const batchParcels = await db
    .select()
    .from(schema.parcels)
    .where(
      and(
        eq(schema.parcels.batchId, batchId),
        eq(schema.parcels.agencyId, agencyId)
      )
    );

  let updatedCount = 0;
  const location = locationForStatus(newStatus, agency, batch);
  for (const row of batchParcels) {
    if (row.status !== newStatus) {
      const nextHistory = [
        ...(row.history || []),
        {
          status: newStatus,
          label: PARCEL_STATUS_META[newStatus].label,
          location,
          timestamp: nowIso,
        },
      ];
      await db
        .update(schema.parcels)
        .set({ status: newStatus, history: nextHistory })
        .where(
          and(
            eq(schema.parcels.id, row.id),
            eq(schema.parcels.agencyId, agencyId)
          )
        );
      updatedCount++;
    }
  }

  return { batch: { ...batch, status: newStatus }, updatedCount };
}

export async function createParcelsForTenant(
  agencyId: string,
  items: Array<{
    batchId: string;
    clientName: string;
    clientPhone: string;
    description: string;
    weightKg: number;
    volumeCbm?: number;
    amountFcfa?: number;
  }>
): Promise<Parcel[]> {
  assertDbReady();
  const nowIso = new Date().toISOString();

  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    const agency = mt.agencies.find((a) => a.id === agencyId);
    if (!agency) throw new Error("AGENCY_NOT_FOUND");

    const batchMap = new Map(
      mt.batches
        .filter((b) => b.agencyId === agencyId)
        .map((b) => [b.id, b] as const)
    );
    for (const item of items) {
      if (!batchMap.has(item.batchId)) {
        throw new Error("BATCH_NOT_FOUND");
      }
    }

    const codeSet = new Set(
      mt.parcels.map((p) => p.trackingCode.toUpperCase())
    );
    const created: Parcel[] = [];

    for (const item of items) {
      const batch = batchMap.get(item.batchId)!;
      const trackingCode = generateTrackingCodeFromSet(codeSet);
      codeSet.add(trackingCode);
      const volumeCbm = item.volumeCbm ?? 0;
      const computedAmount =
        item.amountFcfa && item.amountFcfa > 0
          ? item.amountFcfa
          : computeParcelAmount(batch.mode, item.weightKg, volumeCbm, agency);
      const initialStatus: ParcelStatus = batch.status || "RECUE_ORIGINE";
      const parcel: Parcel & { agencyId: string } = {
        id: `pcl-${crypto.randomUUID()}`,
        agencyId,
        trackingCode,
        batchId: batch.id,
        clientName: item.clientName.trim(),
        clientPhone: normalizePhone(item.clientPhone.trim()),
        description: item.description.trim(),
        weightKg: Number(item.weightKg) || 1,
        volumeCbm: Number(volumeCbm) || 0,
        amountFcfa: computedAmount,
        paymentStatus: "IMPAYE",
        status: initialStatus,
        history: [
          {
            status: initialStatus,
            label: PARCEL_STATUS_META[initialStatus].label,
            location: locationForStatus(initialStatus, agency, batch),
            timestamp: nowIso,
          },
        ],
        createdAt: nowIso,
      };
      mt.parcels.unshift(parcel);
      created.push(parcel);
    }

    writeMultiTenantJsonDb(mt);
    return created;
  }

  const db = await ensurePgInitialized();
  const [agencyRows, batchRows] = await Promise.all([
    db
      .select()
      .from(schema.agencies)
      .where(eq(schema.agencies.id, agencyId))
      .limit(1),
    db
      .select()
      .from(schema.batches)
      .where(eq(schema.batches.agencyId, agencyId)),
  ]);
  if (!agencyRows[0]) throw new Error("AGENCY_NOT_FOUND");

  const agency = mapRowToAgency(agencyRows[0]);
  const batchMap = new Map(
    batchRows.map((b) => [b.id, mapRowToBatch(b)] as const)
  );
  for (const item of items) {
    if (!batchMap.has(item.batchId)) {
      throw new Error("BATCH_NOT_FOUND");
    }
  }

  const existingCodeRows = await db
    .select({ code: schema.parcels.trackingCode })
    .from(schema.parcels);
  const codeSet = new Set(
    existingCodeRows.map((r) => r.code.toUpperCase())
  );

  const created: Parcel[] = [];
  for (const item of items) {
    const batch = batchMap.get(item.batchId)!;
    const volumeCbm = item.volumeCbm ?? 0;
    const computedAmount =
      item.amountFcfa && item.amountFcfa > 0
        ? item.amountFcfa
        : computeParcelAmount(batch.mode, item.weightKg, volumeCbm, agency);
    const initialStatus: ParcelStatus = batch.status || "RECUE_ORIGINE";

    let saved: Parcel | null = null;
    for (let retry = 0; retry < 5; retry++) {
      const trackingCode = generateTrackingCodeFromSet(codeSet);
      codeSet.add(trackingCode);
      const record: Parcel = {
        id: `pcl-${crypto.randomUUID()}`,
        agencyId,
        trackingCode,
        batchId: batch.id,
        clientName: item.clientName.trim(),
        clientPhone: normalizePhone(item.clientPhone.trim()),
        description: item.description.trim(),
        weightKg: Number(item.weightKg) || 1,
        volumeCbm: Number(volumeCbm) || 0,
        amountFcfa: computedAmount,
        paymentStatus: "IMPAYE",
        status: initialStatus,
        history: [
          {
            status: initialStatus,
            label: PARCEL_STATUS_META[initialStatus].label,
            location: locationForStatus(initialStatus, agency, batch),
            timestamp: nowIso,
          },
        ],
        createdAt: nowIso,
      };
      try {
        await db.insert(schema.parcels).values({
          id: record.id,
          agencyId,
          batchId: record.batchId,
          trackingCode: record.trackingCode,
          clientName: record.clientName,
          clientPhone: record.clientPhone,
          description: record.description,
          weightKg: record.weightKg,
          volumeCbm: record.volumeCbm,
          amountFcfa: record.amountFcfa,
          paymentStatus: record.paymentStatus,
          status: record.status,
          history: record.history,
          notifiedWhatsappAt: null,
          createdAt: record.createdAt,
        });
        saved = record;
        break;
      } catch (err) {
        if (!isUniqueViolation(err) || retry === 4) {
          throw err;
        }
      }
    }
    if (saved) created.push(saved);
  }

  return created;
}

export async function updateParcelForTenant(
  agencyId: string,
  parcelId: string,
  patch: {
    status?: ParcelStatus;
    paymentStatus?: PaymentStatus;
    markWhatsappNotified?: boolean;
  }
): Promise<Parcel | null> {
  assertDbReady();
  const nowIso = new Date().toISOString();

  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    const agency = mt.agencies.find((a) => a.id === agencyId);
    const parcel = mt.parcels.find(
      (p) => p.id === parcelId && p.agencyId === agencyId
    );
    if (!agency || !parcel) return null;

    const batch = mt.batches.find(
      (b) => b.id === parcel.batchId && b.agencyId === agencyId
    );
    if (patch.status && patch.status !== parcel.status) {
      parcel.status = patch.status;
      parcel.history.push({
        status: patch.status,
        label: PARCEL_STATUS_META[patch.status].label,
        location: locationForStatus(patch.status, agency, batch),
        timestamp: nowIso,
      });
    }
    if (patch.paymentStatus) {
      parcel.paymentStatus = patch.paymentStatus;
    }
    if (patch.markWhatsappNotified) {
      parcel.notifiedWhatsappAt = nowIso;
    }
    writeMultiTenantJsonDb(mt);
    return parcel;
  }

  const db = await ensurePgInitialized();
  const [agencyRows, parcelRows] = await Promise.all([
    db
      .select()
      .from(schema.agencies)
      .where(eq(schema.agencies.id, agencyId))
      .limit(1),
    db
      .select()
      .from(schema.parcels)
      .where(
        and(
          eq(schema.parcels.id, parcelId),
          eq(schema.parcels.agencyId, agencyId)
        )
      )
      .limit(1),
  ]);

  if (!agencyRows[0] || !parcelRows[0]) return null;
  const agency = mapRowToAgency(agencyRows[0]);
  const parcel = mapRowToParcel(parcelRows[0]);

  let nextHistory = parcel.history;
  let nextStatus = parcel.status;

  if (patch.status && patch.status !== parcel.status) {
    const batchRows = await db
      .select()
      .from(schema.batches)
      .where(
        and(
          eq(schema.batches.id, parcel.batchId),
          eq(schema.batches.agencyId, agencyId)
        )
      )
      .limit(1);
    const batch = batchRows[0] ? mapRowToBatch(batchRows[0]) : undefined;
    nextStatus = patch.status;
    nextHistory = [
      ...parcel.history,
      {
        status: patch.status,
        label: PARCEL_STATUS_META[patch.status].label,
        location: locationForStatus(patch.status, agency, batch),
        timestamp: nowIso,
      },
    ];
  }

  const updated = await db
    .update(schema.parcels)
    .set({
      status: nextStatus,
      history: nextHistory,
      ...(patch.paymentStatus !== undefined
        ? { paymentStatus: patch.paymentStatus }
        : {}),
      ...(patch.markWhatsappNotified
        ? { notifiedWhatsappAt: nowIso }
        : {}),
    })
    .where(
      and(
        eq(schema.parcels.id, parcelId),
        eq(schema.parcels.agencyId, agencyId)
      )
    )
    .returning();

  return updated[0] ? mapRowToParcel(updated[0]) : null;
}

export async function resetDemoForCaller(caller: {
  role: UserRole;
  agencyId: string | null;
}): Promise<TrackCargoDatabase> {
  assertDbReady();
  const allowed =
    caller.role === "SUPER_ADMIN" || caller.agencyId === DEMO_AGENCY_ID;
  if (!allowed) {
    throw new Error("RESET_FORBIDDEN");
  }

  if (!shouldUsePostgres()) {
    return resetDatabase();
  }

  const db = await ensurePgInitialized();
  await resetDemoAgencyInPg(db);
  const overview = await getOverviewForAgency(DEMO_AGENCY_ID);
  if (!overview) {
    throw new Error("DEMO_NOT_FOUND");
  }
  return overview;
}

export async function getPublicAgencyProfile(
  slug = DEMO_AGENCY_SLUG
): Promise<
  | { status: "OK"; agency: PublicAgencyProfile }
  | { status: "NOT_FOUND" }
  | { status: "SUSPENDED"; agencyName: string }
> {
  assertDbReady();
  const cleanSlug = slug.trim().toLowerCase();

  let agency: Agency | null = null;
  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    agency = mt.agencies.find((a) => a.slug === cleanSlug) || null;
  } else {
    const db = await ensurePgInitialized();
    const rows = await db
      .select()
      .from(schema.agencies)
      .where(eq(schema.agencies.slug, cleanSlug))
      .limit(1);
    agency = rows[0] ? mapRowToAgency(rows[0]) : null;
  }

  if (!agency) return { status: "NOT_FOUND" };
  const resolved = resolveEffectiveSubscription(agency);
  if (!resolved.canViewPublicPortal) {
    return { status: "SUSPENDED", agencyName: agency.name };
  }
  return { status: "OK", agency: toPublicAgency(agency) };
}

function matchPhone(clientPhone: string, normalizedDigits: string): boolean {
  const digits = clientPhone.replace(/\D/g, "");
  if (digits === normalizedDigits) return true;
  if (normalizedDigits.length >= 8 && digits.endsWith(normalizedDigits)) {
    return true;
  }
  return false;
}

export async function searchPublicBySlug(
  slug: string,
  query: string
): Promise<
  | { status: "NOT_FOUND" }
  | { status: "SUSPENDED"; agencyName: string }
  | { status: "OK"; agency: PublicAgencyProfile; parcels: PublicTrackedParcel[] }
> {
  assertDbReady();
  const cleanSlug = slug.trim().toLowerCase();
  const parsed = validateTrackingQuery(query);

  let agency: Agency | null = null;
  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    agency = mt.agencies.find((a) => a.slug === cleanSlug) || null;
    if (!agency) return { status: "NOT_FOUND" };

    const resolved = resolveEffectiveSubscription(agency);
    if (!resolved.canViewPublicPortal) {
      return { status: "SUSPENDED", agencyName: agency.name };
    }
    const pubAgency = toPublicAgency(agency);
    if (!parsed.ok) {
      return { status: "OK", agency: pubAgency, parcels: [] };
    }

    const { kind, normalized } = parsed.data;
    const batchesMap = new Map(
      mt.batches
        .filter((b) => b.agencyId === agency!.id)
        .map((b) => [b.id, b] as const)
    );
    const matched = mt.parcels
      .filter((p) => {
        if (p.agencyId !== agency!.id) return false;
        if (kind === "code") return p.trackingCode.toUpperCase() === normalized;
        return matchPhone(p.clientPhone, normalized);
      })
      .map((p) => toPublicTrackedParcel(p, batchesMap.get(p.batchId)));

    return { status: "OK", agency: pubAgency, parcels: matched };
  }

  const db = await ensurePgInitialized();
  const agencyRows = await db
    .select()
    .from(schema.agencies)
    .where(eq(schema.agencies.slug, cleanSlug))
    .limit(1);
  if (!agencyRows[0]) return { status: "NOT_FOUND" };

  agency = mapRowToAgency(agencyRows[0]);
  const resolved = resolveEffectiveSubscription(agency);
  if (!resolved.canViewPublicPortal) {
    return { status: "SUSPENDED", agencyName: agency.name };
  }

  const pubAgency = toPublicAgency(agency);
  if (!parsed.ok) {
    return { status: "OK", agency: pubAgency, parcels: [] };
  }

  const { kind, normalized } = parsed.data;
  const matchedRows =
    kind === "code"
      ? await db
          .select()
          .from(schema.parcels)
          .where(
            and(
              eq(schema.parcels.agencyId, agency.id),
              eq(schema.parcels.trackingCode, normalized)
            )
          )
      : (
          await db
            .select()
            .from(schema.parcels)
            .where(eq(schema.parcels.agencyId, agency.id))
        ).filter((r) => matchPhone(r.clientPhone, normalized));

  const batchIds = Array.from(new Set(matchedRows.map((p) => p.batchId)));
  const batchRows =
    batchIds.length > 0
      ? await db
          .select()
          .from(schema.batches)
          .where(
            and(
              eq(schema.batches.agencyId, agency.id),
              inArray(schema.batches.id, batchIds)
            )
          )
      : [];
  const batchMap = new Map(
    batchRows.map((b) => [b.id, mapRowToBatch(b)] as const)
  );

  return {
    status: "OK",
    agency: pubAgency,
    parcels: matchedRows.map((r) =>
      toPublicTrackedParcel(mapRowToParcel(r), batchMap.get(r.batchId))
    ),
  };
}

export async function searchGlobalTracking(query: string): Promise<{
  agency: PublicAgencyProfile | null;
  parcels: PublicTrackedParcel[];
  suspended?: boolean;
  hint?: string;
}> {
  assertDbReady();
  const demoFallback = await getPublicAgencyProfile(DEMO_AGENCY_SLUG);
  const demoProfile =
    demoFallback.status === "OK" ? demoFallback.agency : null;

  const parsed = validateTrackingQuery(query);
  if (!parsed.ok) {
    return { agency: demoProfile, parcels: [] };
  }

  const { kind, normalized } = parsed.data;

  // Phone lookups globally are scoped ONLY to the public showcase agency to prevent cross-agency PII leakage
  if (kind === "phone") {
    const demoResult = await searchPublicBySlug(DEMO_AGENCY_SLUG, query);
    if (demoResult.status !== "OK") {
      return { agency: demoProfile, parcels: [] };
    }
    return {
      agency: demoResult.agency,
      parcels: demoResult.parcels,
      ...(demoResult.parcels.length === 0
        ? {
            hint: "Pour rechercher par numéro WhatsApp chez votre transitaire, utilisez le lien /a/[slug] envoyé par votre agence ou entrez votre code complet TC-xxxx.",
          }
        : {}),
    };
  }

  // Unique tracking code lookup resolves the owning non-suspended agency
  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    const parcel = mt.parcels.find(
      (p) => p.trackingCode.toUpperCase() === normalized
    );
    if (!parcel) {
      return { agency: demoProfile, parcels: [] };
    }
    const owner = mt.agencies.find((a) => a.id === parcel.agencyId);
    if (!owner) return { agency: demoProfile, parcels: [] };

    const resolved = resolveEffectiveSubscription(owner);
    if (!resolved.canViewPublicPortal) {
      return { agency: null, parcels: [], suspended: true };
    }
    const batch = mt.batches.find(
      (b) => b.id === parcel.batchId && b.agencyId === owner.id
    );
    return {
      agency: toPublicAgency(owner),
      parcels: [toPublicTrackedParcel(parcel, batch)],
    };
  }

  const db = await ensurePgInitialized();
  const rows = await db
    .select()
    .from(schema.parcels)
    .where(eq(schema.parcels.trackingCode, normalized))
    .limit(1);
  if (!rows[0]) {
    return { agency: demoProfile, parcels: [] };
  }

  const parcel = mapRowToParcel(rows[0]);
  const ownerId = rows[0].agencyId;
  const [ownerRows, batchRows] = await Promise.all([
    db
      .select()
      .from(schema.agencies)
      .where(eq(schema.agencies.id, ownerId))
      .limit(1),
    db
      .select()
      .from(schema.batches)
      .where(
        and(
          eq(schema.batches.id, parcel.batchId),
          eq(schema.batches.agencyId, ownerId)
        )
      )
      .limit(1),
  ]);

  if (!ownerRows[0]) return { agency: demoProfile, parcels: [] };
  const owner = mapRowToAgency(ownerRows[0]);
  const resolved = resolveEffectiveSubscription(owner);
  if (!resolved.canViewPublicPortal) {
    return { agency: null, parcels: [], suspended: true };
  }

  return {
    agency: toPublicAgency(owner),
    parcels: [
      toPublicTrackedParcel(
        parcel,
        batchRows[0] ? mapRowToBatch(batchRows[0]) : undefined
      ),
    ],
  };
}

export async function listAgenciesForSuperAdmin(): Promise<{
  agencies: Array<
    Agency & {
      batchCount: number;
      parcelCount: number;
      resolved: ResolvedSubscriptionState;
    }
  >;
  recentEvents: SubscriptionEvent[];
  platformSettings: PlatformSettings;
}> {
  assertDbReady();

  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    const list = [...mt.agencies]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((ag) => ({
        ...ag,
        batchCount: mt.batches.filter((b) => b.agencyId === ag.id).length,
        parcelCount: mt.parcels.filter((p) => p.agencyId === ag.id).length,
        resolved: resolveEffectiveSubscription(ag),
      }));
    return {
      agencies: list,
      recentEvents: mt.subscriptionEvents.slice(0, 40),
      platformSettings: mt.platformSettings,
    };
  }

  const db = await ensurePgInitialized();
  const [agencyRows, batchCounts, parcelCounts, eventRows, settings] =
    await Promise.all([
      db
        .select()
        .from(schema.agencies)
        .orderBy(desc(schema.agencies.createdAt)),
      db
        .select({
          agencyId: schema.batches.agencyId,
          cnt: drizzleSql<number>`count(*)::int`,
        })
        .from(schema.batches)
        .groupBy(schema.batches.agencyId),
      db
        .select({
          agencyId: schema.parcels.agencyId,
          cnt: drizzleSql<number>`count(*)::int`,
        })
        .from(schema.parcels)
        .groupBy(schema.parcels.agencyId),
      db
        .select()
        .from(schema.subscriptionEvents)
        .orderBy(desc(schema.subscriptionEvents.createdAt))
        .limit(40),
      getPlatformSettings(),
    ]);

  const bMap = new Map(batchCounts.map((r) => [r.agencyId, Number(r.cnt)]));
  const pMap = new Map(parcelCounts.map((r) => [r.agencyId, Number(r.cnt)]));

  return {
    agencies: agencyRows.map((row) => {
      const ag = mapRowToAgency(row);
      return {
        ...ag,
        batchCount: bMap.get(ag.id) || 0,
        parcelCount: pMap.get(ag.id) || 0,
        resolved: resolveEffectiveSubscription(ag),
      };
    }),
    recentEvents: eventRows.map((e) => ({
      id: e.id,
      agencyId: e.agencyId,
      actorEmail: e.actorEmail,
      action: e.action,
      plan: e.plan,
      amountFcfa: e.amountFcfa,
      note: e.note,
      createdAt: e.createdAt,
    })),
    platformSettings: settings,
  };
}

export async function applySuperAdminAgencyAction(
  agencyId: string,
  actorEmail: string,
  input: {
    action:
      | "ACTIVATE_30D"
      | "SET_PLAN"
      | "SUSPEND"
      | "REACTIVATE"
      | "EXPIRE_NOW";
    plan?: PlanTier;
    note?: string;
  }
): Promise<{ agency: Agency; resolved: ResolvedSubscriptionState } | null> {
  assertDbReady();
  const now = new Date();
  const nowIso = now.toISOString();
  const existing = await getAgencyById(agencyId);
  if (!existing) return null;

  const nextPlan: PlanTier = input.plan || existing.plan;
  let nextStatus = existing.subscriptionStatus;
  let nextPeriodEnd = existing.currentPeriodEnd;
  let nextTrialEnd = existing.trialEndsAt;
  let nextManualSuspended = existing.manualSuspended;
  let eventAction: SubscriptionEvent["action"] = "ACTIVATED_30D";
  let eventAmount = 0;
  let eventNote = input.note?.trim() || "";

  switch (input.action) {
    case "ACTIVATE_30D": {
      nextManualSuspended = false;
      nextStatus = "ACTIVE";
      nextPeriodEnd = computeExtendedPeriodEnd(
        existing.currentPeriodEnd,
        30,
        now.getTime()
      );
      eventAction = "ACTIVATED_30D";
      eventAmount = PLAN_META[nextPlan].priceFcfa;
      eventNote = eventNote || "Validation paiement Wave/OM (+30 jours)";
      break;
    }
    case "SET_PLAN": {
      eventAction = "PLAN_CHANGED";
      eventNote = eventNote || `Forfait changé vers ${PLAN_META[nextPlan].label}`;
      break;
    }
    case "SUSPEND": {
      nextManualSuspended = true;
      nextStatus = "SUSPENDED";
      eventAction = "SUSPENDED";
      eventNote = eventNote || "Suspension manuelle Super Admin";
      break;
    }
    case "REACTIVATE": {
      nextManualSuspended = false;
      const periodMs = nextPeriodEnd ? Date.parse(nextPeriodEnd) : Number.NaN;
      const trialMs = Date.parse(nextTrialEnd);
      if (Number.isFinite(periodMs) && periodMs > now.getTime()) {
        nextStatus = "ACTIVE";
      } else if (Number.isFinite(trialMs) && trialMs > now.getTime()) {
        nextStatus = "TRIAL";
      } else {
        nextStatus = "PAST_DUE";
      }
      eventAction = "REACTIVATED";
      eventNote = eventNote || "Réactivation compte agence";
      break;
    }
    case "EXPIRE_NOW": {
      const pastIso = new Date(now.getTime() - 3600_000).toISOString();
      nextManualSuspended = false;
      nextStatus = "PAST_DUE";
      nextTrialEnd = pastIso;
      nextPeriodEnd = pastIso;
      eventAction = "EXPIRED_MANUALLY";
      eventNote = eventNote || "Passage manuel en PAST_DUE (échéance atteinte)";
      break;
    }
  }

  const eventRecord: SubscriptionEvent = {
    id: `evt-${crypto.randomUUID()}`,
    agencyId,
    actorEmail,
    action: eventAction,
    plan: nextPlan,
    amountFcfa: eventAmount,
    note: eventNote,
    createdAt: nowIso,
  };

  if (!shouldUsePostgres()) {
    const mt = readMultiTenantJsonDb();
    const idx = mt.agencies.findIndex((a) => a.id === agencyId);
    if (idx < 0) return null;
    const updated: Agency = {
      ...mt.agencies[idx],
      plan: nextPlan,
      subscriptionStatus: nextStatus,
      trialEndsAt: nextTrialEnd,
      currentPeriodEnd: nextPeriodEnd,
      manualSuspended: nextManualSuspended,
      updatedAt: nowIso,
    };
    mt.agencies[idx] = updated;
    mt.subscriptionEvents.unshift(eventRecord);
    writeMultiTenantJsonDb(mt);
    return {
      agency: updated,
      resolved: resolveEffectiveSubscription(updated),
    };
  }

  const db = await ensurePgInitialized();
  const updatedRows = await db
    .update(schema.agencies)
    .set({
      plan: nextPlan,
      subscriptionStatus: nextStatus,
      trialEndsAt: nextTrialEnd,
      currentPeriodEnd: nextPeriodEnd,
      manualSuspended: nextManualSuspended,
      updatedAt: nowIso,
    })
    .where(eq(schema.agencies.id, agencyId))
    .returning();

  await db.insert(schema.subscriptionEvents).values(eventRecord);
  const updated = mapRowToAgency(updatedRows[0]);
  return {
    agency: updated,
    resolved: resolveEffectiveSubscription(updated),
  };
}
