import {
  Agency,
  PARCEL_STATUS_META,
  ParcelStatus,
  PAYMENT_STATUS_META,
  PaymentStatus,
  PLAN_META,
  PlanTier,
  PlatformSettings,
  TransportMode,
} from "./types";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; details?: Record<string, string> };

const PHONE_REGEX = /^\+?[0-9\s\-().]{8,22}$/;
const BATCH_CODE_REGEX = /^[A-Z0-9-]{3,32}$/;
const DATE_ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TRACKING_CODE_QUERY_REGEX = /^TC-\d{4,6}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]?$/;

function cleanString(val: unknown, min: number, max: number): string | null {
  if (typeof val !== "string") return null;
  const trimmed = val.trim();
  if (trimmed.length < min || trimmed.length > max) return null;
  return trimmed;
}

export function isSafeHttpsUrl(raw: string): boolean {
  if (raw.length > 200) return false;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    return Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function validateTrackingQuery(
  rawQuery: string
): ValidationResult<{ kind: "code" | "phone"; normalized: string }> {
  const trimmed = rawQuery.trim();
  if (!trimmed || trimmed.length > 40) {
    return { ok: false, error: "Requête de suivi invalide." };
  }

  if (TRACKING_CODE_QUERY_REGEX.test(trimmed)) {
    return { ok: true, data: { kind: "code", normalized: trimmed.toUpperCase() } };
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 8 && digits.length <= 15) {
    return { ok: true, data: { kind: "phone", normalized: digits } };
  }

  return {
    ok: false,
    error:
      "Entrez un code de suivi complet (ex: TC-8841) ou un numéro complet d'au moins 8 chiffres.",
  };
}

export function validateAgencyPatch(
  body: unknown
): ValidationResult<Partial<Agency>> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Corps JSON invalide." };
  }

  const record = body as Record<string, unknown>;
  const patch: Partial<Agency> = {};
  const details: Record<string, string> = {};

  if (record.name !== undefined) {
    const v = cleanString(record.name, 2, 80);
    if (!v) details.name = "Nom d'agence invalide (2 à 80 caractères).";
    else patch.name = v;
  }
  if (record.commune !== undefined) {
    const v = cleanString(record.commune, 2, 50);
    if (!v) details.commune = "Commune invalide (2 à 50 caractères).";
    else patch.commune = v;
  }
  if (record.address !== undefined) {
    const v = cleanString(record.address, 4, 180);
    if (!v) details.address = "Adresse invalide (4 à 180 caractères).";
    else patch.address = v;
  }
  if (record.whatsappPhone !== undefined) {
    const v = cleanString(record.whatsappPhone, 8, 22);
    if (!v || !PHONE_REGEX.test(v)) {
      details.whatsappPhone = "Numéro WhatsApp invalide.";
    } else {
      patch.whatsappPhone = v;
    }
  }
  if (record.orangeMoneyNumber !== undefined) {
    const v = cleanString(record.orangeMoneyNumber, 8, 22);
    if (!v || !PHONE_REGEX.test(v)) {
      details.orangeMoneyNumber = "Numéro Orange Money invalide.";
    } else {
      patch.orangeMoneyNumber = v;
    }
  }
  if (record.waveLink !== undefined) {
    const v = cleanString(record.waveLink, 10, 200);
    if (!v || !isSafeHttpsUrl(v)) {
      details.waveLink = "Le lien Wave doit commencer par https://.";
    } else {
      patch.waveLink = v;
    }
  }
  if (record.ratePerKgAirFcfa !== undefined) {
    const n = Number(record.ratePerKgAirFcfa);
    if (!Number.isFinite(n) || n < 100 || n > 500000) {
      details.ratePerKgAirFcfa = "Tarif aérien invalide (100 à 500 000 FCFA).";
    } else {
      patch.ratePerKgAirFcfa = Math.round(n);
    }
  }
  if (record.ratePerCbmSeaFcfa !== undefined) {
    const n = Number(record.ratePerCbmSeaFcfa);
    if (!Number.isFinite(n) || n < 1000 || n > 10000000) {
      details.ratePerCbmSeaFcfa =
        "Tarif maritime invalide (1 000 à 10 000 000 FCFA).";
    } else {
      patch.ratePerCbmSeaFcfa = Math.round(n);
    }
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, error: "Validation échouée.", details };
  }
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Aucun champ valide à mettre à jour." };
  }
  return { ok: true, data: patch };
}

