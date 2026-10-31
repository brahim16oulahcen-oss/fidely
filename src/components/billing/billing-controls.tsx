"use client";
import * as React from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { changePlanAction } from "@/app/actions/merchant";
import type { PlanId } from "@/types/domain";

export function ChangePlanButton({ planId, planName, price, current, blockers, upgrade }: { planId: PlanId; planName: string; price: string; current: boolean; blockers: string[]; upgrade: boolean }) {
  if (current) return <Button variant="outline" disabled className="w-full">Offre actuelle</Button>;
  return (
    <ConfirmDialog
      title={`Passer à l'offre ${planName} ?`}
      description={
        blockers.length ? (
          <span className="block space-y-2">
            <span className="block text-danger-fg">Ce changement n&apos;est pas possible pour l&apos;instant :</span>
            {blockers.map((b) => <span key={b} className="block">• {b}</span>)}
          </span>
        ) : (
          `Nouveau tarif : ${price} HT / mois. Mode démonstration : aucun paiement ne sera effectué et la facture générée est fictive.`
        )
      }
      confirmLabel={blockers.length ? "Compris" : "Confirmer le changement"}
      onConfirm={async () => {
        if (blockers.length) return;
        const r = await changePlanAction(planId);
        r.ok ? toast.success(r.message) : toast.error(r.error);
      }}
      trigger={<Button variant={upgrade ? "default" : "outline"} className="w-full" data-testid={`choose-${planId}`}>{upgrade ? "Passer à" : "Revenir à"} {planName}</Button>}
    />
  );
}

export function InvoiceDownload({ invoice, merchant }: { invoice: { number: string; amountCents: number; planName: string; issuedAt: string; periodStart: string; periodEnd: string; status: string }; merchant: { name: string; address: string } }) {
  const download = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const d = (s: string) => new Date(s).toLocaleDateString("fr-FR");
    const eur = (c: number) => (c / 100).toFixed(2).replace(".", ",") + " EUR";
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(11);
    doc.text("FACTURE FICTIVE — MODE DÉMONSTRATION — SANS VALEUR COMPTABLE", 105, 15, { align: "center" });
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(22);
    doc.text("Fidely", 20, 35);
    doc.setFontSize(10);
    doc.text(["Fidely SAS (société fictive)", "Rouen, France"], 20, 42);
    doc.setFontSize(14);
    doc.text(`Facture ${invoice.number}`, 190, 35, { align: "right" });
    doc.setFontSize(10);
    doc.text([`Date : ${d(invoice.issuedAt)}`, `Statut : ${invoice.status === "paid" ? "payée (simulation)" : "à régler (simulation)"}`], 190, 42, { align: "right" });
    doc.text(["Facturé à :", merchant.name, merchant.address], 20, 65);
    doc.setDrawColor(226, 232, 240);
    doc.line(20, 85, 190, 85);
    doc.text("Description", 20, 92);
    doc.text("Montant HT", 190, 92, { align: "right" });
    doc.line(20, 95, 190, 95);
    doc.text(`Abonnement ${invoice.planName} — du ${d(invoice.periodStart)} au ${d(invoice.periodEnd)}`, 20, 103);
    doc.text(eur(invoice.amountCents), 190, 103, { align: "right" });
    const tva = Math.round(invoice.amountCents * 0.2);
    doc.text(["Total HT", "TVA 20 %", "Total TTC"], 140, 120);
    doc.text([eur(invoice.amountCents), eur(tva), eur(invoice.amountCents + tva)], 190, 120, { align: "right" });
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Document généré par un prototype. Aucun paiement n'a été effectué.", 105, 280, { align: "center" });
    doc.save(`${invoice.number}.pdf`);
  };
  return <Button variant="ghost" size="sm" onClick={download}><Download /> PDF</Button>;
}
