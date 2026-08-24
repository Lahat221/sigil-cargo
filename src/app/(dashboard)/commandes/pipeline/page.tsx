import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PipelineBoard } from "@/components/commandes/PipelineBoard";
import { ProjetFilterSelect } from "@/components/commandes/ProjetFilterSelect";
import type { CommandeListItem } from "@/components/commandes/types";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: { projet?: string };
}) {
  const supabase = createClient();

  const { data: projets } = await supabase
    .from("projets")
    .select("id, nom")
    .order("created_at", { ascending: false });

  let query = supabase
    .from("commandes")
    .select(
      "id, numero, statut, poids_kg, montant_total, created_at, clients(nom, telephone), projets(nom)"
    )
    .neq("statut", "annulee")
    .order("created_at", { ascending: false });

  if (searchParams.projet) {
    query = query.eq("projet_id", searchParams.projet);
  }

  const { data: commandes } = await query.returns<CommandeListItem[]>();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-white">
          Suivi de colis
        </h1>
        <Link
          href="/commandes"
          className="text-sm text-white/60 hover:text-white"
        >
          ← Vue liste
        </Link>
      </div>

      <div className="mb-4 inline-block rounded-lg bg-white p-1 shadow-sm">
        <ProjetFilterSelect projets={projets ?? []} />
      </div>

      <PipelineBoard commandes={commandes ?? []} />
    </div>
  );
}