export function validateBatchCreate(body: unknown): ValidationResult<{
  code: string;
  mode: TransportMode;
  origin: string;
  destination: string;
  departureDate: string;
  etaDate: string;
  notes: string;
}> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Corps JSON invalide." };
  }
  const r = body as Record<string, unknown>;
  const details: Record<string, string> = {};

  const codeRaw = cleanString(r.code, 3, 32)?.toUpperCase();
  if (!codeRaw || !BATCH_CODE_REGEX.test(codeRaw)) {
    details.code =
      "Code du lot invalide (3 à 32 caractères alphanumériques et tirets).";
  }

  const mode: TransportMode = r.mode === "maritime" ? "maritime" : "aerien";
  if (r.mode !== undefined && r.mode !== "aerien" && r.mode !== "maritime") {
    details.mode = "Mode de transport invalide.";
  }

  const origin = cleanString(r.origin, 2, 120);
  if (!origin) details.origin = "Origine requise (2 à 120 caractères).";

  const destination = cleanString(r.destination, 2, 120);
  if (!destination) {
    details.destination = "Destination requise (2 à 120 caractères).";
  }

  const today = new Date().toISOString().slice(0, 10);
  const defaultEta = new Date(Date.now() + 14 * 86400000)
    .toISOString()
    .slice(0, 10);
  const departureDate =
    typeof r.departureDate === "string" && DATE_ISO_REGEX.test(r.departureDate)
      ? r.departureDate
      : today;
  const etaDate =
    typeof r.etaDate === "string" && DATE_ISO_REGEX.test(r.etaDate)
      ? r.etaDate
      : defaultEta;

  const notes =
    typeof r.notes === "string" ? r.notes.trim().slice(0, 500) : "";

  if (Object.keys(details).length > 0 || !codeRaw || !origin || !destination) {
    return { ok: false, error: "Validation du lot échouée.", details };
  }

  return {
    ok: true,
    data: {
      code: codeRaw,
      mode,
      origin,
      destination,
      departureDate,
      etaDate,
      notes,
    },
  };
}

export interface ValidatedParcelInput {
  batchId: string;
  clientName: string;
  clientPhone: string;
  description: string;
  weightKg: number;
  volumeCbm: number;
  amountFcfa: number;
}

export function validateSingleParcel(
  body: unknown,
  fallbackBatchId?: string
): ValidationResult<ValidatedParcelInput> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Colis invalide." };
  }
  const r = body as Record<string, unknown>;
  const details: Record<string, string> = {};

  const batchId =
    cleanString(r.batchId, 1, 60) || cleanString(fallbackBatchId, 1, 60);
  if (!batchId) details.batchId = "Lot invalide.";

  const clientName = cleanString(r.clientName, 2, 100);
  if (!clientName) details.clientName = "Nom client requis (2 à 100 car.).";

  const clientPhone = cleanString(r.clientPhone, 8, 22);
  if (
    !clientPhone ||
    !PHONE_REGEX.test(clientPhone) ||
    clientPhone.replace(/\D/g, "").length < 8
  ) {
    details.clientPhone = "Téléphone WhatsApp invalide (min. 8 chiffres).";
  }

  const description = cleanString(r.description, 2, 200);
  if (!description) details.description = "Description requise (2 à 200 car.).";

  const weightKg = Number(r.weightKg);
  if (!Number.isFinite(weightKg) || weightKg <= 0 || weightKg > 50000) {
    details.weightKg = "Poids invalide (0.1 à 50 000 kg).";
  }

  const volumeCbm = r.volumeCbm === undefined ? 0 : Number(r.volumeCbm);
  if (!Number.isFinite(volumeCbm) || volumeCbm < 0 || volumeCbm > 1000) {
    details.volumeCbm = "Volume CBM invalide (0 à 1 000).";
  }

  const amountFcfa = r.amountFcfa === undefined ? 0 : Number(r.amountFcfa);
  if (!Number.isFinite(amountFcfa) || amountFcfa < 0 || amountFcfa > 100000000) {
    details.amountFcfa = "Montant FCFA invalide.";
  }

  if (
    Object.keys(details).length > 0 ||
    !batchId ||
    !clientName ||
    !clientPhone ||
    !description
  ) {
    return { ok: false, error: "Validation du colis échouée.", details };
  }

  return {
    ok: true,
    data: {
      batchId,
      clientName,
      clientPhone,
      description,
      weightKg,
      volumeCbm,
      amountFcfa: Math.round(amountFcfa),
    },
  };
}

