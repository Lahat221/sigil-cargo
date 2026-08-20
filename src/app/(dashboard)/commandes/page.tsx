import { createClient } from "@/lib/supabase/server";
import { FiltresBar } from "@/components/commandes/FiltresBar";
import { CommandesListe } from "@/components/commandes/CommandesListe";
import type { CommandeListItem } from "@/components/commandes/types";
import type { StatutCommande } from "@/types/database.types";

export const dynamic = "force-dynamic";

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: { q?: string; statut?: string; projet?: string };
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
    .order("created_at", { ascending: false });

  if (searchParams.statut) {
    query = query.eq("statut", searchParams.statut as StatutCommande);
  }
  if (searchParams.projet) {
    query = query.eq("projet_id", searchParams.projet);
  }

  const q = searchParams.q?.trim();
  if (q) {
    const numero = Number(q);
    const { data: matchingClients } = await supabase
      .from("clients")
      .select("id")
      .or(`nom.ilike.%${q}%,telephone.ilike.%${q}%`);

    const clientIds = (matchingClients ?? []).map((c) => c.id);
    const orParts = [];
    if (!Number.isNaN(numero)) orParts.push(`numero.eq.${numero}`);
    if (clientIds.length > 0)
      orParts.push(`client_id.in.(${clientIds.join(",")})`);

    if (orParts.length === 0) {
      // Aucun client ni numéro ne correspond à la recherche.
      return (
        <div>
          <h1 className="mb-4 text-lg font-semibold text-slate-900">
            Commandes
          </h1>
          <FiltresBar projets={projets ?? []} />
          <CommandesListe commandes={[]} />
        </div>
      );
    }
    query = query.or(orParts.join(","));
  }

  const { data: commandes, error } = await query.returns<CommandeListItem[]>();

  if (error) {
    return (
      <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Erreur lors du chargement des commandes : {error.message}
      </p>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Commandes</h1>
      <FiltresBar projets={projets ?? []} />
      <CommandesListe commandes={commandes ?? []} />
    </div>
  );
}
