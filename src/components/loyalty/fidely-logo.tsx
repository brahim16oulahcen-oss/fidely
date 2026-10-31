import Link from "next/link";
import { brand } from "@/config/brand";
import { FidelyMark } from "./merchant-logo";
import { cn } from "@/lib/utils/cn";

export function FidelyLogo({ href = "/", className, invert }: { href?: string; className?: string; invert?: boolean }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)} aria-label={`${brand.name} — accueil`}>
      <FidelyMark className="size-7" />
      <span className={cn("text-[17px]", invert ? "text-white" : "text-foreground")}>{brand.name}</span>
    </Link>
  );
}
