import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { FiltresBar } from "@/components/commandes/FiltresBar";
import { chargerDestinations } from "@/lib/commandes/destinations";
import { chargerParametresSite, reglesPrix } from "@/lib/parametres";
import { verifierPrixColis } from "@/lib/commandes/verifPrix";
import { TARIF_ALIMENTAIRE_ACTIF } from "@/lib/commandes/tarifAlimentaire";
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
    `id, numero, statut, poids_kg, montant_total, destination, prix_par_kg, ${TARIF_ALIMENTAIRE_ACTIF ? "alimentaire, " : ""}mode_fret, description, video_urls, code_barre_colis, created_at, clients(nom, telephone, telephone_pays, adresse), projets(nom), paiements(montant_base)`;

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

  // Contrôle du prix au kilo (destination + règle « petit colis ») sur chaque colis.
  const regles = reglesPrix(await chargerParametresSite(supabase));
  const avecVerif = (c: CommandeListItem): CommandeListItem => ({
    ...c,
    verif_prix: verifierPrixColis(c, destinations, regles),
  });
  commandes = commandes.map(avecVerif);
  commandesExport = commandesExport.map(avecVerif);
  const prixAVerifier = commandesExport.filter((c) => c.verif_prix?.ecart);

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

      {prixAVerifier.length > 0 && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">
            ⚠ {prixAVerifier.length} colis {prixAVerifier.length > 1 ? "ont" : "a"} un prix au kilo différent du
            tarif attendu
          </p>
          <p className="mb-2 text-xs">
            Tarif de la destination, ou tarif petit colis sous le seuil de poids. Un prix négocié apparaît aussi ici :
            vérifiez chaque colis.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {prixAVerifier.slice(0, 30).map((c) => (
              <Link
                key={c.id}
                href={`/commandes/${c.id}/modifier`}
                className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100"
                title={`${c.verif_prix?.prixParKg} €/kg appliqué — ${c.verif_prix?.raison}`}
              >
                #{c.numero}
              </Link>
            ))}
            {prixAVerifier.length > 30 && <span className="text-xs">+ {prixAVerifier.length - 30} autres</span>}
          </div>
        </div>
      )}

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
