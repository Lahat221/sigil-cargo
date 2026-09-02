import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatutBadge, STATUT_LABELS } from "@/components/commandes/StatutBadge";
import { StatutStepper } from "@/components/commandes/StatutStepper";
import { SupprimerCommandeButton } from "@/components/commandes/SupprimerCommandeButton";
import { NotifButtons } from "@/components/commandes/NotifButtons";
import { PartagerWhatsAppButton } from "@/components/commandes/PartagerMediaButton";
import { PartagerFichierButton } from "@/components/commandes/PartagerFichierButton";
import { PartagerVideoWhatsAppButton } from "@/components/commandes/PartagerVideoWhatsAppButton";
import { NotifRetraitButton } from "@/components/commandes/NotifRetraitButton";
import { construireTexteRetrait } from "@/lib/commandes/texteRetrait";
import { IconPencil, IconFileText, IconPrinter } from "@/components/ui/Icons";
import type { StatutCommande } from "@/types/database.types";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

export const dynamic = "force-dynamic";

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BRAND.devise,
});
const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

type CommandeDetail = {
  id: string;
  numero: number;
  statut: StatutCommande;
  poids_kg: number | null;
  prix_par_kg: number | null;
  mode_fret: "aerien" | "conteneur";
  volume_m3: number | null;
  prix_par_m3: number | null;
  enveloppe: boolean;
  nombre_paquets: number;
  montant_total: number;
  adresse_livraison: string | null;
  description: string | null;
  remarque_interne: string | null;
  code_barre_colis: string | null;
  photo_urls: string[] | null;
  video_urls: string[] | null;
  note_vocale_url: string | null;
  date_livraison_reelle: string | null;
  created_at: string;
  clients: {
    nom: string;
    telephone: string | null;
    telephone_pays: string | null;
    adresse: string | null;
  } | null;
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
      "id, numero, statut, poids_kg, prix_par_kg, mode_fret, volume_m3, prix_par_m3, enveloppe, nombre_paquets, montant_total, adresse_livraison, description, remarque_interne, code_barre_colis, photo_urls, video_urls, note_vocale_url, date_livraison_reelle, created_at, clients(nom, telephone, telephone_pays, adresse), projets(nom), produits(nom)"
    )
    .eq("id", params.id)
    .maybeSingle<CommandeDetail>();

  if (!commande) notFound();

  const { data: historique } = await supabase
    .from("commandes_historique")
    .select("ancien_statut, nouveau_statut, created_at")
    .eq("commande_id", commande.id)
    .order("created_at", { ascending: false });

  const photoItems: { path: string; url: string }[] = [];
  if (commande.photo_urls) {
    for (const path of commande.photo_urls) {
      const { data } = await supabase.storage
        .from("commandes-media")
        .createSignedUrl(path, 3600);
      if (data) photoItems.push({ path, url: data.signedUrl });
    }
  }
  const videoItems: { path: string; url: string }[] = [];
  if (commande.video_urls) {
    for (const path of commande.video_urls) {
      const { data } = await supabase.storage
        .from("commandes-media")
        .createSignedUrl(path, 3600);
      if (data) videoItems.push({ path, url: data.signedUrl });
    }
  }
  let noteVocaleUrl: string | null = null;
  if (commande.note_vocale_url) {
    const { data } = await supabase.storage
      .from("commandes-media")
      .createSignedUrl(commande.note_vocale_url, 3600);
    noteVocaleUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/commandes"
        className="mb-4 inline-block text-sm text-ink-muted hover:text-ink"
      >
        ← Retour à la liste
      </Link>

      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Colis #{commande.numero}
          </h1>
          <p className="text-sm text-ink-muted">
            {commande.clients?.nom ?? "—"}
            {commande.clients?.telephone && ` · ${commande.clients.telephone}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatutBadge statut={commande.statut} />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/70 bg-white p-2 shadow-sm">
        <Link
          href={`/commandes/${commande.id}/modifier`}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          <IconPencil size={14} />
          Modifier
        </Link>
        <Link
          href={`/commandes/${commande.id}/facture`}
          target="_blank"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
        >
          <IconFileText size={14} />
          Facture
        </Link>
        <Link
          href={`/commandes/${commande.id}/etiquette?print=1`}
          target="_blank"
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
        >
          <IconPrinter size={14} />
          Imprimer
        </Link>
        <NotifButtons
          commandeId={commande.id}
          numero={commande.numero}
          clientNom={commande.clients?.nom ?? ""}
          clientTelephone={commande.clients?.telephone ?? null}
          clientTelephonePays={commande.clients?.telephone_pays ?? null}
          poidsKg={commande.poids_kg}
          montantTotal={commande.montant_total}
          description={commande.description}
        />
        <PartagerWhatsAppButton
          label="Partager la commande (WhatsApp perso)"
          clientTelephone={commande.clients?.telephone ?? null}
          clientTelephonePays={commande.clients?.telephone_pays ?? null}
          texte={[
            `Colis #${commande.numero} chez ${BRAND.nom}`,
            commande.projets?.nom ? `Projet : ${commande.projets.nom}` : null,
            commande.poids_kg !== null ? `Poids : ${commande.poids_kg} kg` : null,
            commande.mode_fret === "conteneur"
              ? `Volume : ${commande.volume_m3} m³`
              : null,
            `Montant : ${montantFormatter.format(commande.montant_total)}`,
            `Statut : ${STATUT_LABELS[commande.statut]}`,
            commande.description ? `Contenu : ${commande.description}` : null,
          ]
            .filter(Boolean)
            .join("\n")}
        />
        {BRAND.retrait && (
          <NotifRetraitButton
            clientNom={commande.clients?.nom ?? ""}
            clientTelephone={commande.clients?.telephone ?? null}
            clientTelephonePays={commande.clients?.telephone_pays ?? null}
            videoUrl={videoItems[0]?.url ?? null}
            texte={construireTexteRetrait({
              clientNom: commande.clients?.nom ?? "",
              numero: commande.numero,
              description: commande.description,
              poidsKg: commande.poids_kg,
              montantTotal: commande.montant_total,
            })}
          />
        )}
        <SupprimerCommandeButton
          commandeId={commande.id}
          numero={commande.numero}
          redirectToListe
        />
      </div>

      <div className="mb-6 rounded-xl border border-slate-200/70 bg-white shadow-sm p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Suivi de colis</h2>
        <StatutStepper commandeId={commande.id} statut={commande.statut} />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-slate-200/70 bg-white shadow-sm p-4 text-sm sm:grid-cols-3">
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
          <p className="font-medium text-slate-900">
            {commande.poids_kg !== null ? `${commande.poids_kg} kg` : "—"}
          </p>
        </div>
        {commande.mode_fret === "conteneur" && (
          <div>
            <p className="text-slate-500">Volume</p>
            <p className="font-medium text-slate-900">
              {commande.volume_m3} m³
              {commande.prix_par_m3 !== null &&
                ` (${montantFormatter.format(commande.prix_par_m3)}/m³)`}
            </p>
          </div>
        )}
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

      {(photoItems.length > 0 || videoItems.length > 0 || noteVocaleUrl) && (
        <div className="mb-6 rounded-xl border border-slate-200/70 bg-white shadow-sm p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-slate-700">Médias</h2>
            {(photoItems.length > 0 || videoItems.length > 0) && (
              <PartagerWhatsAppButton
                label="Partager avec le client (WhatsApp perso)"
                clientTelephone={commande.clients?.telephone ?? null}
                clientTelephonePays={commande.clients?.telephone_pays ?? null}
                texte={`Bonjour ${commande.clients?.nom ?? ""}, voici les photos/vidéo de votre colis (colis #${commande.numero}).`}
              />
            )}
          </div>
          <div className="flex flex-wrap items-start gap-3">
            {photoItems.map((item) => (
              <div key={item.path} className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt="Photo commande"
                  className="h-24 w-24 rounded-md object-cover"
                />
                <PartagerFichierButton
                  url={item.url}
                  filename={item.path.split("/").pop() ?? "photo.jpg"}
                  mimeType="image/jpeg"
                />
              </div>
            ))}
            {videoItems.map((item) => (
              <div key={item.path} className="flex flex-col items-center gap-1">
                <video src={item.url} controls className="h-24 rounded-md" />
                <div className="flex items-center gap-2">
                  <PartagerFichierButton
                    url={item.url}
                    filename={item.path.split("/").pop() ?? "video.mp4"}
                    mimeType="video/mp4"
                  />
                  <PartagerVideoWhatsAppButton
                    url={item.url}
                    numero={commande.numero}
                  />
                </div>
              </div>
            ))}
          </div>
          {(photoItems.length > 0 || videoItems.length > 0) && (
            <p className="mt-2 text-xs text-slate-400">
              &quot;Partager&quot; ouvre le partage natif du téléphone (choisis
              WhatsApp pour l&apos;envoyer directement). Si l&apos;appareil ne
              le permet pas, le fichier s&apos;ouvre dans un nouvel onglet
              pour un enregistrement manuel.
            </p>
          )}
          {noteVocaleUrl && (
            <div className="mt-3">
              <p className="mb-1 text-xs text-slate-500">Note vocale</p>
              <audio src={noteVocaleUrl} controls className="h-9 w-full max-w-xs" />
            </div>
          )}
        </div>
      )}

      {historique && historique.length > 0 && (
        <div className="rounded-xl border border-slate-200/70 bg-white shadow-sm p-4">
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
