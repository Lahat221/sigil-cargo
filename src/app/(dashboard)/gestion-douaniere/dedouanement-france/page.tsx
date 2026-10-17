import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExpeditionFranceForm } from "@/components/douane/ExpeditionFranceForm";
import { EtapeBandeau, EtapeNavigation } from "@/components/douane/EtapesNav";
import { chargerEtatDepart } from "@/lib/douane/etapesDepart";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

export const dynamic = "force-dynamic";
// La lecture automatique de la LTA appelle l'IA : on garde de la marge de temps.
export const maxDuration = 120;

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
  const nomProjet = projets?.find((p) => p.id === projetId)?.nom;

  const { data: expedition } = projetId
    ? await supabase
        .from("douane_expeditions_france")
        .select("mawb, date_vol, poids_brut_lta_kg, nombre_colis, dimensions, lta_fichier_path")
        .eq("projet_id", projetId)
        .maybeSingle()
    : { data: null };

  let ltaFichier: { nom: string; urlSignee: string | null; path: string } | null = null;
  if (expedition?.lta_fichier_path) {
    const { data: signe } = await supabase.storage
      .from("lta-documents")
      .createSignedUrl(expedition.lta_fichier_path, 3600);
    const nom = expedition.lta_fichier_path.split("/").pop() ?? expedition.lta_fichier_path;
    ltaFichier = { nom, urlSignee: signe?.signedUrl ?? null, path: expedition.lta_fichier_path };
  }

  const etat = projetId ? await chargerEtatDepart(supabase, projetId) : null;

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink">LTA du départ</h1>
        {nomProjet && <p className="text-sm text-ink-muted">{nomProjet}</p>}
      </div>

      {!projetId ? (
        <p className="rounded-xl border border-slate-200/70 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Aucun départ trouvé.
        </p>
      ) : (
        <>
          {etat && <EtapeBandeau etat={etat} etapeId="lta" />}

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

          {etat && <EtapeNavigation etat={etat} etapeId="lta" />}
        </>
      )}
    </div>
  );
}
