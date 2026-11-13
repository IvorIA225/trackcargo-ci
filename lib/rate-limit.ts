import type { NextRequest } from "next/server";
import {
  ensurePgInitialized,
  getSqlClient,
  shouldUsePostgres,
} from "../db";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export function getClientIp(request: NextRequest): string {
  const vercelIp = request.headers
    .get("x-vercel-forwarded-for")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .at(-1);
  if (vercelIp) return vercelIp.slice(0, 64);

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);

  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp.slice(0, 64);

  // Use the rightmost entry in X-Forwarded-For so spoofed leftmost values
  // prepended by a client cannot bypass per-IP rate limiting behind a proxy.
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const rightmost = parts.at(-1);
    if (rightmost) return rightmost.slice(0, 64);
  }

  return "local-client";
}

export function checkRateLimit(
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
} {
  const compositeKey = `${scope}:${key}`;
  const current = buckets.get(compositeKey);

  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, v] of buckets.entries()) {
        if (v.resetAt <= now) buckets.delete(k);
      }
      if (buckets.size >= MAX_BUCKETS) {
        buckets.clear();
      }
    }
    buckets.set(compositeKey, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSec: Math.ceil(windowMs / 1000),
    };
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export async function checkDurableRateLimit(
  scope: string,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): Promise<{
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}> {
  const local = checkRateLimit(scope, key, limit, windowMs, now);
  if (!local.allowed || !shouldUsePostgres()) {
    return local;
  }

  try {
    await ensurePgInitialized();
    const sql = getSqlClient();
    const compositeKey = `${scope}:${key}`;
    const nextResetAt = now + windowMs;
    const rows = (await sql`
      INSERT INTO rate_limits (bucket_key, count, reset_at)
      VALUES (${compositeKey}, 1, ${nextResetAt})
      ON CONFLICT (bucket_key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.reset_at <= ${now} THEN 1
          ELSE rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN rate_limits.reset_at <= ${now} THEN ${nextResetAt}
          ELSE rate_limits.reset_at
        END
      RETURNING count, reset_at
    `) as Array<{ count: number | string; reset_at: number | string }>;

    const row = rows[0];
    if (!row) return local;
    const count = Number(row.count);
    const resetAt = Number(row.reset_at);
    const retryAfterSec = Math.max(1, Math.ceil((resetAt - now) / 1000));

    // Opportunistic bounded cleanup (~2% of calls)
    if (now % 50 === 0) {
      void sql`DELETE FROM rate_limits WHERE reset_at <= ${now - 3_600_000}`.catch(
        () => {}
      );
    }

    if (count > limit) {
      return { allowed: false, remaining: 0, retryAfterSec };
    }
    return {
      allowed: true,
      remaining: Math.max(0, limit - count),
      retryAfterSec,
    };
  } catch {
    return local;
  }
}

export function resetRateLimiterForTests(): void {
  buckets.clear();
}
