import type { ReactNode } from "react";
import { IconChevronDown, IconQuote } from "@/components/ui/Icons";

export function SectionTitre({
  eyebrow,
  titre,
  description,
}: {
  eyebrow: string;
  titre: string;
  description?: string;
}) {
  return (
    <div className="mx-auto mb-10 max-w-2xl text-center">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-1">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{titre}</h2>
      {description && (
        <p className="mt-3 text-base leading-relaxed text-white/60">{description}</p>
      )}
    </div>
  );
}

export type Etape = { titre: string; description: string };

export function CommentCaMarche({ etapes }: { etapes: Etape[] }) {
  return (
    <ol className="relative grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {etapes.map((e, i) => (
        <li
          key={e.titre}
          className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.07]"
        >
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-gold-gradient text-base font-extrabold text-navy shadow-md shadow-gold-2/20">
            {i + 1}
          </span>
          <h3 className="font-semibold text-white">{e.titre}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/60">{e.description}</p>
        </li>
      ))}
    </ol>
  );
}

export type Avantage = { icone: ReactNode; titre: string; description: string };

export function Avantages({ avantages }: { avantages: Avantage[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {avantages.map((a) => (
        <div
          key={a.titre}
          className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition-all hover:-translate-y-1 hover:border-gold-1/30 hover:bg-white/[0.07]"
        >
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-1/15 text-gold-1 transition-colors group-hover:bg-gold-1/25">
            {a.icone}
          </span>
          <h3 className="font-semibold text-white">{a.titre}</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/60">{a.description}</p>
        </div>
      ))}
    </div>
  );
}

export type Avis = { id: string; nom: string; texte: string };

export function Temoignages({ avis }: { avis: Avis[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {avis.map((a) => (
        <figure
          key={a.id}
          className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6"
        >
          <IconQuote size={26} className="text-gold-1" />
          <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-white/80">
            {a.texte}
          </blockquote>
          <figcaption className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-gradient text-sm font-bold text-navy">
              {a.nom.trim().charAt(0).toUpperCase()}
            </span>
            <span className="text-sm font-semibold text-white">{a.nom}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export type QuestionFaq = { question: string; reponse: ReactNode };

export function Faq({ questions }: { questions: QuestionFaq[] }) {
  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {questions.map((q) => (
        <details
          key={q.question}
          className="group rounded-xl border border-white/10 bg-white/[0.04] transition-colors open:bg-white/[0.07]"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left font-medium text-white [&::-webkit-details-marker]:hidden">
            {q.question}
            <IconChevronDown
              size={18}
              className="shrink-0 text-gold-1 transition-transform group-open:rotate-180"
            />
          </summary>
          <div className="px-5 pb-5 text-sm leading-relaxed text-white/65">{q.reponse}</div>
        </details>
      ))}
    </div>
  );
}
