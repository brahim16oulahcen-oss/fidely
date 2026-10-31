import { requireAdminPage } from "@/lib/auth/context";
import { getRepos } from "@/lib/db";
import { AdminShell } from "@/components/layout/admin-shell";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Back-office", template: "%s · Admin Fidely" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage();
  const open = (await getRepos().tickets.findMany()).filter((t) => t.status !== "resolved").length;
  return <AdminShell user={{ name: user.name, email: user.email }} openTickets={open}>{children}</AdminShell>;
}
