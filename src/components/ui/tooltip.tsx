"use client";
import * as React from "react";
import { Tooltip as T } from "radix-ui";
import { cn } from "@/lib/utils/cn";

export function Tooltip({ content, children, side = "top" }: { content: React.ReactNode; children: React.ReactNode; side?: "top" | "bottom" | "left" | "right" }) {
  return (
    <T.Provider delayDuration={200}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content side={side} sideOffset={6} className={cn("z-50 max-w-xs rounded-md bg-[#111827] px-2.5 py-1.5 text-xs leading-relaxed text-white shadow-lg data-[state=delayed-open]:animate-fade-in")}>
            {content}
            <T.Arrow className="fill-[#111827]" />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}
