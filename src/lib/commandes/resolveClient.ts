import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

type NouveauClient = {
  nom: string;
  telephone: string;
  telephonePays: string;
  adresse: string;
};

export async function resolveClientId(
  supabase: SupabaseClient<Database>,
  clientId: string | null,
  nouveauClient: NouveauClient | null
): Promise<{ clientId: string } | { error: string }> {
  if (clientId) return { clientId };
  if (!nouveauClient) return { error: "Sélectionne ou crée un client." };

  const { nom, telephone, telephonePays, adresse } = nouveauClient;
  if (!nom.trim()) return { error: "Le nom du client est requis." };

  // Dernier filet anti-doublon avant création, au cas où un client
  // correspondant aurait été créé entre la recherche et la soumission.
  if (telephone.trim()) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("telephone", telephone.trim())
      .maybeSingle();
    if (existing) return { clientId: existing.id };
  }

  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      nom: nom.trim(),
      telephone: telephone.trim() || null,
      telephone_pays: telephonePays,
      adresse: adresse.trim() || null,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { error: "Impossible de créer le client : " + error?.message };
  }
  return { clientId: created.id };
}
