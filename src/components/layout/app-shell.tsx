"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ScanLine, Users, Layers, CreditCard, Gift, Megaphone, BarChart3, UsersRound, Settings, Receipt,
  Menu, ChevronsUpDown, LogOut, Moon, Sun, ExternalLink, Check, QrCode, LifeBuoy,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Dialog, SheetContent } from "@/components/ui/dialog";
import { Dialog as D } from "radix-ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { FidelyLogo } from "@/components/loyalty/fidely-logo";
import { MerchantLogo } from "@/components/loyalty/merchant-logo";
import { logoutAction, switchMerchantAction } from "@/app/actions/auth";
import { cn } from "@/lib/utils/cn";
import type { Permission } from "@/lib/auth/permissions";

export interface ShellData {
  user: { name: string; email: string; roleLabel: string };
  merchant: { id: string; name: string; slug: string; icon: string; imageDataUrl?: string; colors: { primary: string; text: string }; planName: string; status: string };
  memberships: { id: string; name: string; roleLabel: string }[];
  permissions: Permission[];
  demo: boolean;
}

const NAV: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; perm: Permission; group: string }[] = [
  { href: "/app", label: "Vue d'ensemble", icon: LayoutDashboard, perm: "analytics.read", group: "Pilotage" },
  { href: "/app/scanner", label: "Scanner", icon: ScanLine, perm: "scan", group: "Pilotage" },
  { href: "/app/clients", label: "Clients", icon: Users, perm: "customers.read", group: "Pilotage" },
  { href: "/app/programmes", label: "Programmes", icon: Layers, perm: "programs.manage", group: "Fidélité" },
  { href: "/app/cartes", label: "Cartes digitales", icon: CreditCard, perm: "cards.manage", group: "Fidélité" },
  { href: "/app/qr-inscription", label: "QR d'inscription", icon: QrCode, perm: "cards.manage", group: "Fidélité" },
  { href: "/app/recompenses", label: "Récompenses", icon: Gift, perm: "rewards.manage", group: "Fidélité" },
  { href: "/app/campagnes", label: "Campagnes", icon: Megaphone, perm: "campaigns.manage", group: "Croissance" },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3, perm: "analytics.read", group: "Croissance" },
  { href: "/app/equipe", label: "Équipe", icon: UsersRound, perm: "team.manage", group: "Compte" },
  { href: "/app/parametres", label: "Paramètres", icon: Settings, perm: "settings.manage", group: "Compte" },
  { href: "/app/abonnement", label: "Abonnement", icon: Receipt, perm: "billing.manage", group: "Compte" },
];

function NavList({ data, onNavigate }: { data: ShellData; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = NAV.filter((n) => data.permissions.includes(n.perm));
  const groups = [...new Set(items.map((i) => i.group))];
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Navigation principale">
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-1.5 px-2 text-[11px] font-medium uppercase tracking-wider text-muted/80">{g}</p>
          <ul className="space-y-0.5">
            {items
              .filter((i) => i.group === g)
              .map((item) => {
                const active = item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                        active ? "bg-surface text-foreground shadow-sm ring-1 ring-border" : "text-muted hover:bg-surface/70 hover:text-foreground",
                      )}
                    >
                      <item.icon className={cn("size-4", active ? "text-primary" : "text-muted group-hover:text-foreground")} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function MerchantSwitcher({ data }: { data: ShellData }) {
  const [pending, start] = React.useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface p-2 text-left shadow-xs hover:bg-surface-2" data-testid="merchant-switcher">
          <MerchantLogo icon={data.merchant.icon} imageDataUrl={data.merchant.imageDataUrl} background={data.merchant.colors.primary} color={data.merchant.colors.text} name={data.merchant.name} className="size-9 rounded-lg" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{data.merchant.name}</span>
            <span className="block truncate text-xs text-muted">Offre {data.merchant.planName}</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Vos commerces</DropdownMenuLabel>
        {data.memberships.map((m) => (
          <DropdownMenuItem key={m.id} disabled={pending} onSelect={() => m.id !== data.merchant.id && start(() => switchMerchantAction(m.id))}>
            <span className="flex-1 truncate">{m.name}</span>
            <span className="text-xs text-muted">{m.roleLabel}</span>
            {m.id === data.merchant.id && <Check className="!text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/onboarding?nouveau=1">+ Créer un nouveau commerce</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button onClick={() => setTheme(dark ? "light" : "dark")} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground" aria-label={dark ? "Activer le thème clair" : "Activer le thème sombre"}>
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

export function AppShell({ data, children, banner }: { data: ShellData; children: React.ReactNode; banner?: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-5">
        <FidelyLogo href="/app" />
        {data.demo && <Badge variant="demo" className="ml-2">Démo</Badge>}
      </div>
      <div className="px-3">
        <MerchantSwitcher data={data} />
      </div>
      <NavList data={data} onNavigate={onNavigate} />
      <div className="space-y-0.5 border-t border-border p-3">
        <Link href={`/rejoindre/${data.merchant.slug}`} target="_blank" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-surface hover:text-foreground">
          <ExternalLink className="size-4" /> Page d&apos;inscription client
        </Link>
        <Link href="/app/support" onClick={onNavigate} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted hover:bg-surface hover:text-foreground">
          <LifeBuoy className="size-4" /> Aide &amp; support
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-r border-border bg-surface-2/60 lg:block dark:bg-[#0d1220]">{sidebar()}</aside>
      <div className="flex min-w-0 flex-col">
        <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur md:px-6">
          <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
            <D.Trigger asChild>
              <button className="-ml-1 rounded-lg p-2 text-muted hover:bg-surface-2 lg:hidden" aria-label="Ouvrir le menu">
                <Menu className="size-5" />
              </button>
            </D.Trigger>
            <SheetContent side="left" className="max-w-[280px] bg-surface-2">
              <D.Title className="sr-only">Menu</D.Title>
              {sidebar(() => setMobileOpen(false))}
            </SheetContent>
          </Dialog>
          <span className="truncate text-sm font-medium lg:hidden">{data.merchant.name}</span>
          <div className="ml-auto flex items-center gap-1">
            {data.permissions.includes("scan") && (
              <Link href="/app/scanner" className="hidden items-center gap-1.5 rounded-lg bg-[#111827] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1f2937] sm:inline-flex dark:bg-white dark:text-[#111827]">
                <ScanLine className="size-4" /> Scanner
              </Link>
            )}
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-surface-2" aria-label="Menu du compte" data-testid="user-menu">
                  <Avatar name={data.user.name} className="size-8" />
                  <span className="hidden text-left md:block">
                    <span className="block text-sm font-medium leading-tight">{data.user.name}</span>
                    <span className="block text-xs text-muted">{data.user.roleLabel}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>{data.user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {data.permissions.includes("settings.manage") && (
                  <DropdownMenuItem asChild>
                    <Link href="/app/parametres"><Settings /> Paramètres</Link>
                  </DropdownMenuItem>
                )}
                {data.memberships.length > 1 && (
                  <DropdownMenuItem asChild>
                    <Link href="/choix-commerce"><ChevronsUpDown /> Changer de commerce</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => logoutAction()} destructive>
                  <LogOut /> Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {banner}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 pb-24 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
