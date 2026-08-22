"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTwilioClient, whatsappAddress } from "@/lib/twilio/client";

function formatNumeroE164(
  telephone: string,
  telephonePays: string | null
): string {
  const chiffres = telephone.replace(/\D/g, "");
  const indicatif = (telephonePays ?? "+33").replace(/\D/g, "");
  const digits = chiffres.startsWith(indicatif) ? chiffres : indicatif + chiffres;
  return `+${digits}`;
}

export async function creerCampagne(
  nom: string,
  message: string,
  clientIds: string[],
  imageUrl: string | null,
  contentSid: string | null
): Promise<{ error: string } | { success: true; id: string }> {
  if (!nom.trim()) return { error: "Le nom de la campagne est requis." };
  if (!message.trim()) return { error: "Le message est requis." };
  if (clientIds.length === 0) {
    return { error: "Sélectionne au moins un client." };
  }

  const supabase = createClient();

  const { data: campagne, error: campagneError } = await supabase
    .from("campagnes_whatsapp")
    .insert({
      nom: nom.trim(),
      message: message.trim(),
      image_url: imageUrl,
      content_sid: contentSid?.trim() || null,
    })
    .select("id")
    .single();

  if (campagneError || !campagne) {
    return {
      error: "Erreur lors de la création : " + campagneError?.message,
    };
  }

  const { error: destinatairesError } = await supabase
    .from("campagnes_whatsapp_destinataires")
    .insert(
      clientIds.map((clientId) => ({
        campagne_id: campagne.id,
        client_id: clientId,
      }))
    );

  if (destinatairesError) {
    return { error: "Erreur lors de l'ajout des destinataires : " + destinatairesError.message };
  }

  revalidatePath("/notifications-whatsapp");
  return { success: true, id: campagne.id };
}

export async function envoyerMessageWhatsApp(
  destinataireId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();

  const { data: destinataire, error: fetchError } = await supabase
    .from("campagnes_whatsapp_destinataires")
    .select(
      "id, clients(nom, telephone, telephone_pays), campagnes_whatsapp(message, content_sid, image_url)"
    )
    .eq("id", destinataireId)
    .single();

  if (fetchError || !destinataire) {
    return { error: "Destinataire introuvable." };
  }

  const client = destinataire.clients as unknown as {
    nom: string;
    telephone: string | null;
    telephone_pays: string | null;
  } | null;
  const campagne = destinataire.campagnes_whatsapp as unknown as {
    message: string;
    content_sid: string | null;
    image_url: string | null;
  } | null;

  if (!client?.telephone) {
    return { error: "Ce client n'a pas de numéro de téléphone." };
  }
  if (!campagne) {
    return { error: "Campagne introuvable." };
  }

  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    return {
      error:
        "TWILIO_WHATSAPP_FROM n'est pas configuré (numéro WhatsApp Twilio manquant).",
    };
  }

  const numero = formatNumeroE164(client.telephone, client.telephone_pays);

  let mediaUrl: string | undefined;
  if (campagne.image_url) {
    const { data: signed } = await supabase.storage
      .from("campagnes-media")
      .createSignedUrl(campagne.image_url, 3600);
    mediaUrl = signed?.signedUrl;
  }

  try {
    const twilioClient = getTwilioClient();

    if (campagne.content_sid) {
      await twilioClient.messages.create({
        from: whatsappAddress(from),
        to: whatsappAddress(numero),
        contentSid: campagne.content_sid,
        contentVariables: JSON.stringify({
          "1": campagne.message.replace(/\{nom\}/gi, client.nom),
        }),
      });
    } else {
      await twilioClient.messages.create({
        from: whatsappAddress(from),
        to: whatsappAddress(numero),
        body: campagne.message.replace(/\{nom\}/gi, client.nom),
        ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
      });
    }

    await supabase
      .from("campagnes_whatsapp_destinataires")
      .update({
        envoyee: true,
        envoyee_at: new Date().toISOString(),
        erreur: null,
      })
      .eq("id", destinataireId);

    revalidatePath("/notifications-whatsapp");
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    await supabase
      .from("campagnes_whatsapp_destinataires")
      .update({ erreur: message })
      .eq("id", destinataireId);
    revalidatePath("/notifications-whatsapp");
    return { error: message };
  }
}

export async function envoyerReponseWhatsApp(
  telephone: string,
  clientId: string | null,
  body: string,
  mediaPath?: string | null,
  mediaType?: string | null
): Promise<{ error: string } | { success: true }> {
  const texte = body.trim();
  if (!texte && !mediaPath) {
    return { error: "Le message est vide." };
  }

  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    return {
      error:
        "TWILIO_WHATSAPP_FROM n'est pas configuré (numéro WhatsApp Twilio manquant).",
    };
  }

  const supabase = createClient();

  let mediaUrl: string | undefined;
  if (mediaPath) {
    const { data: signed } = await supabase.storage
      .from("campagnes-media")
      .createSignedUrl(mediaPath, 3600);
    mediaUrl = signed?.signedUrl;
  }

  try {
    const twilioClient = getTwilioClient();
    const message = await twilioClient.messages.create({
      from: whatsappAddress(from),
      to: whatsappAddress(telephone),
      ...(texte ? { body: texte } : {}),
      ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
    });

    await supabase.from("whatsapp_messages").insert({
      client_id: clientId,
      telephone,
      direction: "out",
      body: texte || null,
      message_sid: message.sid,
      media_url: mediaPath || null,
      media_type: mediaType || null,
    });

    revalidatePath(
      `/notifications-whatsapp/conversations/${encodeURIComponent(telephone)}`
    );
    revalidatePath("/notifications-whatsapp");
    return { success: true };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Erreur inconnue.",
    };
  }
}

export async function marquerEnvoye(
  destinataireId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("campagnes_whatsapp_destinataires")
    .update({ envoyee: true, envoyee_at: new Date().toISOString() })
    .eq("id", destinataireId);

  if (error) return { error: error.message };

  revalidatePath("/notifications-whatsapp");
  return { success: true };
}

export async function supprimerCampagne(
  campagneId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("campagnes_whatsapp")
    .delete()
    .eq("id", campagneId);

  if (error) return { error: error.message };

  revalidatePath("/notifications-whatsapp");
  return { success: true };
}
