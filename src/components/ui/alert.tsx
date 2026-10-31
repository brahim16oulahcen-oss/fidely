import * as React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const styles = {
  info: { box: "border-primary/20 bg-primary-soft text-foreground", icon: Info, iconClass: "text-primary" },
  success: { box: "border-success/30 bg-success-soft text-foreground", icon: CheckCircle2, iconClass: "text-success" },
  warning: { box: "border-warning/40 bg-warning-soft text-foreground", icon: AlertTriangle, iconClass: "text-warning-fg" },
  danger: { box: "border-danger/30 bg-danger-soft text-foreground", icon: XCircle, iconClass: "text-danger-fg" },
  demo: { box: "border-dashed border-warning/60 bg-warning-soft/60 text-foreground", icon: FlaskConical, iconClass: "text-warning-fg" },
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
  action,
}: {
  variant?: keyof typeof styles;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  const s = styles[variant];
  const Icon = s.icon;
  return (
    <div role={variant === "danger" ? "alert" : "status"} className={cn("flex gap-3 rounded-xl border p-4 text-sm", s.box, className)}>
      <Icon className={cn("mt-0.5 size-4 shrink-0", s.iconClass)} aria-hidden />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-muted [&_strong]:text-foreground">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
