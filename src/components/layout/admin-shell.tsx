"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Receipt, TrendingUp, Activity, LifeBuoy, ScrollText, Settings, LogOut, Menu, Shield } from "lucide-react";
import { Dialog as D } from "radix-ui";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { FidelyLogo } from "@/components/loyalty/fidely-logo";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { logoutAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/commercants", label: "Commerçants", icon: Store },
  { href: "/admin/abonnements", label: "Abonnements", icon: Receipt },
  { href: "/admin/revenus", label: "Revenus", icon: TrendingUp },
  { href: "/admin/utilisation", label: "Utilisation", icon: Activity },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
  { href: "/admin/journaux", label: "Journaux", icon: ScrollText },
  { href: "/admin/parametres", label: "Paramètres", icon: Settings },
];

export function AdminShell({ user, children, openTickets }: { user: { name: string; email: string }; children: React.ReactNode; openTickets: number }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const nav = (onNav?: () => void) => (
    <div className="flex h-full flex-col bg-[#0b0f19] text-slate-300">
      <div className="flex h-14 items-center gap-2 px-5">
        <FidelyLogo href="/admin" invert />
        <Badge className="bg-white/10 text-white"><Shield /> Admin</Badge>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4" aria-label="Navigation administrateur">
        {NAV.map((n) => {
          const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} onClick={onNav} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium", active ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white")}>
              <n.icon className="size-4" /> {n.label}
              {n.href === "/admin/support" && openTickets > 0 && <span className="ml-auto rounded-full bg-indigo-500 px-1.5 text-xs text-white">{openTickets}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Avatar name={user.name} className="size-8 bg-white/10 text-white" />
          <div className="min-w-0 flex-1"><p className="truncate text-sm text-white">{user.name}</p><p className="truncate text-xs">{user.email}</p></div>
          <button onClick={() => logoutAction()} className="rounded-md p-1.5 hover:bg-white/10" aria-label="Se déconnecter"><LogOut className="size-4" /></button>
        </div>
      </div>
    </div>
  );
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-dvh lg:block">{nav()}</aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur lg:hidden">
          <Dialog open={open} onOpenChange={setOpen}>
            <D.Trigger asChild><button className="rounded-lg p-2 hover:bg-surface-2" aria-label="Ouvrir le menu"><Menu className="size-5" /></button></D.Trigger>
            <SheetContent side="left" className="max-w-[260px] border-0"><D.Title className="sr-only">Menu</D.Title>{nav(() => setOpen(false))}</SheetContent>
          </Dialog>
          <span className="text-sm font-medium">Back-office Fidely</span>
        </header>
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 pb-24 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
