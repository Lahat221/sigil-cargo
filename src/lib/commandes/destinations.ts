import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

// Destination configurable depuis Paramètres → Tarifs (table destinations).
export type Destination = {
  nom: string;
  tarif_par_kg: number | null;
};

export async function chargerDestinations(
  supabase: SupabaseClient<Database>,
  { inclureInactives = false }: { inclureInactives?: boolean } = {}
): Promise<Destination[]> {
  let query = supabase
    .from("destinations")
    .select("nom, tarif_par_kg")
    .order("ordre", { ascending: true })
    .order("nom", { ascending: true });
  if (!inclureInactives) query = query.eq("actif", true);

  const { data } = await query;
  return data ?? [];
}
