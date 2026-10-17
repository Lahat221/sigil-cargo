import Link from "next/link";
import type { EtatDepart, StatutEtape } from "@/lib/douane/etapesDepart";

const STYLE_PASTILLE: Record<StatutEtape, string> = {
  fait: "bg-emerald-100 text-emerald-700",
  a_faire: "bg-slate-100 text-slate-500",
  alerte: "bg-amber-100 text-amber-700",
};

const SYMBOLE: Record<StatutEtape, string> = { fait: "✓", a_faire: "•", alerte: "!" };

/**
 * « Où en est ce départ ? » : étapes du dédouanement avec leur état, la
 * progression et un bouton direct vers la prochaine action.
 */
export function ChecklistDepart({
  etat,
  nomDepart,
}: {
  etat: EtatDepart;
  nomDepart?: string;
}) {
  const { etapes, faites, total, prochaine } = etat;
  const pourcentage = total > 0 ? Math.round((faites / total) * 100) : 0;

  return (
    <section className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Avancement du dédouanement{nomDepart ? ` — ${nomDepart}` : ""}
          </h2>
          <p className="text-xs text-slate-500">
            {faites}/{total} étapes terminées
          </p>
        </div>
        {prochaine ? (
          <Link
            href={prochaine.href}
            className="rounded-lg bg-gold-gradient px-4 py-2 text-sm font-semibold text-navy shadow-sm transition-all hover:shadow-md hover:brightness-105"
          >
            Prochaine étape : {prochaine.action} →
          </Link>
        ) : (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
            ✓ Départ prêt
          </span>
        )}
      </div>

      <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pourcentage}%` }}
        />
      </div>

      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {etapes.map((e, i) => {
          const estProchaine = prochaine?.id === e.id;
          return (
            <li key={e.id}>
              <Link
                href={e.href}
                className={`flex h-full items-start gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-slate-50 ${
                  estProchaine ? "border-gold-2 ring-1 ring-gold-2" : "border-slate-200"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${STYLE_PASTILLE[e.statut]}`}
                  aria-label={e.statut === "fait" ? "Terminé" : e.statut === "alerte" ? "À traiter" : "À faire"}
                >
                  {SYMBOLE[e.statut]}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium text-slate-900">
                    {i + 1}. {e.titre}
                  </span>
                  <span
                    className={`block text-xs ${
                      e.statut === "alerte" ? "text-amber-700" : "text-slate-500"
                    }`}
                  >
                    {e.detail}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
