import { createClient } from "@/lib/supabase/server";
import { chargerLignesFrance } from "@/lib/dedouanement-france/lignesFrance";
import { ExpeditionFranceForm } from "@/components/douane/ExpeditionFranceForm";
import { ProduitsExclusionTable } from "@/components/douane/ProduitsExclusionTable";
import { AuditReportPanel } from "@/components/douane/AuditReportPanel";
import { GenerationFranceSection } from "@/components/douane/GenerationFranceSection";

export const dynamic = "force-dynamic";
// Plan Pro + Fluid Compute autorise jusqu'à 800s — les générations France
// (audit + final) sur un gros départ ont déjà mis ~140-220s sur Hobby (300s),
// on prend de la marge plutôt que de re-flirter avec la limite.
export const maxDuration = 600;

export default async function DedouanementFrancePage({
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

  const { data: expedition } = projetId
    ? await supabase
        .from("douane_expeditions_france")
        .select("mawb, date_vol, poids_brut_lta_kg, nombre_colis, dimensions")
        .eq("projet_id", projetId)
        .maybeSingle()
    : { data: null };

  const lignes = projetId ? await chargerLignesFrance(supabase, projetId) : [];

  return (
    <div className="max-w-5xl">
      <h1 className="mb-4 text-xl font-bold text-white">Dédouanement France</h1>

      {!projetId ? (
        <p className="rounded-xl border border-slate-200/70 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Aucun départ trouvé.
        </p>
      ) : (
        <div className="space-y-4">
          <ExpeditionFranceForm
            projetId={projetId}
            initial={{
              mawb: expedition?.mawb ?? "",
              dateVol: expedition?.date_vol ?? "",
              poidsBrutLtaKg: expedition?.poids_brut_lta_kg?.toString() ?? "",
              nombreColis: expedition?.nombre_colis ?? 1,
              dimensions: expedition?.dimensions ?? "",
            }}
          />

          <ProduitsExclusionTable lignes={lignes} />

          <AuditReportPanel projetId={projetId} />

          <GenerationFranceSection projetId={projetId} />
        </div>
      )}
    </div>
  );
}
