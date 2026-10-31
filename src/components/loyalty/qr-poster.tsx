"use client";
import * as React from "react";
import { toast } from "sonner";
import { Download, Printer, Copy, Share2, FileImage, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQrDataUrl } from "./qr-code";
import { MerchantLogo } from "./merchant-logo";

interface Props {
  url: string;
  merchantName: string;
  logo: { icon: string; imageDataUrl?: string };
  colors: { primary: string; text: string; accent: string };
  headline: string;
  rewardText: string;
  slug: string;
}

function Poster({ p, qr, id }: { p: Props; qr: string | null; id?: string }) {
  return (
    <div id={id} className="mx-auto flex aspect-[1/1.414] w-full max-w-[420px] flex-col items-center overflow-hidden rounded-2xl text-center shadow-xl" style={{ background: p.colors.primary, color: p.colors.text }}>
      <div className="flex w-full flex-1 flex-col items-center px-8 pt-10">
        <MerchantLogo icon={p.logo.icon} imageDataUrl={p.logo.imageDataUrl} background={`${p.colors.text}18`} color={p.colors.text} name={p.merchantName} className="size-14 rounded-2xl" />
        <p className="mt-3 text-sm font-medium uppercase tracking-widest opacity-80">{p.merchantName}</p>
        <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-tight">{p.headline}</h2>
        {p.rewardText && <p className="mt-2 text-base opacity-90">{p.rewardText}</p>}
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr ? <img src={qr} alt="QR code d'inscription" className="size-44" /> : <div className="size-44 animate-pulse bg-slate-100" />}
        </div>
        <p className="mt-4 text-sm opacity-90">Scannez avec l&apos;appareil photo de votre téléphone</p>
      </div>
      <div className="w-full px-6 py-4 text-xs opacity-80" style={{ background: `${p.colors.text}12` }}>
        Sans application · Gratuit · Vos données ne sont jamais revendues
      </div>
    </div>
  );
}

export function QrPoster(p: Props) {
  const qr = useQrDataUrl(p.url, { size: 800 });

  const downloadPdf = async () => {
    if (!qr) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)] as [number, number, number];
    doc.setFillColor(...hex(p.colors.primary));
    doc.rect(0, 0, 210, 297, "F");
    doc.setTextColor(...hex(p.colors.text));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(p.merchantName.toUpperCase(), 105, 40, { align: "center" });
    doc.setFontSize(30);
    doc.text(doc.splitTextToSize(p.headline, 170), 105, 62, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    if (p.rewardText) doc.text(p.rewardText, 105, 92, { align: "center" });
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(45, 105, 120, 120, 6, 6, "F");
    doc.addImage(qr, "PNG", 52, 112, 106, 106);
    doc.setFontSize(14);
    doc.text("Scannez avec l'appareil photo de votre téléphone", 105, 245, { align: "center" });
    doc.setFontSize(10);
    doc.text(p.url.replace(/^https?:\/\//, ""), 105, 255, { align: "center" });
    doc.text("Sans application · Gratuit", 105, 282, { align: "center" });
    doc.save(`affiche-fidelite-${p.slug}.pdf`);
    toast.success("Affiche PDF téléchargée.");
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(p.url);
      toast.success("Lien copié dans le presse-papiers.");
    } catch {
      toast.error("Copie impossible : sélectionnez le lien manuellement.");
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Carte de fidélité ${p.merchantName}`, text: p.headline, url: p.url });
      } catch {
        /* partage annulé par l'utilisateur */
      }
    } else copy();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="no-print">
        <Poster p={p} qr={qr} />
      </div>
      <div className="no-print space-y-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm font-medium">Lien d&apos;inscription</p>
          <p className="mt-1 break-all rounded-lg bg-surface-2 p-2 font-mono text-xs" data-testid="signup-link">{p.url}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={copy}><Copy /> Copier</Button>
            <Button variant="outline" onClick={share}><Share2 /> Partager</Button>
          </div>
        </div>
        <div className="grid gap-2">
          <Button onClick={downloadPdf} disabled={!qr}><Download /> Télécharger l&apos;affiche PDF (A4)</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer /> Imprimer</Button>
          <Button variant="outline" asChild disabled={!qr}>
            <a href={qr ?? "#"} download={`qr-${p.slug}.png`}><FileImage /> Télécharger le QR (PNG)</a>
          </Button>
          <Button variant="ghost" asChild>
            <a href={p.url} target="_blank" rel="noreferrer" data-testid="open-signup-page"><ExternalLink /> Ouvrir la page client</a>
          </Button>
        </div>
      </div>
      <div className="print-only">
        <Poster p={p} qr={qr} />
      </div>
    </div>
  );
}
