/**
 * Chemin de redirection sûr après connexion : uniquement un chemin interne du
 * site (« /commandes »). Tout le reste — URL absolue, « //hote », « \\ »,
 * « javascript: » — retombe sur la valeur par défaut, sinon le paramètre
 * `next` du lien de connexion permettrait de renvoyer un utilisateur connecté
 * vers un site pirate (redirection ouverte, utile au hameçonnage).
 */
export function cheminInterne(valeur: string | null | undefined, defaut: string): string {
  if (!valeur) return defaut;
  if (!valeur.startsWith("/") || valeur.startsWith("//")) return defaut;
  if (valeur.includes("\\") || /[\u0000-\u001f]/.test(valeur)) return defaut;
  return valeur;
}
