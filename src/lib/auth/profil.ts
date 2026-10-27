import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type ProfilCourant = {
  id: string;
  email: string;
  nom: string | null;
  role: Database["public"]["Tables"]["profiles"]["Row"]["role"];
  modules: string[];
};

// Utilisateur connecté + son profil (null si non connecté). Sert à protéger
// côté serveur les sections réservées aux admins — ne jamais se fier au
// seul masquage d'un onglet dans l'interface.
export async function getProfilCourant(): Promise<ProfilCourant | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nom, role, modules_autorises")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    nom: profile?.nom ?? null,
    role: profile?.role ?? "agent",
    modules: profile?.modules_autorises ?? [],
  };
}

/**
 * Utilisateur connecté AUTORISÉ sur au moins un des modules donnés (un admin
 * l'est toujours). Sans module : il suffit d'être connecté. À appeler en tête
 * de toute action serveur : une action est un point d'entrée HTTP public, le
 * masquage des pages par le middleware ne la protège pas.
 */
export async function getUtilisateurAutorise(...modules: string[]): Promise<ProfilCourant | null> {
  const profil = await getProfilCourant();
  if (!profil) return null;
  if (profil.role === "admin" || modules.length === 0) return profil;
  return modules.some((m) => profil.modules.includes(m)) ? profil : null;
}

export async function getAdminCourant(): Promise<ProfilCourant | null> {
  const profil = await getProfilCourant();
  return profil && profil.role === "admin" ? profil : null;
}
