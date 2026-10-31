import { notFound } from "next/navigation";
import Link from "next/link";
import { Gift, Smartphone, ShieldCheck } from "lucide-react";
import { getRepos } from "@/lib/db";
import { MerchantLogo } from "@/components/loyalty/merchant-logo";
import { JoinForm } from "@/components/customer/join-form";
import { Alert } from "@/components/ui/alert";
import { describeRules } from "@/features/loyalty/engine";
import { brand } from "@/config/brand";
import { getPlan } from "@/config/plans";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const m = await getRepos().merchants.findOne({ slug: (await params).slug });
  return { title: m ? `Carte de fidélité ${m.name}` : "Programme introuvable", robots: { index: false } };
}

export default async function JoinPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ src?: string }> }) {
  const { slug } = await params;
  const { src } = await searchParams;
  const repos = getRepos();
  const merchant = await repos.merchants.findOne({ slug });
  if (!merchant) notFound();
  const program = merchant.primaryProgramId ? await repos.programs.findById(merchant.primaryProgramId) : null;
  const count = (await repos.customers.findMany({ merchantId: merchant.id })).filter((c) => !c.deletedAt).length;
  const closed = merchant.status === "suspended" || merchant.status === "cancelled" || !program || program.status !== "active";
  const full = count >= getPlan(merchant.planId).limits.customers;
  const bg = program?.card.background ?? merchant.colors.primary;
  const text = program?.card.text ?? merchant.colors.text;
  const accent = "#4F46E5";
  return (
    <div className="min-h-dvh bg-background">
      <div className="px-5 pb-16 pt-10 text-center" style={{ background: bg, color: text }}>
        <MerchantLogo icon={merchant.logo.icon} imageDataUrl={merchant.logo.imageDataUrl} background={`${text}18`} color={text} name={merchant.name} className="mx-auto size-16 rounded-2xl" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{merchant.name}</h1>
        <p className="mt-1 text-sm opacity-80">{merchant.address}, {merchant.city}</p>
        {program && <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium" style={{ background: `${text}18` }}><Gift className="size-4" /> {program.card.rewardText || describeRules(program.rules)}</p>}
      </div>
      <main className="mx-auto -mt-10 max-w-md px-4 pb-16">
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl">
          <h2 className="text-lg font-semibold">Votre carte de fidélité en 20 secondes</h2>
          <p className="mb-5 text-sm text-muted">Sans application, sans mot de passe. Elle s&apos;affiche sur votre téléphone.</p>
          {closed ? (
            <Alert variant="warning" title="Inscriptions momentanément fermées">Ce programme n&apos;accepte pas de nouveaux membres pour le moment.</Alert>
          ) : full ? (
            <Alert variant="warning" title="Programme complet">Ce programme a atteint sa capacité maximale. Le commerçant a été informé.</Alert>
          ) : (
            <JoinForm slug={merchant.slug} merchantName={merchant.name} source={src === "qr" ? "qr" : "web"} accent={accent} />
          )}
        </div>
        <ul className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-muted">
          <li><Smartphone className="mx-auto mb-1 size-5" />Sans application</li>
          <li><Gift className="mx-auto mb-1 size-5" />Récompenses automatiques</li>
          <li><ShieldCheck className="mx-auto mb-1 size-5" />Données protégées</li>
        </ul>
        <p className="mt-6 text-center text-sm">Déjà membre ? <Link href="/retrouver-ma-carte" className="font-medium text-primary hover:underline">Retrouver ma carte</Link></p>
        <p className="mt-8 text-center text-xs text-muted">Propulsé par {brand.name}</p>
      </main>
    </div>
  );
}
