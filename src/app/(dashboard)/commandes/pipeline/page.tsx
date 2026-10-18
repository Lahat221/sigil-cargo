import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PipelineBoard } from "@/components/commandes/PipelineBoard";
import { ProjetFilterSelect } from "@/components/commandes/ProjetFilterSelect";
import { chargerDestinations } from "@/lib/commandes/destinations";
import { RepartitionDestinations } from "@/components/dashboard/RepartitionDestinations";
import { repartirParDestination } from "@/lib/commandes/repartition";
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
    .select("id, nom, statut")
    .order("created_at", { ascending: false });

  // Par défaut : le départ en cours (le plus récent encore actif) plutôt que
  // tous les départs depuis le début. ?projet=tous pour tout voir.
  const projetParDefaut = (projets ?? []).find((p) => p.statut === "actif")?.id;
  const choix = searchParams.projet ?? projetParDefaut ?? "tous";
  const projetId = choix === "tous" ? null : choix;

  let query = supabase
    .from("commandes")
    .select(
      "id, numero, statut, poids_kg, montant_total, destination, contenu_verifie, nombre_paquets, client_id, created_at, clients(nom, telephone), projets(nom), paiements(montant_base), commandes_historique(nouveau_statut, created_at)"
    )
    .neq("statut", "annulee")
    .order("created_at", { ascending: false });

  if (projetId) query = query.eq("projet_id", projetId);

  const [{ data: commandes }, destinations] = await Promise.all([
    query.returns<CommandeListItem[]>(),
    chargerDestinations(supabase),
  ]);

  const repartition = repartirParDestination(commandes ?? []);
  const nomProjet = (projets ?? []).find((p) => p.id === projetId)?.nom;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">Suivi de colis</h1>
        <Link href="/commandes" className="text-sm text-ink-muted hover:text-ink">
          ← Vue liste
        </Link>
      </div>

      <div className="mb-4 inline-block rounded-lg bg-white p-1 shadow-sm">
        <ProjetFilterSelect projets={projets ?? []} defaut={projetParDefaut ?? "tous"} />
      </div>

      {projetId && (
        <div className="mb-5">
          <RepartitionDestinations
            lignes={repartition.lignes}
            total={repartition.total}
            titre="Répartition du départ par destination"
            sousTitre={nomProjet}
            montantsMasquesParDefaut={false}
          />
        </div>
      )}

      <PipelineBoard
        commandes={commandes ?? []}
        projetId={projetId}
        destinations={destinations.map((d) => d.nom)}
      />
    </div>
  );
}
