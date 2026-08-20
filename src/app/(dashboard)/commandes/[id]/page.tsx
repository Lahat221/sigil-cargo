import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatutBadge, STATUT_LABELS } from "@/components/commandes/StatutBadge";
import { StatutStepper } from "@/components/commandes/StatutStepper";
import { SupprimerCommandeButton } from "@/components/commandes/SupprimerCommandeButton";
import { NotifButtons } from "@/components/commandes/NotifButtons";
import type { StatutCommande } from "@/types/database.types";

export const dynamic = "force-dynamic";

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

type CommandeDetail = {
  id: string;
  numero: number;
  statut: StatutCommande;
  poids_kg: number;
  prix_par_kg: number;
  enveloppe: boolean;
  nombre_paquets: number;
  montant_total: number;
  adresse_livraison: string | null;
  description: string | null;
  remarque_interne: string | null;
  code_barre_colis: string | null;
  photo_urls: string[] | null;
  video_url: string | null;
  date_livraison_reelle: string | null;
  created_at: string;
  clients: { nom: string; telephone: string | null; adresse: string | null } | null;
  projets: { nom: string } | null;
  produits: { nom: string } | null;
};

export default async function CommandeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: commande } = await supabase
    .from("commandes")
    .select(
      "id, numero, statut, poids_kg, prix_par_kg, enveloppe, nombre_paquets, montant_total, adresse_livraison, description, remarque_interne, code_barre_colis, photo_urls, video_url, date_livraison_reelle, created_at, clients(nom, telephone, adresse), projets(nom), produits(nom)"
    )
    .eq("id", params.id)
    .maybeSingle<CommandeDetail>();

  if (!commande) notFound();

  const { data: historique } = await supabase
    .from("commandes_historique")
    .select("ancien_statut, nouveau_statut, created_at")
    .eq("commande_id", commande.id)
    .order("created_at", { ascending: false });

  const photoUrls: string[] = [];
  if (commande.photo_urls) {
    for (const path of commande.photo_urls) {
      const { data } = await supabase.storage
        .from("commandes-media")
        .createSignedUrl(path, 3600);
      if (data) photoUrls.push(data.signedUrl);
    }
  }
  let videoUrl: string | null = null;
  if (commande.video_url) {
    const { data } = await supabase.storage
      .from("commandes-media")
      .createSignedUrl(commande.video_url, 3600);
    videoUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/commandes"
        className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-900"
      >
        ← Retour à la liste
      </Link>

      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            Commande #{commande.numero}
          </h1>
          <p className="text-sm text-slate-500">
            {commande.clients?.nom ?? "—"}
            {commande.clients?.telephone && ` · ${commande.clients.telephone}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatutBadge statut={commande.statut} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Link
          href={`/commandes/${commande.id}/modifier`}
          className="text-sm font-medium text-slate-700 hover:underline"
        >
          Modifier
        </Link>
        <Link
          href={`/commandes/${commande.id}/facture`}
          target="_blank"
          className="text-sm text-slate-600 hover:underline"
        >
          Facture
        </Link>
        <Link
          href={`/commandes/${commande.id}/etiquette?print=1`}
          target="_blank"
          className="text-sm text-slate-600 hover:underline"
        >
          Imprimer
        </Link>
        <NotifButtons commandeId={commande.id} />
        <SupprimerCommandeButton
          commandeId={commande.id}
          numero={commande.numero}
          redirectToListe
        />
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Pipeline</h2>
        <StatutStepper commandeId={commande.id} statut={commande.statut} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-slate-500">Projet</p>
          <p className="font-medium text-slate-900">
            {commande.projets?.nom ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Produit</p>
          <p className="font-medium text-slate-900">
            {commande.produits?.nom ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Poids</p>
          <p className="font-medium text-slate-900">{commande.poids_kg} kg</p>
        </div>
        <div>
          <p className="text-slate-500">Montant</p>
          <p className="font-medium text-slate-900">
            {montantFormatter.format(commande.montant_total)}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Paquets</p>
          <p className="font-medium text-slate-900">
            {commande.nombre_paquets}
            {commande.enveloppe && " + enveloppe"}
          </p>
        </div>
        <div>
          <p className="text-slate-500">Code-barre colis</p>
          <p className="font-mono font-medium text-slate-900">
            {commande.code_barre_colis ?? "—"}
          </p>
        </div>
        {commande.adresse_livraison && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-slate-500">Adresse de livraison</p>
            <p className="font-medium text-slate-900">
              {commande.adresse_livraison}
            </p>
          </div>
        )}
        {commande.description && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-slate-500">Description</p>
            <p className="text-slate-900">{commande.description}</p>
          </div>
        )}
        {commande.remarque_interne && (
          <div className="col-span-2 sm:col-span-3">
            <p className="text-slate-500">Remarque interne</p>
            <p className="text-slate-900">{commande.remarque_interne}</p>
          </div>
        )}
      </div>

      {(photoUrls.length > 0 || videoUrl) && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-700">Médias</h2>
          <div className="flex flex-wrap gap-3">
            {photoUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt="Photo commande"
                className="h-24 w-24 rounded-md object-cover"
              />
            ))}
            {videoUrl && (
              <video src={videoUrl} controls className="h-24 rounded-md" />
            )}
          </div>
        </div>
      )}

      {historique && historique.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-700">
            Historique
          </h2>
          <ul className="space-y-2 text-sm">
            {historique.map((h, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="text-slate-700">
                  {h.ancien_statut ? STATUT_LABELS[h.ancien_statut] : "—"} →{" "}
                  <span className="font-medium">
                    {STATUT_LABELS[h.nouveau_statut]}
                  </span>
                </span>
                <span className="text-slate-400">
                  {dateFormatter.format(new Date(h.created_at))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
