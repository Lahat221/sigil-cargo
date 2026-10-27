import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { TARIF_ALIMENTAIRE_ACTIF } from "./tarifAlimentaire";

// Destination configurable depuis Paramètres → Tarifs (table destinations).
export type Destination = {
  nom: string;
  /** Tarif « autres produits » (€/kg). */
  tarif_par_kg: number | null;
  /** Tarif spécial produits alimentaires (€/kg) ; null : pas de tarif spécial. */
  tarif_alimentaire_par_kg: number | null;
};

export async function chargerDestinations(
  supabase: SupabaseClient<Database>,
  { inclureInactives = false }: { inclureInactives?: boolean } = {}
): Promise<Destination[]> {
  let query = supabase
    .from("destinations")
    .select(TARIF_ALIMENTAIRE_ACTIF ? "nom, tarif_par_kg, tarif_alimentaire_par_kg" : "nom, tarif_par_kg")
    .order("ordre", { ascending: true })
    .order("nom", { ascending: true });
  if (!inclureInactives) query = query.eq("actif", true);

  const { data } = await query;
  const lignes = (data ?? []) as unknown as {
    nom: string;
    tarif_par_kg: number | null;
    tarif_alimentaire_par_kg?: number | null;
  }[];
  return lignes.map((d) => ({
    nom: d.nom,
    tarif_par_kg: d.tarif_par_kg,
    tarif_alimentaire_par_kg: d.tarif_alimentaire_par_kg ?? null,
  }));
}
