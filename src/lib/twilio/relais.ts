import { getTwilioClient, whatsappAddress } from "./client";

// Modèle "sigil_cargo_notification" approuvé par Meta (Twilio Content Template
// Builder) — sert de repli pour joindre le propriétaire hors fenêtre de 24h.
export const RELAY_TEMPLATE_SID = "HX2395b8157b45fff54b34fc1454d93d4c";

/** Envoie un texte au propriétaire (alertes, copies des réponses de l'agent IA). */
export async function envoyerAuProprietaire(texte: string): Promise<void> {
  const proprietaire = process.env.OWNER_WHATSAPP_NUMBER;
  const twilioNumber = process.env.TWILIO_WHATSAPP_FROM;
  if (!proprietaire || !twilioNumber) return;

  const client = getTwilioClient();
  const from = whatsappAddress(twilioNumber);
  const to = whatsappAddress(proprietaire);
  try {
    await client.messages.create({ from, to, body: texte });
  } catch {
    try {
      await client.messages.create({
        from,
        to,
        contentSid: RELAY_TEMPLATE_SID,
        contentVariables: JSON.stringify({ "1": texte }),
      });
    } catch {
      // Dernier recours impossible : l'échange reste visible dans l'appli.
    }
  }
}
