import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SupprimerProjetButton } from "@/components/projets/SupprimerProjetButton";
import { IconFolder, IconPencil, IconPlus } from "@/components/ui/Icons";
import { BRAND } from "@/lib/brand";

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
const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BRAND.devise,
});

export default async function ProjetsPage() {
  const supabase = createClient();

  const [{ data: projets, error }, { data: commandes }, { data: charges }] =
    await Promise.all([
      supabase
        .from("projets")
        .select("id, nom, statut, date_depart, date_arrivee, mode_fret")
        .order("created_at", { ascending: false }),
      supabase
        .from("commandes")
        .select("projet_id, statut, montant_total, poids_kg"),
      supabase.from("charges").select("projet_id, montant"),
    ]);

  const statsParProjet = new Map<
    string,
    { nbCommandes: number; ca: number; poids: number; depenses: number }
  >();

  function stats(projetId: string) {
    let s = statsParProjet.get(projetId);
    if (!s) {
      s = { nbCommandes: 0, ca: 0, poids: 0, depenses: 0 };
      statsParProjet.set(projetId, s);
    }
    return s;
  }

  for (const c of commandes ?? []) {
    const s = stats(c.projet_id);
    s.nbCommandes += 1;
    if (c.statut !== "annulee") {
      s.ca += c.montant_total;
      s.poids += c.poids_kg;
    }
  }
  for (const ch of charges ?? []) {
    stats(ch.projet_id).depenses += ch.montant;
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink">
          {BRAND.modeGroupageConteneurActif ? "Projets" : "Projets Fret Aérien"}
        </h1>
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
                  <th className="px-3 py-2 font-medium">Colis</th>
                  <th className="px-3 py-2 font-medium">CA</th>
                  <th className="px-3 py-2 font-medium">Dépenses</th>
                  <th className="px-3 py-2 font-medium">Bénéfice</th>
                  <th className="px-3 py-2 font-medium">Revient/kg</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projets.map((p) => {
                  const s = statsParProjet.get(p.id) ?? {
                    nbCommandes: 0,
                    ca: 0,
                    poids: 0,
                    depenses: 0,
                  };
                  const benefice = s.ca - s.depenses;
                  const revientKg = s.poids > 0 ? s.depenses / s.poids : null;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-medium text-slate-900">
                        <Link
                          href={`/commandes?projet=${p.id}`}
                          className="hover:underline"
                        >
                          {p.nom}
                        </Link>
                        {BRAND.modeGroupageConteneurActif && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-normal text-slate-500">
                            {p.mode_fret === "conteneur" ? "Conteneur · m³" : "Aérien · kg"}
                          </span>
                        )}
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
                        {s.nbCommandes}
                      </td>
                      <td className="px-3 py-2.5 text-slate-900">
                        {montantFormatter.format(s.ca)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-900">
                        {montantFormatter.format(s.depenses)}
                      </td>
                      <td
                        className={`px-3 py-2.5 font-medium ${
                          benefice >= 0 ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {montantFormatter.format(benefice)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {revientKg !== null
                          ? `${montantFormatter.format(revientKg)}/kg`
                          : "—"}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
