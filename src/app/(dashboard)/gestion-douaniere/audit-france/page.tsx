import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { chargerHistoriqueAuditsFrance } from "../dedouanement-france/actions";
import { chargerLignesFrance } from "@/lib/dedouanement-france/lignesFrance";
import { AuditReportPanel } from "@/components/douane/AuditReportPanel";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

export const dynamic = "force-dynamic";
export const maxDuration = 600;

export default async function AuditFrancePage({
  searchParams,
}: {
  searchParams: { projet?: string };
}) {
  if (!BRAND.moduleFranceActif) notFound();

  const supabase = createClient();

  const { data: projets } = await supabase
    .from("projets")
    .select("id, nom")
    .order("created_at", { ascending: false });

  const projetId = searchParams.projet || projets?.[0]?.id;
  const nomProjet = projets?.find((p) => p.id === projetId)?.nom;

  if (!projetId) {
    return (
      <p className="rounded-xl border border-slate-200/70 bg-white p-4 text-sm text-slate-500 shadow-sm">
        Aucun départ trouvé.
      </p>
    );
  }

  const historiqueAudits = await chargerHistoriqueAuditsFrance(projetId);
  const lignes = await chargerLignesFrance(supabase, projetId);
  const produitsExclus = lignes.filter((l) => l.exclu).map((l) => l.produitId);

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink">Audit France</h1>
        {nomProjet && <p className="text-sm text-ink-muted">{nomProjet}</p>}
      </div>

      {historiqueAudits.length === 0 && (
        <p className="mb-4 text-sm text-ink-muted">
          Aucun audit encore lancé pour ce départ. Vérifie d&apos;abord que le MAWB et la date de vol
          sont renseignés sur{" "}
          <Link
            href={`/gestion-douaniere/dedouanement-france?projet=${projetId}`}
            className="text-gold-2 hover:underline"
          >
            Dédouanement France
          </Link>
          , puis lance l&apos;audit ci-dessous.
        </p>
      )}

      <AuditReportPanel
        projetId={projetId}
        historiqueInitial={historiqueAudits}
        produitsExclusInitial={produitsExclus}
      />
    </div>
  );
}
