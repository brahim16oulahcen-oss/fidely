import { notFound } from "next/navigation";
import { LEGAL_PAGES, LEGAL_DRAFT_NOTICE } from "@/features/legal/pages";
import { Alert } from "@/components/ui/alert";

export function generateStaticParams() {
  return Object.keys(LEGAL_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const page = LEGAL_PAGES[(await params).slug];
  return { title: page?.title ?? "Page introuvable" };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = LEGAL_PAGES[(await params).slug];
  if (!page) notFound();
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
      <Alert variant="warning" className="mt-6">{LEGAL_DRAFT_NOTICE}</Alert>
      <div className="mt-10 space-y-8">
        {page.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-lg font-semibold">{s.h}</h2>
            {s.p.map((p) => <p key={p} className="mt-2 leading-relaxed text-muted">{p}</p>)}
          </section>
        ))}
      </div>
    </article>
  );
}
