"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { verifyEmailAction } from "@/app/actions/auth";

export function VerifyForm() {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await verifyEmailAction(code);
          if (!r.ok) return setError(r.error);
          router.push(r.data.redirectTo);
        });
      }}
    >
      {error && <Alert variant="danger">{error}</Alert>}
      <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" className="h-14 text-center font-mono text-2xl tracking-[0.5em]" aria-label="Code de vérification" data-testid="verify-code" />
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={code.length !== 6} data-testid="verify-submit">Vérifier mon email</Button>
    </form>
  );
}
