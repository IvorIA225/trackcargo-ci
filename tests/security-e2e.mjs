import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PROJECT_DIR = process.cwd();
const PORT = 3211;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const TEST_SECRET = "e2e-security-session-secret-key-min-32chars";
const TEST_PASSWORD = "E2E-Strong-Password-2026!";
const FOUNDER_EMAIL = "njeanromuald@gmail.com";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForServer(timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/session`);
      if (res.ok) return;
    } catch {
      // wait
    }
    await sleep(300);
  }
  throw new Error("Timed out waiting for Next.js production server");
}

function extractCookie(setCookieHeader) {
  assert.ok(setCookieHeader, "Expected Set-Cookie header");
  assert.match(setCookieHeader, /HttpOnly/i);
  assert.match(setCookieHeader, /Secure/i);
  assert.match(setCookieHeader, /SameSite=Lax/i);
  return setCookieHeader.split(";")[0];
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "trackcargo-e2e-"));
  const tempDb = path.join(tempDir, "trackcargo.json");
  const nextBin = path.join(PROJECT_DIR, "node_modules", "next", "dist", "bin", "next");

  const salt = crypto.randomBytes(16).toString("hex");
  const testHash = `scrypt:${salt}:${crypto
    .scryptSync(TEST_PASSWORD, salt, 64)
    .toString("hex")}`;

  const env = {
    ...process.env,
    NODE_ENV: "production",
    TRACKCARGO_DB_PATH: tempDb,
    TRACKCARGO_SESSION_SECRET: TEST_SECRET,
    TRACKCARGO_ADMIN_PASSWORD: TEST_PASSWORD,
    TRACKCARGO_ADMIN_PASSWORD_HASH: testHash,
    SUPER_ADMIN_EMAIL: FOUNDER_EMAIL,
  };
  // Force E2E harness onto the isolated local temp JSON DB even if DATABASE_URL exists in shell
  delete env.DATABASE_URL;
  delete env.POSTGRES_URL;

  const server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    cwd: PROJECT_DIR,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  server.stderr.on("data", (d) => {
    stderr += d.toString();
  });

  try {
    await waitForServer();

    // 1. Security Headers verification
    const homeRes = await fetch(`${BASE_URL}/`);
    assert.equal(homeRes.status, 200);
    assert.equal(homeRes.headers.get("x-frame-options"), "DENY");
    assert.equal(homeRes.headers.get("x-content-type-options"), "nosniff");
    assert.equal(
      homeRes.headers.get("referrer-policy"),
      "strict-origin-when-cross-origin"
    );
    assert.equal(homeRes.headers.get("x-powered-by"), null);
    const csp = homeRes.headers.get("content-security-policy") || "";
    assert.ok(csp.includes("default-src 'self'"), "CSP default-src missing");
    assert.ok(!csp.includes("unsafe-eval"), "CSP must not enable unsafe-eval in prod");
    console.log("OK [headers] OWASP headers verified on /");

    // 2. Public pages return 200
    for (const route of [
      "/register",
      "/login",
      "/track",
      "/track/TC-8841",
      "/a/ivoire-cargo-express",
      "/dashboard",
      "/super-admin",
    ]) {
      const r = await fetch(`${BASE_URL}${route}`);
      assert.equal(r.status, 200, `Expected 200 on ${route}`);
    }
    const missingSlugRes = await fetch(
      `${BASE_URL}/api/public/agence-inexistante-xyz/track`
    );
    assert.equal(missingSlugRes.status, 404);
    console.log("OK [pages] Public & SaaS portal routes return expected status codes");

    // 3. Unauthenticated admin & super-admin endpoints MUST return 401
    const unauthChecks = [
      ["GET", "/api/overview"],
      ["PATCH", "/api/agency", { name: "Hijack" }],
      ["POST", "/api/batches", { code: "HACK", origin: "X", destination: "Y" }],
      ["PATCH", "/api/batches/batch-air-1", { status: "LIVRE" }],
      [
        "POST",
        "/api/packages",
        {
          batchId: "batch-air-1",
          clientName: "Evil",
          clientPhone: "+2250700000000",
          description: "Evil",
          weightKg: 1,
        },
      ],
      ["PATCH", "/api/packages/pcl-1", { paymentStatus: "PAYE_WAVE" }],
      ["POST", "/api/reset"],
      ["GET", "/api/super-admin/agencies"],
      ["PATCH", "/api/super-admin/agencies", { founderOmNumber: "+2250700000000" }],
      ["PATCH", "/api/super-admin/agencies/ag-abidjan-1", { action: "ACTIVATE_30D" }],
    ];

    for (const [method, endpoint, body] of unauthChecks) {
      const r = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      assert.equal(
        r.status,
        401,
        `Expected 401 for unauthenticated ${method} ${endpoint}, got ${r.status}`
      );
    }
    console.log("OK [authz] All protected agency & super-admin routes return 401");

    // 4. Public /api/agency and /api/public/[slug]/track minimize exposed fields
    const pubAgency = await (await fetch(`${BASE_URL}/api/agency`)).json();
    assert.equal(pubAgency.name, "Ivoire Cargo Express");
    assert.equal(pubAgency.slug, "ivoire-cargo-express");
    assert.equal("ratePerKgAirFcfa" in pubAgency, false);
    assert.equal("id" in pubAgency, false);
    assert.equal("subscriptionStatus" in pubAgency, false);

    // 5. Public /api/track rejects short fishing and masks PII
    const fishRes = await fetch(`${BASE_URL}/api/track?q=070812`);
    assert.equal(fishRes.status, 400);

    const trackRes = await fetch(`${BASE_URL}/api/track?q=TC-8841`);
    assert.equal(trackRes.status, 200);
    const trackData = await trackRes.json();
    assert.equal(trackData.parcels.length, 1);
    assert.equal(trackData.parcels[0].clientName, "Awa K.");
    assert.equal(trackData.parcels[0].clientPhone, "+22507••••56");
    console.log("OK [privacy] Public endpoints omit internal fields & mask client PII");

    // 6. Brute-force rate limit triggers 429 on 11th failed attempt
    for (let i = 0; i < 10; i++) {
      const failRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.77",
        },
        body: JSON.stringify({ password: "wrong-password" }),
      });
      assert.equal(failRes.status, 401);
    }
    const throttledRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.77",
      },
      body: JSON.stringify({ password: "wrong-password" }),
    });
    assert.equal(throttledRes.status, 429);
    assert.ok(throttledRes.headers.get("retry-after"));

    // Spoofed leftmost IP prepended to X-Forwarded-For must NOT bypass IP throttling
    const spoofedXffRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "203.0.113.9, 198.51.100.77",
      },
      body: JSON.stringify({ password: "wrong-password" }),
    });
    assert.equal(spoofedXffRes.status, 429);

    // Cross-site / forged Origin CSRF attempts MUST be rejected with 403
    const csrfOriginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
        "Sec-Fetch-Site": "cross-site",
      },
      body: JSON.stringify({ password: "wrong-password" }),
    });
    assert.equal(csrfOriginRes.status, 403);
    console.log("OK [rate-limit+csrf] Auth brute-force, XFF rightmost IP & CSRF origin checks verified");

    // 7. Self-service multi-tenant registration (Agency A + duplicate email + duplicate slug Agency B)
    const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.90",
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify({
        agencyName: "Transit Alpha Express",
        commune: "Treichville",
        whatsappPhone: "+2250701020304",
        fullName: "Kouame Yao",
        email: "alpha@transit-alpha.ci",
        password: "Alpha-Password-2026!",
        plan: "PRO",
      }),
    });
    assert.equal(regARes.status, 201);
    const cookieA = extractCookie(regARes.headers.get("set-cookie"));
    const regAData = await regARes.json();
    assert.equal(regAData.role, "AGENCY_ADMIN");
    assert.equal(regAData.agency.slug, "transit-alpha-express");
    assert.equal(regAData.subscription.effectiveStatus, "TRIAL");
    assert.ok(regAData.subscription.daysRemaining >= 13);

    // Duplicate email rejected with 409
    const dupEmailRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.91",
      },
      body: JSON.stringify({
        agencyName: "Autre Nom",
        commune: "Marcory",
        whatsappPhone: "+2250701020399",
        fullName: "Autre",
        email: "alpha@transit-alpha.ci",
        password: "Alpha-Password-2026!",
        plan: "DEPART",
      }),
    });
    assert.equal(dupEmailRes.status, 409);

    // Register Agency B with identical agency name -> collision-free slug
    const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.92",
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify({
        agencyName: "Transit Alpha Express",
        commune: "Yopougon",
        whatsappPhone: "+2250506070809",
        fullName: "Konan Serge",
        email: "beta@transit-beta.ci",
        password: "Beta-Password-2026!",
        plan: "DEPART",
      }),
    });
    assert.equal(regBRes.status, 201);
    const cookieB = extractCookie(regBRes.headers.get("set-cookie"));
    const regBData = await regBRes.json();
    assert.equal(regBData.agency.slug, "transit-alpha-express-2");

    // Agency A email + password login works and /api/auth/session resolves tenant context
    const loginARes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.93",
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify({
        email: "alpha@transit-alpha.ci",
        password: "Alpha-Password-2026!",
      }),
    });
    assert.equal(loginARes.status, 200);
    const loginACookie = extractCookie(loginARes.headers.get("set-cookie"));
    const sessionARes = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: loginACookie },
    });
    const sessionAData = await sessionARes.json();
    assert.equal(sessionAData.authenticated, true);
    assert.equal(sessionAData.role, "AGENCY_ADMIN");
    assert.equal(sessionAData.agencySlug, "transit-alpha-express");
    console.log("OK [onboarding] Self-service registration, slug dedup, and agency login verified");

    // 8. Tenant CRUD + strict cross-tenant isolation
    const badWave = await fetch(`${BASE_URL}/api/agency`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({ waveLink: "javascript:alert(document.cookie)" }),
    });
    assert.equal(badWave.status, 422);

    const overviewA0 = await (
      await fetch(`${BASE_URL}/api/overview`, { headers: { Cookie: cookieA } })
    ).json();
    assert.equal(overviewA0.batches.length, 0);
    assert.equal(overviewA0.parcels.length, 0);

    const batchARes = await fetch(`${BASE_URL}/api/batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        code: "AIR-ALPHA-01",
        mode: "aerien",
        origin: "Guangzhou",
        destination: "Treichville",
      }),
    });
    assert.equal(batchARes.status, 201);
    const batchA = await batchARes.json();

    const pkgARes = await fetch(`${BASE_URL}/api/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        batchId: batchA.id,
        clientName: "Mariam Coulibaly",
        clientPhone: "+2250711223344",
        description: "2 cartons",
        weightKg: 10,
      }),
    });
    assert.equal(pkgARes.status, 201);
    const pkgA = await pkgARes.json();
    assert.equal(pkgA.amountFcfa, 85000);
    assert.match(
      pkgA.trackingCode,
      /^TC-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6,8}$/
    );

    // Prototype keys in status enum must be rejected (Object.hasOwn defense)
    const protoBatchRes = await fetch(`${BASE_URL}/api/batches/${batchA.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({ status: "toString" }),
    });
    assert.equal(protoBatchRes.status, 422);

    // Cross-tenant isolation checks from Agency B
    const bPatchBatchA = await fetch(`${BASE_URL}/api/batches/${batchA.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookieB },
      body: JSON.stringify({ status: "LIVRE" }),
    });
    assert.equal(bPatchBatchA.status, 404);

    const bAddPkgToBatchA = await fetch(`${BASE_URL}/api/packages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieB },
      body: JSON.stringify({
        batchId: batchA.id,
        clientName: "Cross Tenant",
        clientPhone: "+2250700001122",
        description: "Test",
        weightKg: 2,
      }),
    });
    assert.equal(bAddPkgToBatchA.status, 404);

    const bPatchPkgA = await fetch(`${BASE_URL}/api/packages/${pkgA.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookieB },
      body: JSON.stringify({ paymentStatus: "PAYE_WAVE" }),
    });
    assert.equal(bPatchPkgA.status, 404);

    // Agency A cannot reset prod/other data or open /api/super-admin
    const aReset = await fetch(`${BASE_URL}/api/reset`, {
      method: "POST",
      headers: { Cookie: cookieA },
    });
    assert.equal(aReset.status, 403);

    const aSuper = await fetch(`${BASE_URL}/api/super-admin/agencies`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(aSuper.status, 403);

    // Dedicated public portals /a/[slug] isolate tracking
    const pubTrackA = await fetch(
      `${BASE_URL}/api/public/${regAData.agency.slug}/track?q=${pkgA.trackingCode}`
    );
    assert.equal(pubTrackA.status, 200);
    const pubTrackAData = await pubTrackA.json();
    assert.equal(pubTrackAData.parcels.length, 1);
    assert.equal(pubTrackAData.parcels[0].clientName, "Mariam C.");

    const pubTrackB = await fetch(
      `${BASE_URL}/api/public/${regBData.agency.slug}/track?q=${pkgA.trackingCode}`
    );
    assert.equal(pubTrackB.status, 200);
    const pubTrackBData = await pubTrackB.json();
    assert.equal(pubTrackBData.parcels.length, 0);

    // Global /api/track resolves unique TC code across tenants
    const globalTrackA = await fetch(
      `${BASE_URL}/api/track?q=${pkgA.trackingCode}`
    );
    assert.equal(globalTrackA.status, 200);
    const globalTrackAData = await globalTrackA.json();
    assert.equal(globalTrackAData.parcels.length, 1);
    assert.equal(globalTrackAData.agency.slug, regAData.agency.slug);
    console.log("OK [isolation] Multi-tenant API + portal /a/[slug] isolation verified");

    // 9. Founder SUPER_ADMIN login + billing lifecycle (PAST_DUE 402, ACTIVATE_30D, SUSPEND 403)
    const superLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "198.51.100.88",
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify({
        email: FOUNDER_EMAIL,
        password: TEST_PASSWORD,
      }),
    });
    assert.equal(superLoginRes.status, 200);
    const superCookie = extractCookie(superLoginRes.headers.get("set-cookie"));
    const superLoginData = await superLoginRes.json();
    assert.equal(superLoginData.role, "SUPER_ADMIN");
    assert.equal(superLoginData.redirectTo, "/super-admin");

    const superListRes = await fetch(`${BASE_URL}/api/super-admin/agencies`, {
      headers: { Cookie: superCookie },
    });
    assert.equal(superListRes.status, 200);
    const superList = await superListRes.json();
    assert.ok(
      superList.agencies.some((a) => a.id === regAData.agency.id),
      "Super admin agency list should include newly registered Agency A"
    );

    const updateFounderSettings = await fetch(
      `${BASE_URL}/api/super-admin/agencies`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: superCookie },
        body: JSON.stringify({ founderName: "TrackCargo CI Billing" }),
      }
    );
    assert.equal(updateFounderSettings.status, 200);

    // Expire Agency A -> PAST_DUE locks writes with 402 while keeping /a/[slug] readable
    const expireRes = await fetch(
      `${BASE_URL}/api/super-admin/agencies/${regAData.agency.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: superCookie },
        body: JSON.stringify({ action: "EXPIRE_NOW" }),
      }
    );
    assert.equal(expireRes.status, 200);
    const expiredPayload = await expireRes.json();
    assert.equal(expiredPayload.resolved.effectiveStatus, "PAST_DUE");

    const lockedWriteRes = await fetch(`${BASE_URL}/api/batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({
        code: "AIR-BLOCKED",
        mode: "aerien",
        origin: "Guangzhou",
        destination: "Abidjan",
      }),
    });
    assert.equal(lockedWriteRes.status, 402);
    const lockedJson = await lockedWriteRes.json();
    assert.equal(lockedJson.code, "PAYMENT_REQUIRED");

    const portalDuringPastDue = await fetch(
      `${BASE_URL}/api/public/${regAData.agency.slug}/track?q=${pkgA.trackingCode}`
    );
    assert.equal(portalDuringPastDue.status, 200);

    // Activate +30 days -> unlocks Agency A writes immediately
    const activateRes = await fetch(
      `${BASE_URL}/api/super-admin/agencies/${regAData.agency.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: superCookie },
        body: JSON.stringify({ action: "ACTIVATE_30D", note: "Wave ref test" }),
      }
    );
    assert.equal(activateRes.status, 200);
    const activatedPayload = await activateRes.json();
    assert.equal(activatedPayload.resolved.effectiveStatus, "ACTIVE");
    assert.ok(activatedPayload.resolved.daysRemaining >= 29);

    const unlockedAgencyWrite = await fetch(`${BASE_URL}/api/agency`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookieA },
      body: JSON.stringify({ commune: "Marcory" }),
    });
    assert.equal(unlockedAgencyWrite.status, 200);

    // Suspend Agency A -> blocks dashboard AND /a/[slug] AND global /api/track
    const suspendRes = await fetch(
      `${BASE_URL}/api/super-admin/agencies/${regAData.agency.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: superCookie },
        body: JSON.stringify({ action: "SUSPEND" }),
      }
    );
    assert.equal(suspendRes.status, 200);

    const portalSuspended = await fetch(
      `${BASE_URL}/api/public/${regAData.agency.slug}/track?q=${pkgA.trackingCode}`
    );
    assert.equal(portalSuspended.status, 403);

    const overviewSuspended = await fetch(`${BASE_URL}/api/overview`, {
      headers: { Cookie: cookieA },
    });
    assert.equal(overviewSuspended.status, 403);

    const reactivateRes = await fetch(
      `${BASE_URL}/api/super-admin/agencies/${regAData.agency.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Cookie: superCookie },
        body: JSON.stringify({ action: "REACTIVATE" }),
      }
    );
    assert.equal(reactivateRes.status, 200);

    // Super admin demo reset + logout
    const resetRes = await fetch(`${BASE_URL}/api/reset`, {
      method: "POST",
      headers: { Cookie: superCookie },
    });
    assert.equal(resetRes.status, 200);

    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: superCookie },
    });
    assert.equal(logoutRes.status, 200);

    const afterLogout = await fetch(`${BASE_URL}/api/super-admin/agencies`, {
      headers: { Cookie: "" },
    });
    assert.equal(afterLogout.status, 401);

    // Server-side JTI revocation: replaying the logged-out superCookie MUST fail with 401
    const replayAfterLogout = await fetch(
      `${BASE_URL}/api/super-admin/agencies`,
      {
        headers: { Cookie: superCookie },
      }
    );
    assert.equal(replayAfterLogout.status, 401);

    const replaySessionAfterLogout = await fetch(
      `${BASE_URL}/api/auth/session`,
      {
        headers: { Cookie: superCookie },
      }
    );
    const replaySessionJson = await replaySessionAfterLogout.json();
    assert.equal(replaySessionJson.authenticated, false);
    console.log("OK [billing-e2e] PAST_DUE (402), +30d unlock, SUSPEND (403), reset, logout & JTI revocation verified");
    console.log("SECURITY_E2E_ALL_PASSED");
  } finally {
    server.kill("SIGTERM");
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    if (stderr.trim()) {
      console.error("Server stderr:", stderr);
    }
  }
}

main().catch((err) => {
  console.error("SECURITY E2E FAILED:", err);
  process.exit(1);
});
