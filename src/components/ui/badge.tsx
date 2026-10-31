import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3", {
  variants: {
    variant: {
      default: "bg-primary-soft text-primary",
      neutral: "bg-surface-2 text-muted",
      night: "bg-[#111827] text-white dark:bg-white dark:text-[#111827]",
      success: "bg-success-soft text-success-fg",
      warning: "bg-warning-soft text-warning-fg",
      danger: "bg-danger-soft text-danger-fg",
      outline: "border border-border text-muted",
      demo: "border border-dashed border-warning/60 bg-warning-soft text-warning-fg",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
