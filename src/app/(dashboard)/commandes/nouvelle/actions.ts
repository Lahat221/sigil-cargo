"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveClientId } from "@/lib/commandes/resolveClient";

export type ClientMatch = {
  id: string;
  nom: string;
  telephone: string | null;
  adresse: string | null;
};

export async function searchClients(query: string): Promise<ClientMatch[]> {
  const q = query.trim();
  if (!q) return [];

  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, nom, telephone, adresse")
    .or(`nom.ilike.%${q}%,telephone.ilike.%${q}%`)
    .limit(5);

  return data ?? [];
}

type CreateCommandeInput = {
  commandeId: string;
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

export async function createCommande(
  input: CreateCommandeInput
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();

  const clientResult = await resolveClientId(
    supabase,
    input.clientId,
    input.nouveauClient
  );
  if ("error" in clientResult) return { error: clientResult.error };
  const { clientId } = clientResult;

  const { count: produitCount } = await supabase
    .from("produits")
    .select("id", { count: "exact", head: true })
    .eq("id", input.produitId);
  if (!produitCount) {
    return { error: "Produit introuvable." };
  }

  const codeBarreColis = `SIGIL-${input.commandeId.split("-")[0].toUpperCase()}`;

  const { error: insertError } = await supabase.from("commandes").insert({
    id: input.commandeId,
    client_id: clientId,
    projet_id: input.projetId,
    produit_id: input.produitId,
    poids_kg: input.poidsKg,
    prix_par_kg: input.prixParKg,
    enveloppe: input.enveloppe,
    nombre_paquets: input.nombrePaquets,
    adresse_livraison: input.adresseLivraison.trim() || null,
    description: input.description.trim() || null,
    remarque_interne: input.remarqueInterne.trim() || null,
    code_barre_colis: codeBarreColis,
    photo_urls: input.photoPaths.length > 0 ? input.photoPaths : null,
    video_url: input.videoPath,
  });

  if (insertError) {
    return { error: "Erreur lors de la création : " + insertError.message };
  }

  revalidatePath("/commandes");
  return { success: true };
}
