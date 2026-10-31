"use client";
import * as React from "react";
import { toast } from "sonner";
import { Input, NativeSelect, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createTicketAction } from "@/app/actions/merchant";

export function SupportForm() {
  const [v, setV] = React.useState({ subject: "", body: "", kind: "question" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [pending, start] = React.useTransition();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await createTicketAction(v);
          if (r.ok) {
            toast.success(r.message);
            setV({ subject: "", body: "", kind: "question" });
            setErrors({});
          } else {
            setErrors(r.fieldErrors ?? {});
            toast.error(r.error);
          }
        });
      }}
    >
      <Field label="Type de demande" htmlFor="t-kind"><NativeSelect id="t-kind" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value })}><option value="question">Question</option><option value="incident">Incident</option><option value="billing">Facturation</option></NativeSelect></Field>
      <Field label="Objet" htmlFor="t-subj" error={errors.subject}><Input id="t-subj" value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} /></Field>
      <Field label="Message" htmlFor="t-body" error={errors.body}><Textarea id="t-body" value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} /></Field>
      <Button type="submit" loading={pending}>Envoyer la demande</Button>
    </form>
  );
}
