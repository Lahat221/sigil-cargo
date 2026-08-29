import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditCommandeForm } from "@/components/commandes/EditCommandeForm";

export const dynamic = "force-dynamic";

export default async function ModifierCommandePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: commande } = await supabase
    .from("commandes")
    .select(
      "id, projet_id, produit_id, poids_kg, prix_par_kg, mode_fret, volume_m3, prix_par_m3, enveloppe, nombre_paquets, adresse_livraison, description, remarque_interne, photo_urls, video_urls, note_vocale_url, clients(id, nom, telephone, adresse)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!commande || !commande.clients) notFound();

  const [{ data: produits }, { data: projets }] = await Promise.all([
    supabase.from("produits").select("id, nom, prix_par_kg").order("nom"),
    supabase
      .from("projets")
      .select("id, nom, mode_fret")
      .order("created_at", { ascending: false }),
  ]);

  const existingPhotos = [];
  if (commande.photo_urls) {
    for (const path of commande.photo_urls) {
      const { data } = await supabase.storage
        .from("commandes-media")
        .createSignedUrl(path, 3600);
      if (data) existingPhotos.push({ path, url: data.signedUrl });
    }
  }
  const existingVideos = [];
  if (commande.video_urls) {
    for (const path of commande.video_urls) {
      const { data } = await supabase.storage
        .from("commandes-media")
        .createSignedUrl(path, 3600);
      if (data) existingVideos.push({ path, url: data.signedUrl });
    }
  }
  let existingVoiceNote = null;
  if (commande.note_vocale_url) {
    const { data } = await supabase.storage
      .from("commandes-media")
      .createSignedUrl(commande.note_vocale_url, 3600);
    if (data)
      existingVoiceNote = { path: commande.note_vocale_url, url: data.signedUrl };
  }

  return (
    <div>
      <Link
        href={`/commandes/${commande.id}`}
        className="mb-4 inline-block text-sm text-ink-muted hover:text-ink"
      >
        ← Retour au colis
      </Link>
      <h1 className="mb-4 text-xl font-bold text-ink">
        Modifier le colis
      </h1>

      <EditCommandeForm
        commandeId={commande.id}
        initialClient={commande.clients}
        initialProjetId={commande.projet_id}
        initialProduitId={commande.produit_id}
        initialPoidsKg={commande.poids_kg}
        initialPrixParKg={commande.prix_par_kg}
        initialVolumeM3={commande.volume_m3}
        initialPrixParM3={commande.prix_par_m3}
        initialEnveloppe={commande.enveloppe}
        initialNombrePaquets={commande.nombre_paquets}
        initialAdresseLivraison={commande.adresse_livraison ?? ""}
        initialDescription={commande.description ?? ""}
        initialRemarqueInterne={commande.remarque_interne ?? ""}
        existingPhotos={existingPhotos}
        existingVideos={existingVideos}
        existingVoiceNote={existingVoiceNote}
        produits={produits ?? []}
        projets={projets ?? []}
      />
    </div>
  );
}
