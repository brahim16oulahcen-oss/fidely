import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/** Raccourci « Mon espace » : rouvre la dernière carte utilisée sur cet appareil. */
export default async function CustomerSpace() {
  const token = (await cookies()).get("fidely_card")?.value;
  redirect(token ? `/carte/${token}` : "/retrouver-ma-carte");
}
