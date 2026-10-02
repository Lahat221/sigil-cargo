import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FiltresBar } from "@/components/commandes/FiltresBar";
import { chargerDestinations } from "@/lib/commandes/destinations";
import { CommandesListe } from "@/components/commandes/CommandesListe";
import { Pagination } from "@/components/commandes/Pagination";
import { ExportCommandesButton } from "@/components/commandes/ExportCommandesButton";
import { ActualiserButton } from "@/components/commandes/ActualiserButton";
import { RecalculerPrixButton } from "@/components/commandes/RecalculerPrixButton";
import { IconGrid, IconPlus } from "@/components/ui/Icons";
import type { CommandeListItem } from "@/components/commandes/types";
import type { StatutCommande } from "@/types/database.types";

export const dynamic = "force-dynamic";

const PAR_PAGE = 20;

export default async function CommandesPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    statut?: string;
    projet?: string;
    destination?: string;
    debut?: string;
    fin?: string;
    page?: string;
  };
}) {
  const supabase = createClient();

  const { data: projets } = await supabase
    .from("projets")
    .select("id, nom")
    .order("created_at", { ascending: false });

  const destinations = await chargerDestinations(supabase, { inclureInactives: true });

  let commandes: CommandeListItem[] = [];
  let commandesExport: CommandeListItem[] = [];
  let loadError: string | null = null;
  let total = 0;

  const page = Math.max(1, Number(searchParams.page) || 1);
  const SELECT_COLONNES =
    "id, numero, statut, poids_kg, montant_total, destination, description, video_urls, code_barre_colis, created_at, clients(nom, telephone, telephone_pays, adresse), projets(nom)";

  const q = searchParams.q?.trim();
  let clientIds: string[] = [];
  let produitIds: string[] = [];
  if (q) {
    const [{ data: matchingClients }, { data: matchingProduits }] =
      await Promise.all([
        supabase
          .from("clients")
          .select("id")
          .or(`nom.ilike.%${q}%,telephone.ilike.%${q}%`),
        supabase.from("produits").select("id").ilike("nom", `%${q}%`),
      ]);
    clientIds = (matchingClients ?? []).map((c) => c.id);
    produitIds = (matchingProduits ?? []).map((p) => p.id);
  }

  // Filtres communs à la requête paginée (affichage) et à celle sans
  // limite (export CSV) — pour que l'export couvre bien tout ce qui
  // correspond aux filtres, pas seulement la page affichée à l'écran.
  function appliquerFiltres() {
    let q2 = supabase
      .from("commandes")
      .select(SELECT_COLONNES, { count: "exact" })
      .order("created_at", { ascending: false });
    if (searchParams.statut) {
      q2 = q2.eq("statut", searchParams.statut as StatutCommande);
    }
    if (searchParams.projet) {
      q2 = q2.eq("projet_id", searchParams.projet);
    }
    if (searchParams.destination) {
      q2 = q2.eq("destination", searchParams.destination);
    }
    if (searchParams.debut) {
      q2 = q2.gte("created_at", `${searchParams.debut}T00:00:00`);
    }
    if (searchParams.fin) {
      q2 = q2.lte("created_at", `${searchParams.fin}T23:59:59`);
    }
    if (q) {
      const numero = Number(q);
      const orParts: string[] = [`description.ilike.%${q}%`];
      if (!Number.isNaN(numero)) orParts.push(`numero.eq.${numero}`);
      if (clientIds.length > 0)
        orParts.push(`client_id.in.(${clientIds.join(",")})`);
      if (produitIds.length > 0)
        orParts.push(`produit_id.in.(${produitIds.join(",")})`);
      q2 = q2.or(orParts.join(","));
    }
    return q2;
  }

  const requetePaginee = appliquerFiltres().range(
    (page - 1) * PAR_PAGE,
    page * PAR_PAGE - 1
  );

  const [pageResultat, exportResultat] = await Promise.all([
    requetePaginee.returns<CommandeListItem[]>(),
    appliquerFiltres().returns<CommandeListItem[]>(),
  ]);

  if (pageResultat.error) {
    loadError = pageResultat.error.message;
  } else {
    commandes = pageResultat.data ?? [];
    total = pageResultat.count ?? 0;
  }
  commandesExport = exportResultat.data ?? [];

  const totalPages = Math.max(1, Math.ceil(total / PAR_PAGE));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink">Colis</h1>
        <div className="flex flex-wrap gap-2">
          <ActualiserButton />
          <Link
            href="/commandes/pipeline"
            className="flex items-center gap-1.5 rounded-md border border-ink-overlay px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-ink-overlay"
          >
            <IconGrid size={15} />
            Suivi de colis
          </Link>
          <RecalculerPrixButton />
          <ExportCommandesButton commandes={commandesExport} />
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
        <FiltresBar projets={projets ?? []} destinations={destinations} />

        {loadError ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Erreur lors du chargement des commandes : {loadError}
          </p>
        ) : (
          <>
            <CommandesListe commandes={commandes} />
            <Pagination page={page} totalPages={totalPages} total={total} />
          </>
        )}
      </div>
    </div>
  );
}
