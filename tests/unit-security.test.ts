import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import type { NextRequest } from "next/server";
import {
  createSessionToken,
  hashPasswordScrypt,
  isAdminAuthConfigured,
  verifyAdminPassword,
  verifyScryptHash,
  verifySessionToken,
} from "../lib/auth";
import {
  checkRateLimit,
  getClientIp,
  resetRateLimiterForTests,
} from "../lib/rate-limit";
import { allocateUniqueSlug } from "../lib/repository";
import {
  bulkUpdateBatchStatus,
  createParcelRecord,
  generateTrackingCodeFromSet,
  maskClientName,
  maskPhone,
  readDb,
  searchTracking,
} from "../lib/store";
import { resolveEffectiveSubscription } from "../lib/subscription";
import {
  isSafeHttpsUrl,
  validateAgencyPatch,
  validateBatchCreate,
  validateParcelPatch,
  validateRegisterInput,
  validateSingleParcel,
  validateSuperAdminAction,
  validateTrackingQuery,
} from "../lib/validation";

const ORIGINAL_ENV = { ...process.env };
const tempFiles: string[] = [];

function useIsolatedTempDb(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "trackcargo-unit-"));
  const dbPath = path.join(dir, "trackcargo.json");
  tempFiles.push(dir);
  process.env.TRACKCARGO_DB_PATH = dbPath;
  return dbPath;
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  resetRateLimiterForTests();
  while (tempFiles.length > 0) {
    const dir = tempFiles.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("lib/auth security", () => {
  it("fails closed when session secret or admin password is missing", () => {
    delete process.env.TRACKCARGO_SESSION_SECRET;
    delete process.env.TRACKCARGO_ADMIN_PASSWORD;
    delete process.env.TRACKCARGO_ADMIN_PASSWORD_HASH;
    assert.equal(isAdminAuthConfigured(), false);
    assert.equal(createSessionToken(), null);
  });

  it("rejects weak session secrets under 32 chars", () => {
    process.env.TRACKCARGO_SESSION_SECRET = "too-short";
    process.env.TRACKCARGO_ADMIN_PASSWORD = "strong-password-123";
    assert.equal(isAdminAuthConfigured(), false);
    assert.equal(createSessionToken(), null);

    process.env.TRACKCARGO_SESSION_SECRET = "secret-of-24-chars-12345";
    assert.equal(isAdminAuthConfigured(), false);
    assert.equal(createSessionToken(), null);
  });

  it("issues, verifies, and rejects tampered or expired HMAC tokens", () => {
    process.env.TRACKCARGO_SESSION_SECRET = "super-secret-key-for-tests-32chars";
    process.env.TRACKCARGO_ADMIN_PASSWORD = "valid-password";
    const now = 1_700_000_000_000;
    const token = createSessionToken(now);
    assert.ok(token);

    const valid = verifySessionToken(token, now + 1000);
    assert.equal(valid?.sub, "agency-admin");

    const tampered = `${token.slice(0, -2)}XX`;
    assert.equal(verifySessionToken(tampered, now + 1000), null);

    // Expired after 12h + 1ms
    assert.equal(
      verifySessionToken(token, now + 12 * 60 * 60 * 1000 + 1),
      null
    );
  });

  it("verifies scrypt salted password hashes in constant time", () => {
    const stored = hashPasswordScrypt("AbidjanGroupage!2026");
    assert.ok(stored.startsWith("scrypt:"));
    assert.equal(verifyScryptHash("AbidjanGroupage!2026", stored), true);
    assert.equal(verifyScryptHash("wrong-password", stored), false);

    process.env.TRACKCARGO_ADMIN_PASSWORD_HASH = stored;
    assert.equal(verifyAdminPassword("AbidjanGroupage!2026"), true);
    assert.equal(verifyAdminPassword("wrong"), false);
  });
});

describe("lib/validation OWASP boundaries", () => {
  it("blocks javascript: and non-HTTPS URLs for waveLink", () => {
    assert.equal(isSafeHttpsUrl("javascript:alert(1)"), false);
    assert.equal(isSafeHttpsUrl("http://pay.wave.com/m/demo"), false);
    assert.equal(isSafeHttpsUrl("https://user:pass@pay.wave.com/m/demo"), false);
    assert.equal(isSafeHttpsUrl("https://pay.wave.com/m/M_ci_demo"), true);

    const rejected = validateAgencyPatch({ waveLink: "javascript:alert(1)" });
    assert.equal(rejected.ok, false);
  });

  it("prevents short numeric fishing on public tracking queries", () => {
    assert.equal(validateTrackingQuery("070812").ok, false);
    assert.equal(validateTrackingQuery("TC-88").ok, false);
    assert.equal(validateTrackingQuery("tc-8841").ok, true);
    assert.equal(validateTrackingQuery("0708123456").ok, true);
  });

  it("validates batch codes and rejects invalid parcel weights", () => {
    assert.equal(
      validateBatchCreate({
        code: "bad code!",
        mode: "aerien",
        origin: "Guangzhou",
        destination: "Abidjan",
      }).ok,
      false
    );
    assert.equal(
      validateSingleParcel({
        batchId: "batch-air-1",
        clientName: "Awa Koné",
        clientPhone: "+2250708123456",
        description: "Perruques",
        weightKg: -5,
      }).ok,
      false
    );
  });
});

describe("lib/rate-limit protection", () => {
  it("enforces window caps and recovers after window expires", () => {
    const now = 1_700_000_000_000;
    assert.equal(checkRateLimit("login", "1.2.3.4", 2, 60_000, now).allowed, true);
    assert.equal(checkRateLimit("login", "1.2.3.4", 2, 60_000, now + 10).allowed, true);
    const blocked = checkRateLimit("login", "1.2.3.4", 2, 60_000, now + 20);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSec >= 1);
    assert.equal(
      checkRateLimit("login", "1.2.3.4", 2, 60_000, now + 60_001).allowed,
      true
    );
  });
});

