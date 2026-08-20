"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ClientInput = {
  nom: string;
  telephone: string;
  telephonePays: string;
  adresse: string;
};

export async function creerClient(
  input: ClientInput
): Promise<{ error: string } | { success: true; id: string }> {
  if (!input.nom.trim()) return { error: "Le nom est requis." };
  if (!input.telephone.trim()) return { error: "Le téléphone est requis." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      nom: input.nom.trim(),
      telephone: input.telephone.trim(),
      telephone_pays: input.telephonePays,
      adresse: input.adresse.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Erreur lors de la création : " + error?.message };
  }

  revalidatePath("/clients");
  return { success: true, id: data.id };
}

export async function modifierClient(
  clientId: string,
  input: ClientInput
): Promise<{ error: string } | { success: true }> {
  if (!input.nom.trim()) return { error: "Le nom est requis." };
  if (!input.telephone.trim()) return { error: "Le téléphone est requis." };

  const supabase = createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      nom: input.nom.trim(),
      telephone: input.telephone.trim(),
      telephone_pays: input.telephonePays,
      adresse: input.adresse.trim() || null,
    })
    .eq("id", clientId);

  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${clientId}/modifier`);
  return { success: true };
}

export async function supprimerClient(
  clientId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "Ce client a des commandes associées — impossible de le supprimer.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/clients");
  return { success: true };
}
