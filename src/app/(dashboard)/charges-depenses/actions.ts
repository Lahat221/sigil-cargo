"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ChargeInput = {
  libelle: string;
  montant: number;
  categorie: string;
  dateCharge: string;
  remarque: string;
  factureUrl: string | null;
};

export async function creerCharge(
  input: ChargeInput
): Promise<{ error: string } | { success: true; id: string }> {
  if (!input.libelle.trim()) return { error: "Le libellé est requis." };
  if (Number.isNaN(input.montant) || input.montant < 0) {
    return { error: "Indique un montant valide." };
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("charges")
    .insert({
      libelle: input.libelle.trim(),
      montant: input.montant,
      categorie: input.categorie.trim() || null,
      date_charge: input.dateCharge,
      remarque: input.remarque.trim() || null,
      facture_url: input.factureUrl,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Erreur lors de la création : " + error?.message };
  }

  revalidatePath("/charges-depenses");
  return { success: true, id: data.id };
}

export async function modifierCharge(
  chargeId: string,
  input: ChargeInput
): Promise<{ error: string } | { success: true }> {
  if (!input.libelle.trim()) return { error: "Le libellé est requis." };
  if (Number.isNaN(input.montant) || input.montant < 0) {
    return { error: "Indique un montant valide." };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from("charges")
    .update({
      libelle: input.libelle.trim(),
      montant: input.montant,
      categorie: input.categorie.trim() || null,
      date_charge: input.dateCharge,
      remarque: input.remarque.trim() || null,
      facture_url: input.factureUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", chargeId);

  if (error) return { error: error.message };

  revalidatePath("/charges-depenses");
  revalidatePath(`/charges-depenses/${chargeId}/modifier`);
  return { success: true };
}

export async function supprimerCharge(
  chargeId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase.from("charges").delete().eq("id", chargeId);

  if (error) return { error: error.message };

  revalidatePath("/charges-depenses");
  return { success: true };
}
