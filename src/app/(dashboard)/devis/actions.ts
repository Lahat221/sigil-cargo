"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Resultat = { error: string } | { success: true };
type StatutDevis = "nouvelle" | "en_cours" | "traitee";

export async function changerStatutDevis(id: string, statut: StatutDevis): Promise<Resultat> {
  const { error } = await createClient().from("demandes_devis").update({ statut }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/devis");
  revalidatePath("/tableau-de-bord");
  return { success: true };
}

export async function supprimerDevis(id: string): Promise<Resultat> {
  const { error } = await createClient().from("demandes_devis").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/devis");
  revalidatePath("/tableau-de-bord");
  return { success: true };
}
