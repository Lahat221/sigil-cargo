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
      "id, projet_id, produit_id, poids_kg, prix_par_kg, enveloppe, nombre_paquets, adresse_livraison, description, remarque_interne, photo_urls, video_url, note_vocale_url, clients(id, nom, telephone, adresse)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!commande || !commande.clients) notFound();

  const [{ data: produits }, { data: projets }] = await Promise.all([
    supabase.from("produits").select("id, nom, prix_par_kg").order("nom"),
    supabase.from("projets").select("id, nom").order("created_at", { ascending: false }),
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
  let existingVideo = null;
  if (commande.video_url) {
    const { data } = await supabase.storage
      .from("commandes-media")
      .createSignedUrl(commande.video_url, 3600);
    if (data) existingVideo = { path: commande.video_url, url: data.signedUrl };
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
        className="mb-4 inline-block text-sm text-white/60 hover:text-white"
      >
        ← Retour à la commande
      </Link>
      <h1 className="mb-4 text-xl font-bold text-white">
        Modifier la commande
      </h1>

      <EditCommandeForm
        commandeId={commande.id}
        initialClient={commande.clients}
        initialProjetId={commande.projet_id}
        initialProduitId={commande.produit_id}
        initialPoidsKg={commande.poids_kg}
        initialPrixParKg={commande.prix_par_kg}
        initialEnveloppe={commande.enveloppe}
        initialNombrePaquets={commande.nombre_paquets}
        initialAdresseLivraison={commande.adresse_livraison ?? ""}
        initialDescription={commande.description ?? ""}
        initialRemarqueInterne={commande.remarque_interne ?? ""}
        existingPhotos={existingPhotos}
        existingVideo={existingVideo}
        existingVoiceNote={existingVoiceNote}
        produits={produits ?? []}
        projets={projets ?? []}
      />
    </div>
  );
}
