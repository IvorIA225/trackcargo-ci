import {
  Agency,
  Batch,
  Parcel,
  PARCEL_STATUS_META,
  PAYMENT_STATUS_META,
} from "./types";

export function formatFcfa(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;
}

export function normalizePhoneClient(phone: string): string {
  return phone.replace(/[\s\-().]/g, "").replace(/^00/, "+");
}

export function formatDateFr(iso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function buildWhatsappClientLink(
  parcel: Parcel,
  agency: Agency,
  batch?: Batch,
  originUrl?: string
): string {
  const cleanPhone = normalizePhoneClient(parcel.clientPhone).replace(/^\+/, "");
  const trackPath = agency.slug
    ? `/a/${agency.slug}?q=${encodeURIComponent(parcel.trackingCode)}`
    : `/track/${parcel.trackingCode}`;
  const trackUrl = originUrl ? `${originUrl}${trackPath}` : trackPath;
  const statusLabel = PARCEL_STATUS_META[parcel.status].label;
  const paymentNote =
    parcel.paymentStatus === "IMPAYE"
      ? `Frais de fret : *${formatFcfa(parcel.amountFcfa)}* (Payable par Wave/OM ou au retrait)`
      : `Statut : *${PAYMENT_STATUS_META[parcel.paymentStatus].label}*`;

  const lines = [
    `Bonjour *${parcel.clientName}*`,
    `Mise à jour de votre colis *${parcel.trackingCode}* chez *${agency.name}* (${agency.commune}) :`,
    ``,
    `Contenu : ${parcel.description} (${parcel.weightKg} kg)`,
    batch ? `Lot : ${batch.code} (${batch.origin})` : "",
    `Statut actuel : *${statusLabel}*`,
    paymentNote,
    ``,
    `Suivez votre colis en direct et téléchargez votre reçu ici :`,
    trackUrl,
    ``,
    `Entrepôt : ${agency.address}`,
  ].filter(Boolean);

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(lines.join("\n"))}`;
}
