"use client";
import * as React from "react";
import { Checkbox as C } from "radix-ui";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof C.Root>) {
  return (
    <C.Root
      className={cn(
        "peer size-5 shrink-0 cursor-pointer rounded-md border border-border bg-surface shadow-xs data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <C.Indicator className="flex items-center justify-center">
        <Check className="size-3.5" strokeWidth={3} />
      </C.Indicator>
    </C.Root>
  );
}
