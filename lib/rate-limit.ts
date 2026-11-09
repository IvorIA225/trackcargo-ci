import type { NextRequest } from "next/server";

interface Bucket {
  count: number;
  resetAt: number;
}

// Single-instance bounded store. For multi-instance serverless deployments,
// back this limiter with Upstash Redis (@upstash/ratelimit).
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
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

export function resetRateLimiterForTests(): void {
  buckets.clear();
}
