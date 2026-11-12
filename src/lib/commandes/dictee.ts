import { getOpenAIClient } from "@/lib/douane/openai";
import { termesWolofPourTranscription } from "@/lib/douane/glossaire";

/** Au-delà, on refuse : une description dictée dure quelques dizaines de secondes. */
export const DICTEE_TAILLE_MAX_OCTETS = 3.5 * 1024 * 1024;

export function modeleTranscription(): string {
  return process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || "gpt-4o-transcribe";
}

/**
 * Transcrit une description de colis dictée à voix haute (français, avec des mots
 * wolof : thiakry, bissap, boubou…). On donne au modèle la liste des produits
 * courants pour qu'il les écrive correctement au lieu de les deviner phonétiquement.
 * Renvoie le texte brut, sans mise en forme.
 */
export async function transcrireDictee(audio: File): Promise<string> {
  const client = getOpenAIClient();
  const reponse = await client.audio.transcriptions.create({
    file: audio,
    model: modeleTranscription(),
    language: "fr",
    prompt: `Description d'un colis envoyé du Sénégal vers la France : produits, quantités, emballages. Mots fréquents : ${termesWolofPourTranscription()}.`,
  });
  return reponse.text.trim();
}
