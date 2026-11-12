import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { chargerParametresSite, listerPointsRetrait } from "@/lib/parametres";
import type { ContexteNotif } from "./notifications";

/**
 * Données communes aux notifications client (points de retrait par ville, site
 * pour le suivi, TikTok) — lues une fois par page, pas une fois par colis.
 */
export async function chargerContexteNotif(supabase: SupabaseClient<Database>): Promise<ContexteNotif> {
  const [site, { data: reseaux }] = await Promise.all([
    chargerParametresSite(supabase),
    supabase
      .from("publicites")
      .select("titre, lien")
      .eq("type", "reseau_social")
      .eq("actif", true)
      .order("ordre", { ascending: true }),
  ]);

  const tiktok = (reseaux ?? []).find((r) => r.lien && /tiktok/i.test(`${r.lien} ${r.titre}`));
  return {
    pointsRetrait: listerPointsRetrait(site.pointsRetrait),
    siteWeb: site.siteWeb,
    lienTiktok: tiktok?.lien ?? null,
  };
}
