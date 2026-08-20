"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveClientId } from "@/lib/commandes/resolveClient";
import type { StatutCommande } from "@/types/database.types";

export async function changerStatut(
  commandeId: string,
  nouveauStatut: StatutCommande
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("commandes")
    .update({ statut: nouveauStatut })
    .eq("id", commandeId);

  if (error) return { error: error.message };

  revalidatePath("/commandes");
  revalidatePath("/commandes/pipeline");
  revalidatePath(`/commandes/${commandeId}`);
  return { success: true };
}

type UpdateCommandeInput = {
  clientId: string | null;
  nouveauClient: {
    nom: string;
    telephone: string;
    telephonePays: string;
    adresse: string;
  } | null;
  projetId: string;
  produitId: string;
  poidsKg: number;
  prixParKg: number;
  enveloppe: boolean;
  nombrePaquets: number;
  adresseLivraison: string;
  description: string;
  remarqueInterne: string;
  photoPaths: string[];
  videoPath: string | null;
};

export async function updateCommande(
  commandeId: string,
  input: UpdateCommandeInput
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();

  const clientResult = await resolveClientId(
    supabase,
    input.clientId,
    input.nouveauClient
  );
  if ("error" in clientResult) return { error: clientResult.error };

  const { error } = await supabase
    .from("commandes")
    .update({
      client_id: clientResult.clientId,
      projet_id: input.projetId,
      produit_id: input.produitId,
      poids_kg: input.poidsKg,
      prix_par_kg: input.prixParKg,
      enveloppe: input.enveloppe,
      nombre_paquets: input.nombrePaquets,
      adresse_livraison: input.adresseLivraison.trim() || null,
      description: input.description.trim() || null,
      remarque_interne: input.remarqueInterne.trim() || null,
      photo_urls: input.photoPaths.length > 0 ? input.photoPaths : null,
      video_url: input.videoPath,
    })
    .eq("id", commandeId);

  if (error) return { error: error.message };

  revalidatePath("/commandes");
  revalidatePath("/commandes/pipeline");
  revalidatePath(`/commandes/${commandeId}`);
  return { success: true };
}

export async function queuerNotification(
  commandeId: string,
  statutCommande: StatutCommande
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();

  const { data: commande, error: commandeError } = await supabase
    .from("commandes")
    .select("client_id, clients(telephone, telephone_pays)")
    .eq("id", commandeId)
    .single();

  if (commandeError || !commande) {
    return { error: "Commande introuvable." };
  }

  const client = commande.clients as unknown as {
    telephone: string | null;
    telephone_pays: string | null;
  } | null;

  let destinataire: string | null = null;
  if (client?.telephone) {
    const chiffres = client.telephone.replace(/\D/g, "");
    const indicatif = (client.telephone_pays ?? "+33").replace(/\D/g, "");
    destinataire = chiffres.startsWith(indicatif)
      ? chiffres
      : indicatif + chiffres;
  }

  const { error } = await supabase.from("notifications_a_envoyer").insert({
    commande_id: commandeId,
    statut_commande: statutCommande,
    destinataire_telephone: destinataire,
    envoyee: true,
    envoyee_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };

  return { success: true };
}

export async function recalculerPrix(): Promise<
  { error: string } | { success: true; nbMisAJour: number }
> {
  const supabase = createClient();

  const { data: commandes, error: fetchError } = await supabase
    .from("commandes")
    .select("id, produit_id, prix_par_kg")
    .not("statut", "in", "(livree,annulee)");

  if (fetchError) return { error: fetchError.message };
  if (!commandes || commandes.length === 0) {
    return { success: true, nbMisAJour: 0 };
  }

  const { data: produits, error: produitsError } = await supabase
    .from("produits")
    .select("id, prix_par_kg");

  if (produitsError) return { error: produitsError.message };

  const prixParProduit = new Map(
    (produits ?? []).map((p) => [p.id, p.prix_par_kg])
  );

  let nbMisAJour = 0;
  for (const c of commandes) {
    const prixActuel = prixParProduit.get(c.produit_id);
    if (prixActuel === undefined || prixActuel === c.prix_par_kg) continue;

    const { error } = await supabase
      .from("commandes")
      .update({ prix_par_kg: prixActuel })
      .eq("id", c.id);
    if (error) return { error: error.message };
    nbMisAJour += 1;
  }

  revalidatePath("/commandes");
  revalidatePath("/commandes/pipeline");
  revalidatePath("/tableau-de-bord");
  return { success: true, nbMisAJour };
}

export async function supprimerCommande(
  commandeId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("commandes")
    .delete()
    .eq("id", commandeId);

  if (error) return { error: error.message };

  revalidatePath("/commandes");
  revalidatePath("/commandes/pipeline");
  return { success: true };
}
