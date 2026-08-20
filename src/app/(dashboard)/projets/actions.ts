"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProjetInput = {
  nom: string;
  dateDepart: string;
  dateArrivee: string;
  statut: "actif" | "clos" | "annule";
};

export async function creerProjet(
  input: ProjetInput
): Promise<{ error: string } | { success: true; id: string }> {
  if (!input.nom.trim()) return { error: "Le nom du projet est requis." };

  const supabase = createClient();
  const { data, error } = await supabase
    .from("projets")
    .insert({
      nom: input.nom.trim(),
      date_depart: input.dateDepart || null,
      date_arrivee: input.dateArrivee || null,
      statut: input.statut,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Erreur lors de la création : " + error?.message };
  }

  revalidatePath("/projets");
  return { success: true, id: data.id };
}

export async function modifierProjet(
  projetId: string,
  input: ProjetInput
): Promise<{ error: string } | { success: true }> {
  if (!input.nom.trim()) return { error: "Le nom du projet est requis." };

  const supabase = createClient();
  const { error } = await supabase
    .from("projets")
    .update({
      nom: input.nom.trim(),
      date_depart: input.dateDepart || null,
      date_arrivee: input.dateArrivee || null,
      statut: input.statut,
    })
    .eq("id", projetId);

  if (error) return { error: error.message };

  revalidatePath("/projets");
  revalidatePath(`/projets/${projetId}/modifier`);
  return { success: true };
}

export async function supprimerProjet(
  projetId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase.from("projets").delete().eq("id", projetId);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "Ce projet a des commandes associées — impossible de le supprimer.",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/projets");
  return { success: true };
}
