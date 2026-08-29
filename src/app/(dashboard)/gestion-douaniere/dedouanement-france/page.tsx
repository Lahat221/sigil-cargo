import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { chargerLignesFrance } from "@/lib/dedouanement-france/lignesFrance";
import { chargerResumeAuditFrance } from "./actions";
import { ExpeditionFranceForm } from "@/components/douane/ExpeditionFranceForm";
import { ProduitsExclusionTable } from "@/components/douane/ProduitsExclusionTable";
import { GenerationFranceSection } from "@/components/douane/GenerationFranceSection";
import { IconBell } from "@/components/ui/Icons";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

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
  if (!BRAND.moduleFranceActif) notFound();

  const supabase = createClient();

  const { data: projets } = await supabase
    .from("projets")
    .select("id, nom")
    .order("created_at", { ascending: false });

  const projetId = searchParams.projet || projets?.[0]?.id;

  const { data: expedition } = projetId
    ? await supabase
        .from("douane_expeditions_france")
        .select("mawb, date_vol, poids_brut_lta_kg, nombre_colis, dimensions, lta_fichier_path")
        .eq("projet_id", projetId)
        .maybeSingle()
    : { data: null };

  let ltaFichier: { nom: string; urlSignee: string | null } | null = null;
  if (expedition?.lta_fichier_path) {
    const { data: signe } = await supabase.storage
      .from("lta-documents")
      .createSignedUrl(expedition.lta_fichier_path, 3600);
    const nom = expedition.lta_fichier_path.split("/").pop() ?? expedition.lta_fichier_path;
    ltaFichier = { nom, urlSignee: signe?.signedUrl ?? null };
  }

  const lignes = projetId ? await chargerLignesFrance(supabase, projetId) : [];
  const resumeAudit = projetId ? await chargerResumeAuditFrance(projetId) : null;
  const nbAlertes = resumeAudit
    ? resumeAudit.nbCritiques + resumeAudit.nbReglementation + resumeAudit.nbAmbigues
    : 0;

  return (
    <div className="max-w-5xl">
      <h1 className="mb-4 text-xl font-bold text-ink">Dédouanement France</h1>

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
            ltaFichier={ltaFichier}
          />

          <ProduitsExclusionTable lignes={lignes} />

          <Link
            href={`/gestion-douaniere/audit-france?projet=${projetId}`}
            className={`flex items-center justify-between gap-2 rounded-xl border p-4 shadow-sm transition-colors ${
              nbAlertes > 0
                ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                : "border-slate-200/70 bg-white hover:bg-slate-50"
            }`}
          >
            <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <IconBell size={16} />
              {resumeAudit
                ? `Audit produits (v${resumeAudit.version}) — ${nbAlertes} alerte(s) à traiter`
                : "Lancer l'audit produits à risque avant de générer les documents"}
            </span>
            <span className="text-sm text-gold-2">Voir l&apos;audit →</span>
          </Link>

          <GenerationFranceSection projetId={projetId} />
        </div>
      )}
    </div>
  );
}
