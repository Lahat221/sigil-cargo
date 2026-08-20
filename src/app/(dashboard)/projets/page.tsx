import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SupprimerProjetButton } from "@/components/projets/SupprimerProjetButton";
import { IconFolder, IconPencil, IconPlus } from "@/components/ui/Icons";

export const dynamic = "force-dynamic";

const STATUT_STYLES: Record<string, string> = {
  actif: "bg-green-100 text-green-800",
  clos: "bg-slate-100 text-slate-700",
  annule: "bg-red-100 text-red-800",
};
const STATUT_LABELS: Record<string, string> = {
  actif: "Actif",
  clos: "Clos",
  annule: "Annulé",
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export default async function ProjetsPage() {
  const supabase = createClient();

  const [{ data: projets, error }, { data: commandes }] = await Promise.all([
    supabase
      .from("projets")
      .select("id, nom, statut, date_depart, date_arrivee")
      .order("created_at", { ascending: false }),
    supabase.from("commandes").select("projet_id"),
  ]);

  const compteParProjet = new Map<string, number>();
  for (const c of commandes ?? []) {
    compteParProjet.set(c.projet_id, (compteParProjet.get(c.projet_id) ?? 0) + 1);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-white">Projets Fret Aérien</h1>
        <Link
          href="/projets/nouveau"
          className="flex items-center gap-1.5 rounded-lg bg-gold-gradient px-4 py-1.5 text-sm font-semibold text-navy shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:brightness-105"
        >
          <IconPlus size={15} />
          Nouveau projet
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Erreur : {error.message}
          </p>
        ) : !projets || projets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
            <IconFolder size={28} />
            <p className="text-sm">Aucun projet trouvé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Nom</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                  <th className="px-3 py-2 font-medium">Départ</th>
                  <th className="px-3 py-2 font-medium">Arrivée</th>
                  <th className="px-3 py-2 font-medium">Commandes</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projets.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      <Link
                        href={`/commandes?projet=${p.id}`}
                        className="hover:underline"
                      >
                        {p.nom}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_STYLES[p.statut]}`}
                      >
                        {STATUT_LABELS[p.statut]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {p.date_depart
                        ? dateFormatter.format(new Date(p.date_depart))
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {p.date_arrivee
                        ? dateFormatter.format(new Date(p.date_arrivee))
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {compteParProjet.get(p.id) ?? 0}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/projets/${p.id}/modifier`}
                          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
                        >
                          <IconPencil size={14} />
                          Modifier
                        </Link>
                        <SupprimerProjetButton projetId={p.id} nom={p.nom} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
