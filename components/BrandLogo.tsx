import Image from "next/image";

export type BrandName = "wave" | "orange-money" | "whatsapp";

type BrandSize = "xs" | "sm" | "md" | "lg";

const SIZE_MAP: Record<BrandName, Record<BrandSize, { w: number; h: number }>> = {
  wave: {
    xs: { w: 16, h: 16 },
    sm: { w: 20, h: 20 },
    md: { w: 24, h: 24 },
    lg: { w: 30, h: 30 },
  },
  whatsapp: {
    xs: { w: 16, h: 16 },
    sm: { w: 20, h: 20 },
    md: { w: 24, h: 24 },
    lg: { w: 30, h: 30 },
  },
  "orange-money": {
    xs: { w: 22, h: 16 },
    sm: { w: 28, h: 20 },
    md: { w: 34, h: 24 },
    lg: { w: 42, h: 30 },
  },
};

const BRAND_META: Record<BrandName, { src: string; alt: string }> = {
  wave: { src: "/logos/wave.webp", alt: "Wave" },
  whatsapp: { src: "/logos/whatsapp.webp", alt: "WhatsApp" },
  "orange-money": { src: "/logos/orange-money.png", alt: "Orange Money" },
};

/**
 * Renders an official Wave, Orange Money, or WhatsApp logo mark with contrast-safe framing.
 */
export default function BrandLogo({
  brand,
  size = "sm",
  decorative = false,
  withWhiteSurface = brand === "orange-money",
  className = "",
}: {
  brand: BrandName;
  size?: BrandSize;
  decorative?: boolean;
  withWhiteSurface?: boolean;
  className?: string;
}) {
  const { src, alt } = BRAND_META[brand];
  const dims = SIZE_MAP[brand][size];

  const img = (
    <Image
      src={src}
      alt={decorative ? "" : alt}
      aria-hidden={decorative || undefined}
      width={dims.w}
      height={dims.h}
      loading="eager"
      unoptimized
      className={
        brand === "wave"
          ? "object-cover rounded-[4px] block shrink-0"
          : brand === "whatsapp"
          ? "object-contain rounded-full block shrink-0"
          : "object-contain block shrink-0"
      }
      style={{ width: dims.w, height: dims.h }}
    />
  );

  if (withWhiteSurface) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-[6px] bg-white px-1 py-0.5 shadow-[0_1px_2px_rgba(13,21,34,0.12)] ring-1 ring-black/8 shrink-0 ${className}`}
      >
        {img}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center justify-center shrink-0 ${className}`}>
      {img}
    </span>
  );
}