export function validateParcelPatch(body: unknown): ValidationResult<{
  status?: ParcelStatus;
  paymentStatus?: PaymentStatus;
  markWhatsappNotified?: boolean;
}> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Corps JSON invalide." };
  }
  const r = body as Record<string, unknown>;

  if (
    r.status !== undefined &&
    (typeof r.status !== "string" || !(r.status in PARCEL_STATUS_META))
  ) {
    return { ok: false, error: "Statut du colis invalide." };
  }
  if (
    r.paymentStatus !== undefined &&
    (typeof r.paymentStatus !== "string" ||
      !(r.paymentStatus in PAYMENT_STATUS_META))
  ) {
    return { ok: false, error: "Statut de paiement invalide." };
  }

  return {
    ok: true,
    data: {
      status: r.status as ParcelStatus | undefined,
      paymentStatus: r.paymentStatus as PaymentStatus | undefined,
      markWhatsappNotified:
        typeof r.markWhatsappNotified === "boolean"
          ? r.markWhatsappNotified
          : undefined,
    },
  };
}

export function validateSlugParam(raw: unknown): ValidationResult<string> {
  if (typeof raw !== "string") {
    return { ok: false, error: "Identifiant d'agence invalide." };
  }
  const clean = raw.trim().toLowerCase();
  if (!SLUG_REGEX.test(clean)) {
    return { ok: false, error: "Identifiant d'agence invalide." };
  }
  return { ok: true, data: clean };
}

export function validateRegisterInput(body: unknown): ValidationResult<{
  agencyName: string;
  commune: string;
  whatsappPhone: string;
  fullName: string;
  email: string;
  password: string;
  plan: PlanTier;
}> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Corps JSON invalide." };
  }
  const r = body as Record<string, unknown>;
  const details: Record<string, string> = {};

  const agencyName = cleanString(r.agencyName, 2, 80);
  if (!agencyName) {
    details.agencyName = "Nom d'agence requis (2 à 80 caractères).";
  }

  const commune = cleanString(r.commune, 2, 50);
  if (!commune) {
    details.commune = "Commune ou ville requise (2 à 50 caractères).";
  }

  const whatsappPhone = cleanString(r.whatsappPhone, 8, 22);
  if (
    !whatsappPhone ||
    !PHONE_REGEX.test(whatsappPhone) ||
    whatsappPhone.replace(/\D/g, "").length < 8
  ) {
    details.whatsappPhone =
      "Numéro WhatsApp invalide (au moins 8 chiffres requis).";
  }

  const emailRaw = cleanString(r.email, 5, 120)?.toLowerCase();
  if (!emailRaw || !EMAIL_REGEX.test(emailRaw)) {
    details.email = "Adresse email professionnelle invalide.";
  }

  const password = typeof r.password === "string" ? r.password : "";
  if (password.length < 8 || password.length > 200) {
    details.password =
      "Le mot de passe doit contenir entre 8 et 200 caractères.";
  }

  const fullNameInput = cleanString(r.fullName, 2, 80);
  const fullName =
    fullNameInput || (agencyName ? `Gérant ${agencyName}` : "Gérant Agence");

  let plan: PlanTier = "PRO";
  if (r.plan !== undefined) {
    if (typeof r.plan === "string" && r.plan in PLAN_META) {
      plan = r.plan as PlanTier;
    } else {
      details.plan = "Forfait sélectionné invalide.";
    }
  }

  if (
    Object.keys(details).length > 0 ||
    !agencyName ||
    !commune ||
    !whatsappPhone ||
    !emailRaw
  ) {
    return { ok: false, error: "Validation de l'inscription échouée.", details };
  }

  return {
    ok: true,
    data: {
      agencyName,
      commune,
      whatsappPhone,
      fullName,
      email: emailRaw,
      password,
      plan,
    },
  };
}

