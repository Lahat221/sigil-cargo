"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type TypePublicite = Database["public"]["Tables"]["publicites"]["Row"]["type"];

type PubliciteInput = {
  type: TypePublicite;
  titre: string;
  lien: string;
  imagePath: string | null;
  actif: boolean;
  ordre: number;
};

function revalidateTout() {
  revalidatePath("/publicites");
  revalidatePath("/");
}

export async function createPublicite(
  input: PubliciteInput
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();

  const { error } = await supabase.from("publicites").insert({
    type: input.type,
    titre: input.titre.trim(),
    lien: input.lien.trim() || null,
    image_path: input.imagePath,
    actif: input.actif,
    ordre: input.ordre,
  });

  if (error) return { error: error.message };
  revalidateTout();
  return { success: true };
}

export async function updatePublicite(
  id: string,
  input: PubliciteInput
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("publicites")
    .update({
      type: input.type,
      titre: input.titre.trim(),
      lien: input.lien.trim() || null,
      image_path: input.imagePath,
      actif: input.actif,
      ordre: input.ordre,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateTout();
  return { success: true };
}

export async function toggleActifPublicite(
  id: string,
  actif: boolean
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("publicites")
    .update({ actif })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidateTout();
  return { success: true };
}

export async function supprimerPublicite(
  id: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();

  const { data } = await supabase
    .from("publicites")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  if (data?.image_path) {
    await supabase.storage.from("publicites-media").remove([data.image_path]);
  }

  const { error } = await supabase.from("publicites").delete().eq("id", id);

  if (error) return { error: error.message };
  revalidateTout();
  return { success: true };
}
