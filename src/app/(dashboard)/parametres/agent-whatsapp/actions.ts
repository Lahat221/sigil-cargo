"use server";

import { revalidatePath } from "next/cache";
import { getAdminCourant } from "@/lib/auth/profil";
import { createAdminClient } from "@/lib/supabase/admin";
import { genererReponse } from "@/lib/whatsapp-ia/agent";
import { CLES_IA } from "@/lib/whatsapp-ia/reglages";

type Resultat = { error: string } | { success: true };

export async function sauvegarderReglagesIA(valeurs: {
  actif: boolean;
  consignes: string;
}): Promise<Resultat> {
  if (!(await getAdminCourant())) return { error: "Action réservée aux administrateurs." };
  if (valeurs.consignes.length > 3000) {
    return { error: "Les consignes sont limitées à 3000 caractères." };
  }
  if (valeurs.actif && !process.env.ANTHROPIC_API_KEY) {
    return { error: "Clé Anthropic manquante : impossible d'activer l'agent." };
  }

  const { error } = await createAdminClient()
    .from("parametres")
    .upsert([
      { cle: CLES_IA.actif, valeur: valeurs.actif ? "1" : "0" },
      { cle: CLES_IA.consignes, valeur: valeurs.consignes.trim() },
    ]);
  if (error) return { error: error.message };

  revalidatePath("/parametres/agent-whatsapp");
  return { success: true };
}

/** Test à blanc : appelle vraiment Claude et les outils en lecture, n'écrit ni n'envoie rien. */
export async function testerAgentIA(
  message: string,
  telephoneTest: string,
  consignes: string
): Promise<{ error: string } | { reponse: string; outils: string[]; transfert: boolean }> {
  if (!(await getAdminCourant())) return { error: "Action réservée aux administrateurs." };
  if (!message.trim()) return { error: "Écrivez un message à tester." };
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Clé Anthropic manquante." };

  try {
    const r = await genererReponse({
      supabase: createAdminClient(),
      telephone: telephoneTest.trim(),
      clientNom: null,
      messageTest: message.trim().slice(0, 1000),
      consignes,
      simulation: true,
    });
    return { reponse: r.texte, outils: r.outils, transfert: r.transfert };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erreur inconnue." };
  }
}