describe("lib/store PII minimization and consistency", () => {
  it("masks client PII in public searchTracking results", () => {
    useIsolatedTempDb();
    assert.equal(maskPhone("+2250708123456"), "+22507••••56");
    assert.equal(maskClientName("Awa Koné (Boutique Glamour)"), "Awa K.");

    const result = searchTracking("TC-8841");
    assert.equal(result.parcels.length, 1);
    assert.equal(result.parcels[0].clientName, "Awa K.");
    assert.equal(result.parcels[0].clientPhone, "+22507••••56");
    assert.equal("notifiedWhatsappAt" in result.parcels[0], false);
  });

  it("refuses orphan parcels and consistently updates batch status history", () => {
    useIsolatedTempDb();
    assert.throws(
      () =>
        createParcelRecord({
          batchId: "does-not-exist",
          clientName: "Test Client",
          clientPhone: "+2250700000000",
          description: "Test",
          weightKg: 3,
        }),
      /BATCH_NOT_FOUND/
    );

    const db = readDb();
    assert.ok(db.batches.length >= 3);

    const pkg = createParcelRecord({
      batchId: "batch-air-2",
      clientName: "Koffi Serge",
      clientPhone: "+2250554889900",
      description: "Accessoires",
      weightKg: 4,
    });
    assert.equal(pkg.amountFcfa, 34000);

    const bulk = bulkUpdateBatchStatus("batch-air-2", "PRET_RETRAIT");
    assert.ok(bulk.updatedCount >= 2);
    const updatedSearch = searchTracking(pkg.trackingCode);
    assert.equal(updatedSearch.parcels[0].status, "PRET_RETRAIT");
  });
});

