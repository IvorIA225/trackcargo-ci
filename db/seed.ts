import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import {
  createDefaultPlatformSettings,
  createDemoSeedData,
  DEMO_ADMIN_EMAIL,
  DEMO_AGENCY_ID,
} from "./seed-data";

function randomLockedScryptHash(): string {
  const randomSecret = crypto.randomBytes(24).toString("hex");
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(randomSecret, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export async function seedDatabaseIdempotent(
  db: NeonHttpDatabase<typeof schema>
): Promise<void> {
  const settings = createDefaultPlatformSettings();
  await db
    .insert(schema.platformSettings)
    .values(settings)
    .onConflictDoNothing({ target: schema.platformSettings.id });

  const existingDemo = await db
    .select({ id: schema.agencies.id })
    .from(schema.agencies)
    .where(eq(schema.agencies.id, DEMO_AGENCY_ID))
    .limit(1);

  if (existingDemo.length === 0) {
    const seed = createDemoSeedData();
    await db
      .insert(schema.agencies)
      .values(seed.agency)
      .onConflictDoNothing({ target: schema.agencies.id });

    await db
      .insert(schema.users)
      .values({
        id: "usr-demo-1",
        agencyId: seed.agency.id,
        email: DEMO_ADMIN_EMAIL,
        passwordHash:
          process.env.DEMO_ADMIN_PASSWORD_HASH?.trim() ||
          randomLockedScryptHash(),
        fullName: "Responsable Démo Ivoire Cargo",
        role: "AGENCY_ADMIN",
        createdAt: seed.agency.createdAt,
      })
      .onConflictDoNothing({ target: schema.users.email });

    for (const batch of seed.batches) {
      await db
        .insert(schema.batches)
        .values({
          id: batch.id,
          agencyId: seed.agency.id,
          code: batch.code,
          mode: batch.mode,
          origin: batch.origin,
          destination: batch.destination,
          departureDate: batch.departureDate,
          etaDate: batch.etaDate,
          status: batch.status,
          notes: batch.notes || "",
          createdAt: batch.createdAt,
        })
        .onConflictDoNothing({ target: schema.batches.id });
    }

    for (const parcel of seed.parcels) {
      await db
        .insert(schema.parcels)
        .values({
          id: parcel.id,
          agencyId: seed.agency.id,
          batchId: parcel.batchId,
          trackingCode: parcel.trackingCode,
          clientName: parcel.clientName,
          clientPhone: parcel.clientPhone,
          description: parcel.description,
          weightKg: parcel.weightKg,
          volumeCbm: parcel.volumeCbm,
          amountFcfa: parcel.amountFcfa,
          paymentStatus: parcel.paymentStatus,
          status: parcel.status,
          history: parcel.history,
          notifiedWhatsappAt: parcel.notifiedWhatsappAt || null,
          createdAt: parcel.createdAt,
        })
        .onConflictDoNothing({ target: schema.parcels.id });
    }
  }
}

export async function resetDemoAgencyInPg(
  db: NeonHttpDatabase<typeof schema>
): Promise<void> {
  const seed = createDemoSeedData();

  await db
    .delete(schema.parcels)
    .where(eq(schema.parcels.agencyId, DEMO_AGENCY_ID));
  await db
    .delete(schema.batches)
    .where(eq(schema.batches.agencyId, DEMO_AGENCY_ID));

  await db
    .insert(schema.agencies)
    .values(seed.agency)
    .onConflictDoUpdate({
      target: schema.agencies.id,
      set: {
        slug: seed.agency.slug,
        name: seed.agency.name,
        commune: seed.agency.commune,
        address: seed.agency.address,
        whatsappPhone: seed.agency.whatsappPhone,
        waveLink: seed.agency.waveLink,
        orangeMoneyNumber: seed.agency.orangeMoneyNumber,
        ratePerKgAirFcfa: seed.agency.ratePerKgAirFcfa,
        ratePerCbmSeaFcfa: seed.agency.ratePerCbmSeaFcfa,
        plan: seed.agency.plan,
        subscriptionStatus: seed.agency.subscriptionStatus,
        trialEndsAt: seed.agency.trialEndsAt,
        currentPeriodEnd: seed.agency.currentPeriodEnd,
        manualSuspended: false,
        isDemo: true,
        updatedAt: new Date().toISOString(),
      },
    });

  for (const batch of seed.batches) {
    await db.insert(schema.batches).values({
      id: batch.id,
      agencyId: seed.agency.id,
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
  }

  for (const parcel of seed.parcels) {
    await db.insert(schema.parcels).values({
      id: parcel.id,
      agencyId: seed.agency.id,
      batchId: parcel.batchId,
      trackingCode: parcel.trackingCode,
      clientName: parcel.clientName,
      clientPhone: parcel.clientPhone,
      description: parcel.description,
      weightKg: parcel.weightKg,
      volumeCbm: parcel.volumeCbm,
      amountFcfa: parcel.amountFcfa,
      paymentStatus: parcel.paymentStatus,
      status: parcel.status,
      history: parcel.history,
      notifiedWhatsappAt: parcel.notifiedWhatsappAt || null,
      createdAt: parcel.createdAt,
    });
  }
}
