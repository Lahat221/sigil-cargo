"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function creerCampagne(
  nom: string,
  message: string,
  clientIds: string[]
): Promise<{ error: string } | { success: true; id: string }> {
  if (!nom.trim()) return { error: "Le nom de la campagne est requis." };
  if (!message.trim()) return { error: "Le message est requis." };
  if (clientIds.length === 0) {
    return { error: "Sélectionne au moins un client." };
  }

  const supabase = createClient();

  const { data: campagne, error: campagneError } = await supabase
    .from("campagnes_whatsapp")
    .insert({ nom: nom.trim(), message: message.trim() })
    .select("id")
    .single();

  if (campagneError || !campagne) {
    return {
      error: "Erreur lors de la création : " + campagneError?.message,
    };
  }

  const { error: destinatairesError } = await supabase
    .from("campagnes_whatsapp_destinataires")
    .insert(
      clientIds.map((clientId) => ({
        campagne_id: campagne.id,
        client_id: clientId,
      }))
    );

  if (destinatairesError) {
    return { error: "Erreur lors de l'ajout des destinataires : " + destinatairesError.message };
  }

  revalidatePath("/notifications-whatsapp");
  return { success: true, id: campagne.id };
}

export async function marquerEnvoye(
  destinataireId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("campagnes_whatsapp_destinataires")
    .update({ envoyee: true, envoyee_at: new Date().toISOString() })
    .eq("id", destinataireId);

  if (error) return { error: error.message };

  revalidatePath("/notifications-whatsapp");
  return { success: true };
}

export async function supprimerCampagne(
  campagneId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("campagnes_whatsapp")
    .delete()
    .eq("id", campagneId);

  if (error) return { error: error.message };

  revalidatePath("/notifications-whatsapp");
  return { success: true };
}
