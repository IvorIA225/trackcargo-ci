import {
  Agency,
  PLAN_META,
  ResolvedSubscriptionState,
  SubscriptionStatus,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_TRIAL_DAYS = 14;

export function resolveEffectiveSubscription(
  agency: Pick<
    Agency,
    | "plan"
    | "subscriptionStatus"
    | "trialEndsAt"
    | "currentPeriodEnd"
    | "manualSuspended"
  >,
  nowMs = Date.now()
): ResolvedSubscriptionState {
  const planMeta = PLAN_META[agency.plan] || PLAN_META.PRO;

  if (agency.manualSuspended || agency.subscriptionStatus === "SUSPENDED") {
    return {
      effectiveStatus: "SUSPENDED",
      canWriteDashboard: false,
      canViewPublicPortal: false,
      daysRemaining: 0,
      expiresAt: agency.currentPeriodEnd || agency.trialEndsAt,
      plan: agency.plan,
      planPriceFcfa: planMeta.priceFcfa,
      planLabel: planMeta.label,
    };
  }

  if (agency.subscriptionStatus === "PAST_DUE") {
    return {
      effectiveStatus: "PAST_DUE",
      canWriteDashboard: false,
      canViewPublicPortal: true,
      daysRemaining: 0,
      expiresAt: agency.currentPeriodEnd || agency.trialEndsAt,
      plan: agency.plan,
      planPriceFcfa: planMeta.priceFcfa,
      planLabel: planMeta.label,
    };
  }

  let effectiveStatus: SubscriptionStatus = "PAST_DUE";
  let expiresAt: string | null = null;
  let daysRemaining = 0;

  if (agency.subscriptionStatus === "ACTIVE") {
    expiresAt = agency.currentPeriodEnd;
    const endMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
    if (Number.isFinite(endMs) && endMs > nowMs) {
      effectiveStatus = "ACTIVE";
      daysRemaining = Math.max(1, Math.ceil((endMs - nowMs) / DAY_MS));
    } else {
      effectiveStatus = "PAST_DUE";
    }
  } else {
    expiresAt = agency.trialEndsAt;
    const trialMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
    if (Number.isFinite(trialMs) && trialMs > nowMs) {
      effectiveStatus = "TRIAL";
      daysRemaining = Math.max(1, Math.ceil((trialMs - nowMs) / DAY_MS));
    } else {
      effectiveStatus = "PAST_DUE";
    }
  }

  const canWriteDashboard =
    effectiveStatus === "TRIAL" || effectiveStatus === "ACTIVE";

  return {
    effectiveStatus,
    canWriteDashboard,
    canViewPublicPortal: true,
    daysRemaining,
    expiresAt,
    plan: agency.plan,
    planPriceFcfa: planMeta.priceFcfa,
    planLabel: planMeta.label,
  };
}

export function computeExtendedPeriodEnd(
  currentPeriodEnd: string | null,
  daysToAdd = 30,
  nowMs = Date.now()
): string {
  const existingMs = currentPeriodEnd ? Date.parse(currentPeriodEnd) : Number.NaN;
  const baseMs =
    Number.isFinite(existingMs) && existingMs > nowMs ? existingMs : nowMs;
  return new Date(baseMs + daysToAdd * DAY_MS).toISOString();
}
