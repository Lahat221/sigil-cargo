import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DouaneStatsCards } from "@/components/douane/DouaneStatsCards";
import { TraiterDepartButton } from "@/components/douane/TraiterDepartButton";
import { ValiderLotButton } from "@/components/douane/ValiderLotButton";
import { ExportDouaneButton } from "@/components/douane/ExportDouaneButton";
import { STATUT_DOUANE_LABELS } from "@/components/douane/statutLabels";
import { ChecklistDepart } from "@/components/douane/ChecklistDepart";
import { ColisDouaneTable, type LigneColisDouane } from "@/components/douane/ColisDouaneTable";
import { chargerEtatDepart } from "@/lib/douane/etapesDepart";
import { EtapeNavigation } from "@/components/douane/EtapesNav";
import { chargerVueEnsemble } from "@/lib/douane/vueEnsemble";
import { chargerResumeAuditFrance } from "./dedouanement-france/actions";
import { IconBell } from "@/components/ui/Icons";
import type { StatutExtractionDouane } from "@/types/database.types";

export const dynamic = "force-dynamic";
// L'analyse IA des colis (traiterLot) s'exécute depuis cette page : ~11 s par colis avec gpt-5.4.
export const maxDuration = 300;

type ColisRow = {
  id: string;
  numero: number;
  poids_kg: number | null;
  description: string | null;
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
        "id, numero, poids_kg, description, clients(nom, telephone), douane_extractions(id, statut, updated_at)"
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

  const produitsParExtraction = new Map<string, { total: number; hs: number }>();
  if (extractionIds.length > 0) {
    const [{ data: produits }, { count: produitsRetires }] = await Promise.all([
      supabase
        .from("douane_produits")
        .select("extraction_id, hs_status")
        .in("extraction_id", extractionIds),
      supabase
        .from("douane_produits_retires")
        .select("id", { count: "exact", head: true })
        .in("extraction_id", extractionIds),
    ]);
    for (const p of produits ?? []) {
      const c = produitsParExtraction.get(p.extraction_id) ?? { total: 0, hs: 0 };
      c.total += 1;
      if (p.hs_status === "a_verifier") c.hs += 1;
      produitsParExtraction.set(p.extraction_id, c);
    }
    stats.hsIncertain = (produits ?? []).filter((p) => p.hs_status === "a_verifier").length;
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
  const lignesTable: LigneColisDouane[] = colisAffiches.map((c) => {
    const compte = c.douane_extractions
      ? produitsParExtraction.get(c.douane_extractions.id)
      : undefined;
    return {
      id: c.id,
      numero: c.numero,
      clientNom: c.clients?.nom ?? "",
      description: c.description,
      poidsKg: c.poids_kg,
      statut: statutDe(c),
      nbProduits: compte?.total ?? 0,
      nbHsAVerifier: compte?.hs ?? 0,
      majLe: c.douane_extractions?.updated_at ?? null,
    };
  });

  const etatDepart = projetId ? await chargerEtatDepart(supabase, projetId) : null;
  const nomDepart = projets?.find((p) => p.id === projetId)?.nom;

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
          {etatDepart && (
            <div className="mb-4">
              <ChecklistDepart etat={etatDepart} nomDepart={nomDepart} />
            </div>
          )}

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

          <ColisDouaneTable
            lignes={lignesTable}
            messageVide={statutFiltre ? "Aucun colis avec ce statut." : "Aucun colis pour ce départ."}
          />
          {etatDepart && <EtapeNavigation etat={etatDepart} etapeId="colis" />}
        </>
      )}
    </div>
  );
}
