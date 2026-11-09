import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { seedDatabaseIdempotent } from "./seed";

let cachedUrl: string | null = null;
let cachedSql: NeonQueryFunction<false, false> | null = null;
let cachedDb: NeonHttpDatabase<typeof schema> | null = null;
let initPromise: Promise<void> | null = null;

export function getDatabaseUrl(): string | null {
  if (process.env.TRACKCARGO_DB_PATH?.trim()) {
    return null;
  }
  const url =
    process.env.DATABASE_URL?.trim() || process.env.POSTGRES_URL?.trim();
  return url || null;
}

export function hasDatabaseUrl(): boolean {
  return Boolean(getDatabaseUrl());
}

export function shouldUsePostgres(): boolean {
  return hasDatabaseUrl();
}

export function isDatabaseMisconfiguredInProd(): boolean {
  return (
    process.env.VERCEL === "1" &&
    !process.env.TRACKCARGO_DB_PATH?.trim() &&
    !hasDatabaseUrl()
  );
}

export function getSqlClient(): NeonQueryFunction<false, false> {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL_NOT_CONFIGURED");
  }
  if (!cachedSql || cachedUrl !== url) {
    cachedUrl = url;
    cachedSql = neon(url);
    cachedDb = null;
    initPromise = null;
  }
  return cachedSql;
}

export function getDb(): NeonHttpDatabase<typeof schema> {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("DATABASE_URL_NOT_CONFIGURED");
  }
  const sql = getSqlClient();
  if (!cachedDb || cachedUrl !== url) {
    cachedDb = drizzle(sql, { schema });
  }
  return cachedDb;
}

export async function ensurePgInitialized(): Promise<
  NeonHttpDatabase<typeof schema>
> {
  const db = getDb();
  if (!initPromise) {
    initPromise = (async () => {
      const sql = getSqlClient();
      await sql.transaction([
        sql`
          CREATE TABLE IF NOT EXISTS platform_settings (
            id text PRIMARY KEY,
            founder_name text NOT NULL,
            founder_whatsapp text NOT NULL,
            founder_wave_link text NOT NULL,
            founder_om_number text NOT NULL,
            updated_at text NOT NULL
          )
        `,
        sql`
          CREATE TABLE IF NOT EXISTS agencies (
            id text PRIMARY KEY,
            slug text NOT NULL,
            name text NOT NULL,
            commune text NOT NULL,
            address text NOT NULL,
            whatsapp_phone text NOT NULL,
            wave_link text NOT NULL,
            orange_money_number text NOT NULL,
            rate_per_kg_air_fcfa integer NOT NULL,
            rate_per_cbm_sea_fcfa integer NOT NULL,
            plan text NOT NULL,
            subscription_status text NOT NULL,
            trial_ends_at text NOT NULL,
            current_period_end text,
            manual_suspended boolean NOT NULL DEFAULT false,
            is_demo boolean NOT NULL DEFAULT false,
            created_at text NOT NULL,
            updated_at text NOT NULL
          )
        `,
        sql`CREATE UNIQUE INDEX IF NOT EXISTS agencies_slug_idx ON agencies (slug)`,
        sql`
          CREATE TABLE IF NOT EXISTS users (
            id text PRIMARY KEY,
            agency_id text REFERENCES agencies(id) ON DELETE CASCADE,
            email text NOT NULL,
            password_hash text NOT NULL,
            full_name text NOT NULL,
            role text NOT NULL,
            created_at text NOT NULL
          )
        `,
        sql`CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email)`,
        sql`CREATE INDEX IF NOT EXISTS users_agency_id_idx ON users (agency_id)`,
        sql`
          CREATE TABLE IF NOT EXISTS batches (
            id text PRIMARY KEY,
            agency_id text NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
            code text NOT NULL,
            mode text NOT NULL,
            origin text NOT NULL,
            destination text NOT NULL,
            departure_date text NOT NULL,
            eta_date text NOT NULL,
            status text NOT NULL,
            notes text NOT NULL DEFAULT '',
            created_at text NOT NULL
          )
        `,
        sql`CREATE INDEX IF NOT EXISTS batches_agency_id_idx ON batches (agency_id)`,
        sql`CREATE UNIQUE INDEX IF NOT EXISTS batches_agency_code_idx ON batches (agency_id, code)`,
        sql`
          CREATE TABLE IF NOT EXISTS parcels (
            id text PRIMARY KEY,
            agency_id text NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
            batch_id text NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
            tracking_code text NOT NULL,
            client_name text NOT NULL,
            client_phone text NOT NULL,
            description text NOT NULL,
            weight_kg double precision NOT NULL,
            volume_cbm double precision NOT NULL DEFAULT 0,
            amount_fcfa integer NOT NULL,
            payment_status text NOT NULL,
            status text NOT NULL,
            history jsonb NOT NULL,
            notified_whatsapp_at text,
            created_at text NOT NULL
          )
        `,
        sql`CREATE UNIQUE INDEX IF NOT EXISTS parcels_tracking_code_idx ON parcels (tracking_code)`,
        sql`CREATE INDEX IF NOT EXISTS parcels_agency_id_idx ON parcels (agency_id)`,
        sql`CREATE INDEX IF NOT EXISTS parcels_batch_id_idx ON parcels (batch_id)`,
        sql`CREATE INDEX IF NOT EXISTS parcels_client_phone_idx ON parcels (client_phone)`,
        sql`
          CREATE TABLE IF NOT EXISTS subscription_events (
            id text PRIMARY KEY,
            agency_id text NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
            actor_email text NOT NULL,
            action text NOT NULL,
            plan text NOT NULL,
            amount_fcfa integer NOT NULL DEFAULT 0,
            note text NOT NULL DEFAULT '',
            created_at text NOT NULL
          )
        `,
        sql`CREATE INDEX IF NOT EXISTS sub_events_agency_id_idx ON subscription_events (agency_id)`,
      ]);

      await seedDatabaseIdempotent(db);
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
  return db;
}