describe("SaaS multi-tenant auth, slugs & subscription resolution", () => {
  it("issues multi-role session tokens with agencyId for agencies and null for SUPER_ADMIN", () => {
    process.env.TRACKCARGO_SESSION_SECRET = "super-secret-key-for-tests-32chars";
    const now = 1_700_000_000_000;

    const agencyToken = createSessionToken({
      userId: "usr-a",
      agencyId: "ag-a",
      role: "AGENCY_ADMIN",
      email: "gerant@transita.ci",
      now,
    });
    const parsedAgency = verifySessionToken(agencyToken, now + 1000);
    assert.equal(parsedAgency?.role, "AGENCY_ADMIN");
    assert.equal(parsedAgency?.agencyId, "ag-a");
    assert.equal(parsedAgency?.email, "gerant@transita.ci");

    const superToken = createSessionToken({
      userId: "super-admin",
      agencyId: null,
      role: "SUPER_ADMIN",
      email: "founder@trackcargo.ci",
      now,
    });
    const parsedSuper = verifySessionToken(superToken, now + 1000);
    assert.equal(parsedSuper?.role, "SUPER_ADMIN");
    assert.equal(parsedSuper?.agencyId, null);
  });

  it("allocates collision-free slugs without reserved route names", () => {
    const existing = ["ivoire-cargo", "ivoire-cargo-2", "admin-cargo"];
    assert.equal(allocateUniqueSlug(existing, "Ivoire Cargo"), "ivoire-cargo-3");
    assert.equal(allocateUniqueSlug(existing, "Élite Logistique CI"), "elite-logistique-ci");
    assert.equal(allocateUniqueSlug(existing, "Admin"), "admin-cargo-2");
  });

  it("resolves TRIAL, ACTIVE, PAST_DUE, and SUSPENDED states cleanly", () => {
    const now = new Date("2026-11-10T12:00:00.000Z").getTime();

    const activeTrial = resolveEffectiveSubscription(
      {
        plan: "PRO",
        subscriptionStatus: "TRIAL",
        trialEndsAt: new Date(now + 5 * 86400_000).toISOString(),
        currentPeriodEnd: null,
        manualSuspended: false,
      },
      now
    );
    assert.equal(activeTrial.effectiveStatus, "TRIAL");
    assert.equal(activeTrial.canWriteDashboard, true);
    assert.equal(activeTrial.canViewPublicPortal, true);
    assert.equal(activeTrial.daysRemaining, 5);

    const expiredTrial = resolveEffectiveSubscription(
      {
        plan: "DEPART",
        subscriptionStatus: "TRIAL",
        trialEndsAt: new Date(now - 60_000).toISOString(),
        currentPeriodEnd: null,
        manualSuspended: false,
      },
      now
    );
    assert.equal(expiredTrial.effectiveStatus, "PAST_DUE");
    assert.equal(expiredTrial.canWriteDashboard, false);
    assert.equal(expiredTrial.canViewPublicPortal, true);
    assert.equal(expiredTrial.planPriceFcfa, 35000);

    const expiredPaid = resolveEffectiveSubscription(
      {
        plan: "MULTI",
        subscriptionStatus: "ACTIVE",
        trialEndsAt: new Date(now - 30 * 86400_000).toISOString(),
        currentPeriodEnd: new Date(now - 1000).toISOString(),
        manualSuspended: false,
      },
      now
    );
    assert.equal(expiredPaid.effectiveStatus, "PAST_DUE");
    assert.equal(expiredPaid.canWriteDashboard, false);
    assert.equal(expiredPaid.canViewPublicPortal, true);

    const suspended = resolveEffectiveSubscription(
      {
        plan: "PRO",
        subscriptionStatus: "ACTIVE",
        trialEndsAt: new Date(now + 10 * 86400_000).toISOString(),
        currentPeriodEnd: new Date(now + 20 * 86400_000).toISOString(),
        manualSuspended: true,
      },
      now
    );
    assert.equal(suspended.effectiveStatus, "SUSPENDED");
    assert.equal(suspended.canWriteDashboard, false);
    assert.equal(suspended.canViewPublicPortal, false);
  });

  it("validates self-service registration and super-admin actions", () => {
    assert.equal(
      validateRegisterInput({
        agencyName: "Babi Freight",
        commune: "Marcory",
        whatsappPhone: "+2250701020304",
        email: "contact@babifreight.ci",
        password: "short",
      }).ok,
      false
    );
    const okReg = validateRegisterInput({
      agencyName: "Babi Freight",
      commune: "Marcory",
      whatsappPhone: "+2250701020304",
      email: "contact@babifreight.ci",
      password: "StrongPassword!2026",
    });
    assert.equal(okReg.ok, true);

    assert.equal(
      validateSuperAdminAction({ action: "SET_PLAN" }).ok,
      false
    );
    assert.equal(
      validateSuperAdminAction({ action: "ACTIVATE_30D", plan: "PRO" }).ok,
      true
    );
  });

  it("blocks prototype-chain enum bypasses, uses high-entropy tracking codes, and resists XFF spoofing", () => {
    assert.equal(validateParcelPatch({ status: "toString" }).ok, false);
    assert.equal(
      validateParcelPatch({ paymentStatus: "constructor" }).ok,
      false
    );
    assert.equal(
      validateSuperAdminAction({
        action: "ACTIVATE_30D",
        plan: "valueOf",
      }).ok,
      false
    );

    const code = generateTrackingCodeFromSet(new Set());
    assert.match(code, /^TC-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6,8}$/);
    assert.equal(validateTrackingQuery(code).ok, true);
    assert.equal(validateTrackingQuery("TC-AB12").ok, false);

    const spoofedReq = {
      headers: new Headers({ "x-forwarded-for": "1.2.3.4, 198.51.100.42" }),
    } as unknown as NextRequest;
    assert.equal(getClientIp(spoofedReq), "198.51.100.42");

    const vercelReq = {
      headers: new Headers({
        "x-forwarded-for": "1.2.3.4",
        "x-vercel-forwarded-for": "203.0.113.10",
      }),
    } as unknown as NextRequest;
    assert.equal(getClientIp(vercelReq), "203.0.113.10");
  });
});
