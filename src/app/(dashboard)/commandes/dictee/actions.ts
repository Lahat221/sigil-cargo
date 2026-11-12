"use server";

import { getUtilisateurAutorise } from "@/lib/auth/profil";
import { messageErreurIA } from "@/lib/ia/fournisseur";
import { DICTEE_TAILLE_MAX_OCTETS, transcrireDictee } from "@/lib/commandes/dictee";

/**
 * Transforme une description de colis dictée (enregistrement du navigateur) en
 * texte pour le champ « Description ». Réservée aux agents autorisés sur les
 * colis : l'action appelle une IA payante, elle ne doit pas être ouverte à tous.
 */
export async function transcrireDescription(
  formData: FormData
): Promise<{ error: string } | { texte: string }> {
  if (!(await getUtilisateurAutorise("commandes"))) return { error: "Action non autorisée." };

  const audio = formData.get("audio");
  if (!(audio instanceof File) || audio.size === 0) return { error: "Aucun son reçu. Réessaie." };
  if (audio.size > DICTEE_TAILLE_MAX_OCTETS) {
    return { error: "L'enregistrement est trop long. Dicte en moins de 2 minutes." };
  }

  try {
    const texte = await transcrireDictee(audio);
    if (!texte) return { error: "Je n'ai rien compris. Parle plus près du micro et réessaie." };
    return { texte };
  } catch (err) {
    return { error: `Transcription impossible : ${messageErreurIA(err)}` };
  }
}
