"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { preparerPaiement, type PaiementInput } from "@/lib/paiements";

type Resultat = { error: string } | { success: true };

export async function ajouterPaiement(
  commandeId: string,
  input: PaiementInput
): Promise<Resultat> {
  const prepare = preparerPaiement(input);
  if ("error" in prepare) return prepare;

  const supabase = createClient();
  const { error } = await supabase
    .from("paiements")
    .insert({ commande_id: commandeId, ...prepare });
  if (error) return { error: "Enregistrement impossible : " + error.message };

  revalidatePath(`/commandes/${commandeId}`);
  revalidatePath(`/commandes/${commandeId}/accuse-reception`);
  revalidatePath("/commandes");
  revalidatePath("/tableau-de-bord");
  return { success: true };
}

export async function supprimerPaiement(
  paiementId: string,
  commandeId: string
): Promise<Resultat> {
  const supabase = createClient();
  const { error } = await supabase.from("paiements").delete().eq("id", paiementId);
  if (error) return { error: error.message };

  revalidatePath(`/commandes/${commandeId}`);
  revalidatePath(`/commandes/${commandeId}/accuse-reception`);
  revalidatePath("/commandes");
  revalidatePath("/tableau-de-bord");
  return { success: true };
}
