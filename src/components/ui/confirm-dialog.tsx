"use client";
import * as React from "react";
import { AlertDialog as A } from "radix-ui";
import { Button } from "./button";

export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Confirmer",
  destructive,
  onConfirm,
  children,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<unknown> | unknown;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [internal, setInternal] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const isOpen = open ?? internal;
  const setOpen = onOpenChange ?? setInternal;
  return (
    <A.Root open={isOpen} onOpenChange={(o) => !pending && setOpen(o)}>
      {trigger && <A.Trigger asChild>{trigger}</A.Trigger>}
      <A.Portal>
        <A.Overlay className="fixed inset-0 z-50 bg-[#0b0f19]/50 data-[state=open]:animate-fade-in" />
        <A.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-surface p-6 shadow-2xl data-[state=open]:animate-fade-in">
          <A.Title className="text-lg font-semibold tracking-tight">{title}</A.Title>
          {description && <A.Description className="mt-2 text-sm text-muted">{description}</A.Description>}
          {children}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <A.Cancel asChild>
              <Button variant="outline" disabled={pending}>Annuler</Button>
            </A.Cancel>
            <Button
              variant={destructive ? "destructive" : "default"}
              loading={pending}
              onClick={async () => {
                setPending(true);
                try {
                  const res = await onConfirm();
                  if (res !== false) setOpen(false);
                } finally {
                  setPending(false);
                }
              }}
            >
              {confirmLabel}
            </Button>
          </div>
        </A.Content>
      </A.Portal>
    </A.Root>
  );
}
