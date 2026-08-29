import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DouaneStatsCards } from "@/components/douane/DouaneStatsCards";
import { TraiterDepartButton } from "@/components/douane/TraiterDepartButton";
import { ValiderLotButton } from "@/components/douane/ValiderLotButton";
import { ExportDouaneButton } from "@/components/douane/ExportDouaneButton";
import { STATUT_DOUANE_LABELS, STATUT_DOUANE_STYLES } from "@/components/douane/statutLabels";
import { chargerVueEnsemble } from "@/lib/douane/vueEnsemble";
import { chargerResumeAuditFrance } from "./dedouanement-france/actions";
import { IconBell } from "@/components/ui/Icons";
import type { StatutExtractionDouane } from "@/types/database.types";

export const dynamic = "force-dynamic";

type ColisRow = {
  id: string;
  numero: number;
  poids_kg: number | null;
  clients: { nom: string; telephone: string | null } | null;
  // commande_id est UNIQUE sur douane_extractions : PostgREST embarque donc
  // un objet unique (ou null), pas un tableau, malgré la relation FK inverse.
  douane_extractions: {
    id: string;
    statut: StatutExtractionDouane;
    updated_at: string;
  } | null;
};

const STATUTS_VALIDES: StatutExtractionDouane[] = [
  "non_traite",
  "en_cours",
  "traite",
  "a_verifier",
  "valide",
  "erreur",
];

export default async function GestionDouanierePage({
  searchParams,
}: {
  searchParams: { projet?: string; statut?: string };
}) {
  const supabase = createClient();

  const { data: projets } = await supabase
    .from("projets")
    .select("id, nom")
    .order("created_at", { ascending: false });

  const projetId = searchParams.projet || projets?.[0]?.id;
  const statutFiltre = STATUTS_VALIDES.find((s) => s === searchParams.statut);

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
  const commandeIdsTous = colis.map((c) => c.id);
  const commandeIdsAValider = colis
    .filter((c) => statutDe(c) === "traite" || statutDe(c) === "a_verifier")
    .map((c) => c.id);

  const lignesExport = projetId ? await chargerVueEnsemble(supabase, projetId) : [];
  const resumeAudit = projetId ? await chargerResumeAuditFrance(projetId) : null;
  const nbAlertesAudit = resumeAudit
    ? resumeAudit.nbCritiques + resumeAudit.nbReglementation + resumeAudit.nbAmbigues
    : 0;

  const colisAffiches = statutFiltre ? colis.filter((c) => statutDe(c) === statutFiltre) : colis;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink">Colis du départ</h1>
        <ExportDouaneButton lignes={lignesExport} />
      </div>

      {!projetId ? (
        <p className="rounded-xl border border-slate-200/70 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Aucun départ trouvé.
        </p>
      ) : (
        <>
          <div className="mb-4">
            <DouaneStatsCards stats={stats} projetId={projetId} statutActif={statutFiltre} />
          </div>

          {nbAlertesAudit > 0 && (
            <Link
              href={`/gestion-douaniere/audit-france?projet=${projetId}`}
              className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm transition-colors hover:bg-amber-100"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <IconBell size={16} />
                Audit France (v{resumeAudit!.version}) — {nbAlertesAudit} alerte(s) à traiter
                {resumeAudit!.nbCritiques > 0 && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {resumeAudit!.nbCritiques} critique(s)
                  </span>
                )}
              </span>
              <span className="text-sm text-gold-2">Voir l&apos;audit →</span>
            </Link>
          )}

          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
            <TraiterDepartButton
              commandeIds={commandeIdsNonTraites}
              tousLesCommandeIds={commandeIdsTous}
            />
            <ValiderLotButton commandeIds={commandeIdsAValider} />
          </div>

          {statutFiltre && (
            <div className="mb-3 flex items-center gap-2 text-sm text-ink-muted">
              <span>
                Filtré : <span className="font-medium text-ink">{STATUT_DOUANE_LABELS[statutFiltre]}</span> (
                {colisAffiches.length})
              </span>
              <Link href={`/gestion-douaniere?projet=${projetId}`} className="text-gold-2 hover:underline">
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
                  <th className="px-3 py-2 font-medium">Poids</th>
                  <th className="px-3 py-2 font-medium">Statut</th>
                  <th className="px-3 py-2 font-medium">Dernière extraction</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {colisAffiches.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                      {statutFiltre ? "Aucun colis avec ce statut." : "Aucun colis pour ce départ."}
                    </td>
                  </tr>
                )}
                {colisAffiches.map((c) => {
                  const statut = statutDe(c);
                  const extraction = c.douane_extractions;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-xs">#{c.numero}</td>
                      <td className="px-3 py-2">{c.clients?.nom ?? "—"}</td>
                      <td className="px-3 py-2">
                        {c.poids_kg !== null ? `${c.poids_kg} kg` : "—"}
                      </td>
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
