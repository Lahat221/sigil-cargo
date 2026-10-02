"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminCourant, getProfilCourant } from "@/lib/auth/profil";
import { CLES_SITE, type ParametresSite } from "@/lib/parametres";
import type { RoleUtilisateur } from "@/types/database.types";

type Resultat = { error: string } | { success: true };

const NON_ADMIN: Resultat = { error: "Action réservée aux administrateurs." };

// Les écritures sensibles (comptes, tarifs, réglages) passent par le client
// service-role APRÈS vérification du rôle admin côté serveur — les tables
// concernées n'exposent volontairement aucune policy d'écriture à l'API.

export async function mettreAJourNom(nom: string): Promise<Resultat> {
  const profil = await getProfilCourant();
  if (!profil) return { error: "Non connecté." };
  if (!nom.trim()) return { error: "Le nom ne peut pas être vide." };

  const { error } = await createAdminClient()
    .from("profiles")
    .update({ nom: nom.trim() })
    .eq("id", profil.id);
  if (error) return { error: error.message };

  revalidatePath("/parametres");
  return { success: true };
}

export async function changerMotDePasse(nouveau: string): Promise<Resultat> {
  if (nouveau.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }
  const { error } = await createClient().auth.updateUser({ password: nouveau });
  if (error) return { error: error.message };
  return { success: true };
}

type UtilisateurInput = {
  nom: string;
  role: RoleUtilisateur;
  modules: string[];
};

export async function creerUtilisateur(
  input: UtilisateurInput & { email: string; motDePasse: string }
): Promise<Resultat> {
  if (!(await getAdminCourant())) return NON_ADMIN;

  const email = input.email.trim().toLowerCase();
  if (!input.nom.trim()) return { error: "Le nom est requis." };
  if (!email.includes("@")) return { error: "Email invalide." };
  if (input.motDePasse.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: input.motDePasse,
    email_confirm: true,
  });
  if (error || !data.user) {
    return { error: error?.message ?? "Création du compte impossible." };
  }

  const { error: profilError } = await admin.from("profiles").upsert({
    id: data.user.id,
    nom: input.nom.trim(),
    email,
    role: input.role,
    modules_autorises: input.role === "admin" ? [] : input.modules,
  });
  if (profilError) {
    // Évite un compte de connexion orphelin sans profil ni droits.
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: profilError.message };
  }

  revalidatePath("/parametres/utilisateurs");
  return { success: true };
}

export async function mettreAJourAcces(
  id: string,
  input: UtilisateurInput & { nouveauMotDePasse: string }
): Promise<Resultat> {
  const adminCourant = await getAdminCourant();
  if (!adminCourant) return NON_ADMIN;
  if (!input.nom.trim()) return { error: "Le nom est requis." };
  if (id === adminCourant.id && input.role !== "admin") {
    return { error: "Vous ne pouvez pas retirer votre propre rôle administrateur." };
  }
  if (input.nouveauMotDePasse && input.nouveauMotDePasse.length < 8) {
    return { error: "Le mot de passe doit contenir au moins 8 caractères." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      nom: input.nom.trim(),
      role: input.role,
      modules_autorises: input.role === "admin" ? [] : input.modules,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  if (input.nouveauMotDePasse) {
    const { error: mdpError } = await admin.auth.admin.updateUserById(id, {
      password: input.nouveauMotDePasse,
    });
    if (mdpError) return { error: mdpError.message };
  }

  revalidatePath("/parametres/utilisateurs");
  return { success: true };
}

export async function sauvegarderProduit(input: {
  id?: string;
  nom: string;
  prix: number;
  actif: boolean;
}): Promise<Resultat> {
  if (!(await getAdminCourant())) return NON_ADMIN;
  if (!input.nom.trim()) return { error: "Le nom du produit est requis." };
  if (Number.isNaN(input.prix) || input.prix < 0) {
    return { error: "Prix par kg invalide." };
  }

  const admin = createAdminClient();
  const valeurs = {
    nom: input.nom.trim(),
    prix_par_kg: input.prix,
    actif: input.actif,
  };
  const { error } = input.id
    ? await admin.from("produits").update(valeurs).eq("id", input.id)
    : await admin.from("produits").insert(valeurs);
  if (error) return { error: error.message };

  revalidatePath("/parametres/tarifs");
  return { success: true };
}

export async function sauvegarderDestination(input: {
  id?: string;
  nom: string;
  tarif: number | null;
  ordre: number;
  actif: boolean;
}): Promise<Resultat> {
  if (!(await getAdminCourant())) return NON_ADMIN;
  if (!input.nom.trim()) return { error: "Le nom de la destination est requis." };
  if (input.tarif !== null && (Number.isNaN(input.tarif) || input.tarif < 0)) {
    return { error: "Tarif par kg invalide." };
  }

  const admin = createAdminClient();
  const valeurs = {
    nom: input.nom.trim(),
    tarif_par_kg: input.tarif,
    ordre: input.ordre,
    actif: input.actif,
  };
  const { error } = input.id
    ? await admin.from("destinations").update(valeurs).eq("id", input.id)
    : await admin.from("destinations").insert(valeurs);
  if (error) {
    return {
      error: error.message.includes("duplicate")
        ? "Cette destination existe déjà."
        : error.message,
    };
  }

  revalidatePath("/parametres/tarifs");
  return { success: true };
}

// Les colis déjà enregistrés gardent leur destination (simple texte) : la
// suppression retire seulement l'option des formulaires et des filtres.
export async function supprimerDestination(id: string): Promise<Resultat> {
  if (!(await getAdminCourant())) return NON_ADMIN;
  const { error } = await createAdminClient()
    .from("destinations")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/parametres/tarifs");
  return { success: true };
}

export async function sauvegarderParametresSite(
  valeurs: ParametresSite
): Promise<Resultat> {
  if (!(await getAdminCourant())) return NON_ADMIN;

  const { error } = await createAdminClient()
    .from("parametres")
    .upsert([
      { cle: CLES_SITE.whatsapp, valeur: valeurs.whatsapp.trim() },
      { cle: CLES_SITE.adresse, valeur: valeurs.adresse.trim() },
      { cle: CLES_SITE.horaires, valeur: valeurs.horaires.trim() },
      { cle: CLES_SITE.email, valeur: valeurs.email.trim() },
      { cle: CLES_SITE.siteWeb, valeur: valeurs.siteWeb.trim() },
    ]);
  if (error) return { error: error.message };

  revalidatePath("/parametres/site");
  revalidatePath("/");
  return { success: true };
}
