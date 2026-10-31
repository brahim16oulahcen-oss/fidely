import { NextResponse, type NextRequest } from "next/server";
import { getMerchantContext } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { filterRows, listCustomerRows, rowsToCsv } from "@/features/customers/service";
import { customerFilterSchema } from "@/features/customers/schemas";
import { AppError } from "@/lib/auth/permissions";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getMerchantContext("customers.export");
    const repos = getRepos();
    const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
    const filter = customerFilterSchema.parse({ ...sp, q: sp.q || undefined, page: 1 });
    const rows = filterRows(await listCustomerRows({ ...ctx, repos }), filter);
    await audit(repos, { actorUserId: ctx.actor.userId, actorLabel: ctx.actor.name, merchantId: ctx.merchant.id, action: "customers.exported", target: `${rows.length} clients`, metadata: { segment: filter.segment } });
    return new NextResponse(rowsToCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clients-${ctx.merchant.slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const status = e instanceof AppError ? (e.code === "UNAUTHENTICATED" ? 401 : e.code === "FORBIDDEN" ? 403 : 400) : 500;
    return NextResponse.json({ error: e instanceof AppError ? e.message : "Erreur" }, { status });
  }
}
