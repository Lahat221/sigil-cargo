import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DouaneFiltreDepart } from "@/components/douane/DouaneFiltreDepart";
import { DouaneStatsCards } from "@/components/douane/DouaneStatsCards";
import { TraiterDepartButton } from "@/components/douane/TraiterDepartButton";
import { ExportDouaneButton } from "@/components/douane/ExportDouaneButton";
import { DeclarationXlsxButton } from "@/components/douane/DeclarationXlsxButton";
import { STATUT_DOUANE_LABELS, STATUT_DOUANE_STYLES } from "@/components/douane/statutLabels";
import { chargerVueEnsemble } from "@/lib/douane/vueEnsemble";
import { IconGrid } from "@/components/ui/Icons";
import type { StatutExtractionDouane } from "@/types/database.types";

export const dynamic = "force-dynamic";

type ColisRow = {
  id: string;
  numero: number;
  poids_kg: number;
  clients: { nom: string; telephone: string | null } | null;
  // commande_id est UNIQUE sur douane_extractions : PostgREST embarque donc
  // un objet unique (ou null), pas un tableau, malgré la relation FK inverse.
  douane_extractions: {
    id: string;
    statut: StatutExtractionDouane;
    updated_at: string;
  } | null;
};

export default async function GestionDouanierePage({
  searchParams,
}: {
  searchParams: { projet?: string };
}) {
  const supabase = createClient();

  const { data: projets } = await supabase
    .from("projets")
    .select("id, nom")
    .order("created_at", { ascending: false });

  const projetId = searchParams.projet || projets?.[0]?.id;

  let colis: ColisRow[] = [];
  if (projetId) {
    const { data } = await supabase
      .from("commandes")
      .select(
        "id, numero, poids_kg, clients(nom, telephone), douane_extractions(id, statut, updated_at)"
      )
      .eq("projet_id", projetId)
      .neq("statut", "annulee")
      .order("numero", { ascending: false })
      .returns<ColisRow[]>();
    colis = data ?? [];
  }

  const statutDe = (c: ColisRow): StatutExtractionDouane =>
    c.douane_extractions?.statut ?? "non_traite";

  const stats = {
    total: colis.length,
    nonTraite: colis.filter((c) => statutDe(c) === "non_traite").length,
    enCours: colis.filter((c) => statutDe(c) === "en_cours").length,
    traite: colis.filter((c) => statutDe(c) === "traite").length,
    aVerifier: colis.filter((c) => statutDe(c) === "a_verifier").length,
    valide: colis.filter((c) => statutDe(c) === "valide").length,
    erreur: colis.filter((c) => statutDe(c) === "erreur").length,
    hsIncertain: 0,
    produitsRetires: 0,
  };

  const extractionIds = colis
    .map((c) => c.douane_extractions?.id)
    .filter((id): id is string => !!id);

  if (extractionIds.length > 0) {
    const [{ count: hsIncertain }, { count: produitsRetires }] = await Promise.all([
      supabase
        .from("douane_produits")
        .select("id", { count: "exact", head: true })
        .in("extraction_id", extractionIds)
        .eq("hs_status", "a_verifier"),
      supabase
        .from("douane_produits_retires")
        .select("id", { count: "exact", head: true })
        .in("extraction_id", extractionIds),
    ]);
    stats.hsIncertain = hsIncertain ?? 0;
    stats.produitsRetires = produitsRetires ?? 0;
  }

  const commandeIdsNonTraites = colis
    .filter((c) => statutDe(c) === "non_traite")
    .map((c) => c.id);

  const lignesExport = projetId ? await chargerVueEnsemble(supabase, projetId) : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-white">Gestion Douanière</h1>
        <div className="flex flex-wrap items-center gap-2">
          {projetId && (
            <Link
              href={`/gestion-douaniere/vue-ensemble?projet=${projetId}`}
              className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              <IconGrid size={15} />
              Visualiser
            </Link>
          )}
          <ExportDouaneButton lignes={lignesExport} />
          {projetId && <DeclarationXlsxButton projetId={projetId} />}
          <DouaneFiltreDepart projets={projets ?? []} />
        </div>
      </div>

      {!projetId ? (
        <p className="rounded-xl border border-slate-200/70 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Aucun départ trouvé.
        </p>
      ) : (
        <>
          <div className="mb-4">
            <DouaneStatsCards stats={stats} />
          </div>

          <div className="mb-6 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
            <TraiterDepartButton commandeIds={commandeIdsNonTraites} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">N°</th>
                  <th className="px-3 py-2 font-medium">Client</th>
                  <th className="px-3 py-2 font-medium">Poids</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                  <th className="px-3 py-2 font-medium">Dernière extraction</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {colis.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                      Aucun colis pour ce départ.
                    </td>
                  </tr>
                )}
                {colis.map((c) => {
                  const statut = statutDe(c);
                  const extraction = c.douane_extractions;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-xs">#{c.numero}</td>
                      <td className="px-3 py-2">{c.clients?.nom ?? "—"}</td>
                      <td className="px-3 py-2">{c.poids_kg} kg</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_DOUANE_STYLES[statut]}`}
                        >
                          {STATUT_DOUANE_LABELS[statut]}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-400">
                        {extraction
                          ? new Date(extraction.updated_at).toLocaleString("fr-FR")
                          : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Link
                          href={`/gestion-douaniere/${c.id}`}
                          className="text-sm text-gold-2 hover:underline"
                        >
                          Voir
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