export function validateLoginInput(body: unknown): ValidationResult<{
  email: string | null;
  password: string;
}> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Requête d'authentification invalide." };
  }
  const r = body as Record<string, unknown>;
  const password = typeof r.password === "string" ? r.password : "";
  if (!password || password.length > 200) {
    return { ok: false, error: "Mot de passe requis." };
  }
  if (r.email === undefined || r.email === null || r.email === "") {
    return { ok: true, data: { email: null, password } };
  }
  const email = cleanString(r.email, 5, 120)?.toLowerCase();
  if (!email || !EMAIL_REGEX.test(email)) {
    return { ok: false, error: "Adresse email invalide." };
  }
  return { ok: true, data: { email, password } };
}

export function validateSuperAdminAction(body: unknown): ValidationResult<{
  action:
    | "ACTIVATE_30D"
    | "SET_PLAN"
    | "SUSPEND"
    | "REACTIVATE"
    | "EXPIRE_NOW";
  plan?: PlanTier;
  note?: string;
}> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Corps JSON invalide." };
  }
  const r = body as Record<string, unknown>;
  const allowedActions = new Set([
    "ACTIVATE_30D",
    "SET_PLAN",
    "SUSPEND",
    "REACTIVATE",
    "EXPIRE_NOW",
  ]);
  if (typeof r.action !== "string" || !allowedActions.has(r.action)) {
    return { ok: false, error: "Action Super Admin invalide." };
  }
  const action = r.action as
    | "ACTIVATE_30D"
    | "SET_PLAN"
    | "SUSPEND"
    | "REACTIVATE"
    | "EXPIRE_NOW";

  let plan: PlanTier | undefined;
  if (r.plan !== undefined) {
    if (typeof r.plan !== "string" || !(r.plan in PLAN_META)) {
      return { ok: false, error: "Forfait invalide." };
    }
    plan = r.plan as PlanTier;
  }
  if (action === "SET_PLAN" && !plan) {
    return { ok: false, error: "Le forfait cible est requis." };
  }

  const note =
    typeof r.note === "string" ? r.note.trim().slice(0, 240) : undefined;

  return { ok: true, data: { action, plan, note } };
}

export function validatePlatformSettingsPatch(
  body: unknown
): ValidationResult<
  Partial<
    Pick<
      PlatformSettings,
      | "founderName"
      | "founderWhatsapp"
      | "founderWaveLink"
      | "founderOmNumber"
    >
  >
> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Corps JSON invalide." };
  }
  const r = body as Record<string, unknown>;
  const patch: Partial<
    Pick<
      PlatformSettings,
      | "founderName"
      | "founderWhatsapp"
      | "founderWaveLink"
      | "founderOmNumber"
    >
  > = {};
  const details: Record<string, string> = {};

  if (r.founderName !== undefined) {
    const v = cleanString(r.founderName, 2, 80);
    if (!v) details.founderName = "Nom invalide (2 à 80 caractères).";
    else patch.founderName = v;
  }
  if (r.founderWhatsapp !== undefined) {
    const v = cleanString(r.founderWhatsapp, 8, 22);
    if (!v || !PHONE_REGEX.test(v)) {
      details.founderWhatsapp = "Numéro WhatsApp fondateur invalide.";
    } else {
      patch.founderWhatsapp = v;
    }
  }
  if (r.founderOmNumber !== undefined) {
    const v = cleanString(r.founderOmNumber, 8, 22);
    if (!v || !PHONE_REGEX.test(v)) {
      details.founderOmNumber = "Numéro Orange Money invalide.";
    } else {
      patch.founderOmNumber = v;
    }
  }
  if (r.founderWaveLink !== undefined) {
    const v = cleanString(r.founderWaveLink, 10, 200);
    if (!v || !isSafeHttpsUrl(v)) {
      details.founderWaveLink = "Le lien Wave doit commencer par https://.";
    } else {
      patch.founderWaveLink = v;
    }
  }

  if (Object.keys(details).length > 0) {
    return { ok: false, error: "Validation échouée.", details };
  }
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "Aucun champ valide fourni." };
  }
  return { ok: true, data: patch };
}
