"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type EntreeInput = {
  nomLocal: string;
  typeProduit: string;
  descriptionDouane: string;
  hsCode: string;
  synonymes: string;
};

function parseSynonymes(brut: string): string[] {
  return brut
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function normaliserNom(nom: string): string {
  return nom.trim().toLowerCase();
}

export async function creerEntreeReferentiel(
  input: EntreeInput
): Promise<{ error: string } | { success: true }> {
  if (!input.nomLocal.trim() || !input.typeProduit.trim() || !input.descriptionDouane.trim()) {
    return { error: "Nom, type de produit et description douane sont requis." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("douane_produits_referentiel").insert({
    nom_local: input.nomLocal.trim(),
    nom_normalise: normaliserNom(input.nomLocal),
    type_produit: input.typeProduit.trim(),
    description_douane: input.descriptionDouane.trim(),
    hs_code: input.hsCode.trim() || null,
    synonymes: parseSynonymes(input.synonymes),
  });

  if (error) return { error: error.message };
  revalidatePath("/gestion-douaniere/referentiel");
  return { success: true };
}

export async function mettreAJourEntreeReferentiel(
  id: string,
  input: EntreeInput
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("douane_produits_referentiel")
    .update({
      nom_local: input.nomLocal.trim(),
      nom_normalise: normaliserNom(input.nomLocal),
      type_produit: input.typeProduit.trim(),
      description_douane: input.descriptionDouane.trim(),
      hs_code: input.hsCode.trim() || null,
      synonymes: parseSynonymes(input.synonymes),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/gestion-douaniere/referentiel");
  return { success: true };
}

export async function toggleActifReferentiel(
  id: string,
  actif: boolean
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("douane_produits_referentiel")
    .update({ actif })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/gestion-douaniere/referentiel");
  return { success: true };
}
