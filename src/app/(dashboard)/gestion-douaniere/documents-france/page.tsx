import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GenerationFranceSection } from "@/components/douane/GenerationFranceSection";
import { EtapeBandeau, EtapeNavigation } from "@/components/douane/EtapesNav";
import { chargerEtatDepart } from "@/lib/douane/etapesDepart";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

export const dynamic = "force-dynamic";
// Plan Pro + Fluid Compute autorise jusqu'à 800s — les générations France sur un
// gros départ ont déjà pris plusieurs minutes : on garde de la marge.
export const maxDuration = 600;

export default async function DocumentsFrancePage({
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

  const etat = await chargerEtatDepart(supabase, projetId);

  return (
    <div className="max-w-5xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-ink">Documents France</h1>
        {nomProjet && <p className="text-sm text-ink-muted">{nomProjet}</p>}
      </div>

      <EtapeBandeau etat={etat} etapeId="documents" />

      <GenerationFranceSection projetId={projetId} />

      <EtapeNavigation etat={etat} etapeId="documents" />
    </div>
  );
}
