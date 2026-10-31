import { NextResponse } from "next/server";
import { getRepos } from "@/lib/db";
import { exportMyData } from "@/features/customers/service";

/** Droit d'accès / portabilité (art. 15 et 20 RGPD) : export JSON des données du client. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const data = await exportMyData(getRepos(), (await params).token);
    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="mes-donnees-fidelite.json"', "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Carte introuvable." }, { status: 404 });
  }
}
