"use client";
import * as React from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils/cn";

export function useQrDataUrl(value: string, opts?: { dark?: string; light?: string; size?: number }) {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 1, width: opts?.size ?? 512, errorCorrectionLevel: "M", color: { dark: opts?.dark ?? "#111827", light: opts?.light ?? "#FFFFFF" } })
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl(null));
    return () => {
      alive = false;
    };
  }, [value, opts?.dark, opts?.light, opts?.size]);
  return url;
}

export function QrCode({ value, className, label, dark, light }: { value: string; className?: string; label: string; dark?: string; light?: string }) {
  const url = useQrDataUrl(value, { dark, light });
  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-lg bg-white", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="size-full" />
      ) : (
        <div className="size-full animate-pulse bg-slate-100" aria-label="Génération du QR code" />
      )}
    </div>
  );
}
