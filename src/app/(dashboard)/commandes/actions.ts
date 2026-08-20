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
