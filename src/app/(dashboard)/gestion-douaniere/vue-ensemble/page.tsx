import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { chargerVueEnsemble } from "@/lib/douane/vueEnsemble";
import { ExportDouaneButton } from "@/components/douane/ExportDouaneButton";
import { STATUT_DOUANE_LABELS, STATUT_DOUANE_STYLES } from "@/components/douane/statutLabels";

export const dynamic = "force-dynamic";

export default async function VueEnsembleDouanePage({
  searchParams,
}: {
  searchParams: { projet?: string; hs?: string };
}) {
  const supabase = createClient();

  const { data: projets } = await supabase
    .from("projets")
    .select("id, nom")
    .order("created_at", { ascending: false });

  const projetId = searchParams.projet || projets?.[0]?.id;
  const nomProjet = projets?.find((p) => p.id === projetId)?.nom;

  const toutesLesLignes = projetId ? await chargerVueEnsemble(supabase, projetId) : [];
  const filtreHsIncertain = searchParams.hs === "a_verifier";
  const lignes = filtreHsIncertain
    ? toutesLesLignes.filter((l) => l.hsStatus === "a_verifier")
    : toutesLesLignes;

  let colisPrecedent: string | null = null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-white">Vue d&apos;ensemble</h1>
          {nomProjet && <p className="text-sm text-white/60">{nomProjet}</p>}
        </div>
        <ExportDouaneButton lignes={toutesLesLignes} />
      </div>

      {filtreHsIncertain && (
        <div className="mb-3 flex items-center gap-2 text-sm text-white/70">
          <span>
            Filtré : <span className="font-medium text-white">HS à vérifier</span> ({lignes.length})
          </span>
          <Link href={`/gestion-douaniere/vue-ensemble?projet=${projetId}`} className="text-gold-2 hover:underline">
            Effacer le filtre
          </Link>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200/70 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">N°</th>
              <th className="px-3 py-2 font-medium">Client</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2 font-medium">Type produit</th>
              <th className="px-3 py-2 font-medium">Description douane</th>
              <th className="px-3 py-2 font-medium">HS Code</th>
              <th className="px-3 py-2 font-medium">Produit</th>
              <th className="px-3 py-2 font-medium text-right">Qté</th>
              <th className="px-3 py-2 font-medium text-right">Confiance</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lignes.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                  {filtreHsIncertain ? "Aucun HS à vérifier." : "Aucun colis pour ce départ."}
                </td>
              </tr>
            )}
            {lignes.map((l, i) => {
              const premiereLigneDuColis = l.colisId !== colisPrecedent;
              colisPrecedent = l.colisId;
              return (
                <tr key={`${l.colisId}-${i}`} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">
                    {premiereLigneDuColis ? `#${l.numero}` : ""}
                  </td>
                  <td className="px-3 py-2">{premiereLigneDuColis ? l.clientNom || "—" : ""}</td>
                  <td className="px-3 py-2">
                    {premiereLigneDuColis && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_DOUANE_STYLES[l.statutColis]}`}
                      >
                        {STATUT_DOUANE_LABELS[l.statutColis]}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">{l.typeProduit ?? "—"}</td>
                  <td className="px-3 py-2">{l.descriptionDouane ?? "—"}</td>
                  <td className="px-3 py-2">
                    {l.hsCode ? (
                      <span className="font-mono text-xs">{l.hsCode}</span>
                    ) : l.typeProduit ? (
                      <span className="text-xs text-amber-600">⚠ à vérifier</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">{l.descriptionProduit ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {l.quantite != null ? `${l.quantite} ${l.unite}` : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {l.confiance != null ? `${Math.round(l.confiance * 100)}%` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {premiereLigneDuColis && (
                      <Link
                        href={`/gestion-douaniere/${l.colisId}`}
                        className="text-sm text-gold-2 hover:underline"
                      >
                        Voir
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
