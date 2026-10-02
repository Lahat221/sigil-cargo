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

export async function getAdminCourant(): Promise<ProfilCourant | null> {
  const profil = await getProfilCourant();
  return profil && profil.role === "admin" ? profil : null;
}
