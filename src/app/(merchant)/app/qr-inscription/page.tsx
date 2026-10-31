import { requireMerchantPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { publicOrigin } from "@/lib/utils/origin";
import { PageHeader } from "@/components/layout/page-header";
import { QrPoster } from "@/components/loyalty/qr-poster";
import { Alert } from "@/components/ui/alert";

export const metadata = { title: "QR d'inscription" };

export default async function SignupQrPage() {
  const { merchant } = await requireMerchantPage("cards.manage");
  const program = merchant.primaryProgramId ? await getRepos().programs.findById(merchant.primaryProgramId) : null;
  const url = `${await publicOrigin()}/rejoindre/${merchant.slug}?src=qr`;
  return (
    <>
      <PageHeader title="QR code d'inscription" description="À afficher en caisse, en vitrine ou sur vos tickets. Vos clients obtiennent leur carte en moins de 30 secondes." />
      {merchant.status === "suspended" && <Alert variant="danger" className="mb-4" title="Inscriptions bloquées">Votre compte est suspendu : la page d&apos;inscription n&apos;accepte pas de nouveaux membres.</Alert>}
      <QrPoster
        url={url}
        slug={merchant.slug}
        merchantName={merchant.name}
        logo={merchant.logo}
        colors={{ primary: program?.card.background ?? merchant.colors.primary, text: program?.card.text ?? merchant.colors.text, accent: program?.card.accent ?? merchant.colors.accent }}
        headline="Rejoignez notre programme de fidélité"
        rewardText={program?.card.rewardText ? `À gagner : ${program.card.rewardText}` : ""}
      />
    </>
  );
}
