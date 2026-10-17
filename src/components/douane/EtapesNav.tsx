import Link from "next/link";
import type { EtapeId, EtatDepart, StatutEtape } from "@/lib/douane/etapesDepart";

const STYLE_STATUT: Record<StatutEtape, string> = {
  fait: "bg-emerald-100 text-emerald-700",
  a_faire: "bg-slate-100 text-slate-600",
  alerte: "bg-amber-100 text-amber-700",
};
const LIBELLE_STATUT: Record<StatutEtape, string> = {
  fait: "Terminée",
  a_faire: "À faire",
  alerte: "À traiter",
};

/** « ← Retour … » pour les pages qui ne sont pas une étape (détail d'un colis, vue d'ensemble…). */
export function LienRetour({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
    >
      <span aria-hidden>←</span> {label}
    </Link>
  );
}

/**
 * Haut de page d'une étape : « Étape 3 sur 5 », fil des étapes (cliquable),
 * et un avertissement si une étape précédente n'est pas terminée — les
 * étapes se font dans l'ordre.
 */
export function EtapeBandeau({ etat, etapeId }: { etat: EtatDepart; etapeId: EtapeId }) {
  const index = etat.etapes.findIndex((e) => e.id === etapeId);
  if (index < 0) return null;
  const etape = etat.etapes[index];
  const precedenteBloquante = etat.etapes.slice(0, index).find((e) => e.statut !== "fait");

  return (
    <div className="mb-4 space-y-3">
      <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">
            Étape {index + 1} sur {etat.total} — {etape.titre}
          </p>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLE_STATUT[etape.statut]}`}>
            {LIBELLE_STATUT[etape.statut]}
          </span>
        </div>

        <ol className="flex flex-wrap items-center gap-1.5 text-xs">
          {etat.etapes.map((e, i) => (
            <li key={e.id} className="flex items-center gap-1.5">
              <Link
                href={e.page}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium transition-colors ${
                  e.id === etapeId
                    ? "border-gold-2 bg-gold-1/15 text-slate-900"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${STYLE_STATUT[e.statut]}`}
                >
                  {e.statut === "fait" ? "✓" : i + 1}
                </span>
                {e.nom}
              </Link>
              {i < etat.etapes.length - 1 && <span className="text-slate-300">›</span>}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-slate-500">{etape.detail}</p>
      </div>

      {precedenteBloquante && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          <span className="text-amber-900">
            <span className="font-semibold">Étape précédente à terminer :</span> {precedenteBloquante.titre} —{" "}
            {precedenteBloquante.detail}
          </span>
          <Link href={precedenteBloquante.href} className="font-semibold text-amber-800 underline hover:no-underline">
            {precedenteBloquante.action} →
          </Link>
        </div>
      )}
    </div>
  );
}

/** Bas de page d'une étape : retour à l'étape précédente, passage à la suivante. */
export function EtapeNavigation({ etat, etapeId }: { etat: EtatDepart; etapeId: EtapeId }) {
  const index = etat.etapes.findIndex((e) => e.id === etapeId);
  if (index < 0) return null;
  const precedente = etat.etapes[index - 1] ?? null;
  const suivante = etat.etapes[index + 1] ?? null;
  const termine = etat.etapes[index].statut === "fait";

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/60 pt-4 print:hidden">
      {precedente ? (
        <Link
          href={precedente.page}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          ← Étape précédente : {precedente.nom}
        </Link>
      ) : (
        <span />
      )}
      {suivante ? (
        <span className="flex flex-col items-end gap-1">
          <Link
            href={suivante.page}
            className={
              termine
                ? "rounded-lg bg-gold-gradient px-4 py-2 text-sm font-semibold text-navy shadow-sm transition-all hover:shadow-md hover:brightness-105"
                : "rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100"
            }
          >
            Étape suivante : {suivante.nom} →
          </Link>
          {!termine && <span className="text-xs text-slate-500">Terminez d&apos;abord cette étape.</span>}
        </span>
      ) : (
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
          {termine ? "✓ Dernière étape terminée" : "Dernière étape"}
        </span>
      )}
    </div>
  );
}
