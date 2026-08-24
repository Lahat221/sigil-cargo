import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FiltresBar } from "@/components/commandes/FiltresBar";
import { CommandesListe } from "@/components/commandes/CommandesListe";
import { ExportCommandesButton } from "@/components/commandes/ExportCommandesButton";
import { ActualiserButton } from "@/components/commandes/ActualiserButton";
import { RecalculerPrixButton } from "@/components/commandes/RecalculerPrixButton";
import { IconGrid, IconPlus } from "@/components/ui/Icons";
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
      "id, numero, statut, poids_kg, montant_total, description, code_barre_colis, created_at, clients(nom, telephone, telephone_pays, adresse), projets(nom)"
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
        <h1 className="text-xl font-bold text-white">Colis</h1>
        <div className="flex flex-wrap gap-2">
          <ActualiserButton />
          <Link
            href="/commandes/pipeline"
            className="flex items-center gap-1.5 rounded-md border border-white/25 px-3 py-1.5 text-sm font-medium text-white/85 transition-colors hover:bg-white/10"
          >
            <IconGrid size={15} />
            Suivi de colis
          </Link>
          <RecalculerPrixButton />
          <ExportCommandesButton commandes={commandes} />
          <Link
            href="/commandes/nouvelle"
            className="flex items-center gap-1.5 rounded-lg bg-gold-gradient px-4 py-1.5 text-sm font-semibold text-navy shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:brightness-105"
          >
            <IconPlus size={15} />
            Nouveau colis
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <FiltresBar projets={projets ?? []} />

        {loadError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Erreur lors du chargement des commandes : {loadError}
          </p>
        ) : (
          <CommandesListe commandes={commandes} />
        )}
      </div>
    </div>
  );
}
