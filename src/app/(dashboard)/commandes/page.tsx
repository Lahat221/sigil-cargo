import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FiltresBar } from "@/components/commandes/FiltresBar";
import { CommandesListe } from "@/components/commandes/CommandesListe";
import { ExportCommandesButton } from "@/components/commandes/ExportCommandesButton";
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

  let commandes: CommandeListItem[] = [];
  let loadError: string | null = null;

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
    const [{ data: matchingClients }, { data: matchingProduits }] =
      await Promise.all([
        supabase
          .from("clients")
          .select("id")
          .or(`nom.ilike.%${q}%,telephone.ilike.%${q}%`),
        supabase.from("produits").select("id").ilike("nom", `%${q}%`),
      ]);

    const clientIds = (matchingClients ?? []).map((c) => c.id);
    const produitIds = (matchingProduits ?? []).map((p) => p.id);

    const orParts: string[] = [`description.ilike.%${q}%`];
    if (!Number.isNaN(numero)) orParts.push(`numero.eq.${numero}`);
    if (clientIds.length > 0)
      orParts.push(`client_id.in.(${clientIds.join(",")})`);
    if (produitIds.length > 0)
      orParts.push(`produit_id.in.(${produitIds.join(",")})`);

    query = query.or(orParts.join(","));
  }

  {
    const { data, error } = await query.returns<CommandeListItem[]>();
    if (error) {
      loadError = error.message;
    } else {
      commandes = data ?? [];
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-slate-900">Commandes</h1>
        <div className="flex gap-2">
          <Link
            href="/commandes/pipeline"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Pipeline
          </Link>
          <ExportCommandesButton commandes={commandes} />
          <Link
            href="/commandes/nouvelle"
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            + Nouvelle commande
          </Link>
        </div>
      </div>

      <FiltresBar projets={projets ?? []} />

      {loadError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Erreur lors du chargement des commandes : {loadError}
        </p>
      ) : (
        <CommandesListe commandes={commandes} />
      )}
    </div>
  );
}
