import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type {
  PlanTier,
  ParcelStatus,
  PaymentStatus,
  SubscriptionAction,
  SubscriptionStatus,
  TrackingEvent,
  TransportMode,
  UserRole,
} from "../lib/types";

export const platformSettings = pgTable("platform_settings", {
  id: text("id").primaryKey(),
  founderName: text("founder_name").notNull(),
  founderWhatsapp: text("founder_whatsapp").notNull(),
  founderWaveLink: text("founder_wave_link").notNull(),
  founderOmNumber: text("founder_om_number").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const agencies = pgTable(
  "agencies",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    commune: text("commune").notNull(),
    address: text("address").notNull(),
    whatsappPhone: text("whatsapp_phone").notNull(),
    waveLink: text("wave_link").notNull(),
    orangeMoneyNumber: text("orange_money_number").notNull(),
    ratePerKgAirFcfa: integer("rate_per_kg_air_fcfa").notNull(),
    ratePerCbmSeaFcfa: integer("rate_per_cbm_sea_fcfa").notNull(),
    plan: text("plan").$type<PlanTier>().notNull(),
    subscriptionStatus: text("subscription_status")
      .$type<SubscriptionStatus>()
      .notNull(),
    trialEndsAt: text("trial_ends_at").notNull(),
    currentPeriodEnd: text("current_period_end"),
    manualSuspended: boolean("manual_suspended").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("agencies_slug_idx").on(table.slug)]
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    agencyId: text("agency_id").references(() => agencies.id, {
      onDelete: "cascade",
    }),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    role: text("role").$type<UserRole>().notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    index("users_agency_id_idx").on(table.agencyId),
  ]
);

export const batches = pgTable(
  "batches",
  {
    id: text("id").primaryKey(),
    agencyId: text("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    mode: text("mode").$type<TransportMode>().notNull(),
    origin: text("origin").notNull(),
    destination: text("destination").notNull(),
    departureDate: text("departure_date").notNull(),
    etaDate: text("eta_date").notNull(),
    status: text("status").$type<ParcelStatus>().notNull(),
    notes: text("notes").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("batches_agency_id_idx").on(table.agencyId),
    uniqueIndex("batches_agency_code_idx").on(table.agencyId, table.code),
  ]
);

export const parcels = pgTable(
  "parcels",
  {
    id: text("id").primaryKey(),
    agencyId: text("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    batchId: text("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    trackingCode: text("tracking_code").notNull(),
    clientName: text("client_name").notNull(),
    clientPhone: text("client_phone").notNull(),
    description: text("description").notNull(),
    weightKg: doublePrecision("weight_kg").notNull(),
    volumeCbm: doublePrecision("volume_cbm").notNull().default(0),
    amountFcfa: integer("amount_fcfa").notNull(),
    paymentStatus: text("payment_status").$type<PaymentStatus>().notNull(),
    status: text("status").$type<ParcelStatus>().notNull(),
    history: jsonb("history").$type<TrackingEvent[]>().notNull(),
    notifiedWhatsappAt: text("notified_whatsapp_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("parcels_tracking_code_idx").on(table.trackingCode),
    index("parcels_agency_id_idx").on(table.agencyId),
    index("parcels_batch_id_idx").on(table.batchId),
    index("parcels_client_phone_idx").on(table.clientPhone),
  ]
);

export const subscriptionEvents = pgTable(
  "subscription_events",
  {
    id: text("id").primaryKey(),
    agencyId: text("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    actorEmail: text("actor_email").notNull(),
    action: text("action").$type<SubscriptionAction>().notNull(),
    plan: text("plan").$type<PlanTier>().notNull(),
    amountFcfa: integer("amount_fcfa").notNull().default(0),
    note: text("note").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("sub_events_agency_id_idx").on(table.agencyId)]
);

export const revokedTokens = pgTable(
  "revoked_tokens",
  {
    jti: text("jti").primaryKey(),
    expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
    revokedAt: text("revoked_at").notNull(),
  },
  (table) => [index("revoked_tokens_exp_idx").on(table.expiresAt)]
);

export const rateLimits = pgTable("rate_limits", {
  bucketKey: text("bucket_key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: bigint("reset_at", { mode: "number" }).notNull(),
});
