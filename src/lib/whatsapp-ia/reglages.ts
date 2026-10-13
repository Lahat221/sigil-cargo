import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { chiffres } from "./telephone";

export const CLES_IA = {
  actif: "ia_whatsapp_actif",
  consignes: "ia_whatsapp_consignes",
} as const;

export type ReglagesIA = { actif: boolean; consignes: string };

type Admin = SupabaseClient<Database>;

// Durées de silence de l'IA : courtes, pour qu'elle reprenne vite la main si
// l'humain n'est plus là. Réactivable à tout moment depuis le Chat.
export const PAUSE_TRANSFERT_H = 4;
export const PAUSE_HUMAIN_H = 2;

export async function chargerReglagesIA(supabase: Admin): Promise<ReglagesIA> {
  const { data } = await supabase
    .from("parametres")
    .select("cle, valeur")
    .in("cle", Object.values(CLES_IA));
  const v = new Map((data ?? []).map((p) => [p.cle, p.valeur ?? ""]));
  return {
    // Désactivé par défaut : l'équipe l'active explicitement dans Paramètres.
    actif: v.get(CLES_IA.actif) === "1",
    consignes: v.get(CLES_IA.consignes) ?? "",
  };
}

// --- Pause par conversation (un humain reprend la main) ---------------------

export async function iaEnPause(supabase: Admin, telephone: string): Promise<boolean> {
  const { data } = await supabase
    .from("whatsapp_ia_pause")
    .select("pause_jusqu_a")
    .eq("telephone", chiffres(telephone))
    .maybeSingle();
  return !!data && new Date(data.pause_jusqu_a).getTime() > Date.now();
}

export async function pauseActive(
  supabase: Admin,
  telephone: string
): Promise<{ jusqua: string; motif: string | null } | null> {
  const { data } = await supabase
    .from("whatsapp_ia_pause")
    .select("pause_jusqu_a, motif")
    .eq("telephone", chiffres(telephone))
    .maybeSingle();
  if (!data || new Date(data.pause_jusqu_a).getTime() <= Date.now()) return null;
  return { jusqua: data.pause_jusqu_a, motif: data.motif };
}

export async function leverPause(supabase: Admin, telephone: string): Promise<void> {
  await supabase.from("whatsapp_ia_pause").delete().eq("telephone", chiffres(telephone));
}

export async function mettreEnPause(
  supabase: Admin,
  telephone: string,
  heures: number,
  motif: string
): Promise<void> {
  await supabase.from("whatsapp_ia_pause").upsert({
    telephone: chiffres(telephone),
    pause_jusqu_a: new Date(Date.now() + heures * 3600 * 1000).toISOString(),
    motif,
    updated_at: new Date().toISOString(),
  });
}
