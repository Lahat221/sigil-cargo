import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTwilioClient, whatsappAddress } from "@/lib/twilio/client";

// Modèle "sigil_cargo_notification" approuvé par Meta (Twilio Content Template
// Builder) — sert de repli pour joindre le propriétaire hors fenêtre de 24h.
const RELAY_TEMPLATE_SID = "HX2395b8157b45fff54b34fc1454d93d4c";

type AdminClient = ReturnType<typeof createAdminClient>;

function normalizeDigits(phone: string) {
  return phone.replace(/\D/g, "");
}

async function downloadIncomingMedia(
  params: Record<string, string>,
  accountSid: string | undefined,
  authToken: string,
  supabase: AdminClient
): Promise<{ mediaPath: string | null; mediaType: string | null }> {
  const numMedia = parseInt(params.NumMedia ?? "0", 10);
  const mediaUrl = params.MediaUrl0;
  if (numMedia <= 0 || !mediaUrl || !accountSid) {
    return { mediaPath: null, mediaType: null };
  }
  try {
    const contentType = params.MediaContentType0 || "application/octet-stream";
    const mediaRes = await fetch(mediaUrl, {
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      },
    });
    if (!mediaRes.ok) return { mediaPath: null, mediaType: null };
    const buffer = Buffer.from(await mediaRes.arrayBuffer());
    const ext = contentType.split("/")[1]?.split(";")[0] ?? "bin";
    const path = `incoming/${randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("campagnes-media")
      .upload(path, buffer, { contentType });
    if (uploadError) return { mediaPath: null, mediaType: null };
    return { mediaPath: path, mediaType: contentType };
  } catch {
    return { mediaPath: null, mediaType: null };
  }
}

async function trouverClient(telephone: string, supabase: AdminClient) {
  const digits = normalizeDigits(telephone);
  const { data: clients } = await supabase
    .from("clients")
    .select("id, nom, telephone");
  return (
    clients?.find((c) => {
      if (!c.telephone) return false;
      const cDigits = normalizeDigits(c.telephone);
      return (
        cDigits === digits || digits.endsWith(cDigits) || cDigits.endsWith(digits)
      );
    }) ?? null
  );
}

async function signedMediaUrl(mediaPath: string | null, supabase: AdminClient) {
  if (!mediaPath) return undefined;
  const { data } = await supabase.storage
    .from("campagnes-media")
    .createSignedUrl(mediaPath, 3600);
  return data?.signedUrl;
}

// Envoie une copie du message client au propriétaire, pour qu'il puisse
// suivre la conversation depuis son propre WhatsApp.
async function envoyerVersOwner(
  ownerNumber: string,
  from: string,
  clientNom: string | null,
  body: string | null,
  mediaPath: string | null,
  twilioNumber: string,
  supabase: AdminClient
) {
  const twilioClient = getTwilioClient();
  const entete = clientNom ? `📩 ${clientNom}\n${from}` : `📩 ${from}`;
  const texte = `${entete}\n${body ?? ""}`.trim();
  const mediaUrl = await signedMediaUrl(mediaPath, supabase);

  try {
    await twilioClient.messages.create({
      from: whatsappAddress(twilioNumber),
      to: whatsappAddress(ownerNumber),
      body: texte,
      ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
    });
  } catch {
    // Hors fenêtre de 24h : repli sur le modèle approuvé (texte seul, sans média).
    try {
      await twilioClient.messages.create({
        from: whatsappAddress(twilioNumber),
        to: whatsappAddress(ownerNumber),
        contentSid: RELAY_TEMPLATE_SID,
        contentVariables: JSON.stringify({ "1": texte }),
      });
    } catch {
      // Le message reste de toute façon consultable dans l'appli.
    }
  }
}

// Relaie la réponse du propriétaire (écrite depuis son WhatsApp perso) vers
// le client actuellement "actif" dans la conversation relayée.
async function relayerVersClient(
  clientTelephone: string,
  body: string | null,
  mediaPath: string | null,
  mediaType: string | null,
  twilioNumber: string,
  supabase: AdminClient
) {
  const texte = body?.trim() || undefined;
  const mediaUrl = await signedMediaUrl(mediaPath, supabase);
  if (!texte && !mediaUrl) return;

  try {
    const twilioClient = getTwilioClient();
    const message = await twilioClient.messages.create({
      from: whatsappAddress(twilioNumber),
      to: whatsappAddress(clientTelephone),
      ...(texte ? { body: texte } : {}),
      ...(mediaUrl ? { mediaUrl: [mediaUrl] } : {}),
    });

    const client = await trouverClient(clientTelephone, supabase);
    await supabase.from("whatsapp_messages").insert({
      client_id: client?.id ?? null,
      telephone: clientTelephone,
      direction: "out",
      body: texte ?? null,
      message_sid: message.sid,
      media_url: mediaPath,
      media_type: mediaType,
    });
  } catch {
    // Échec silencieux (ex : hors fenêtre 24h côté client) — à relancer
    // depuis l'appli si besoin.
  }
}

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioNumber = process.env.TWILIO_WHATSAPP_FROM;
  const ownerNumber = process.env.OWNER_WHATSAPP_NUMBER;
  const signature = request.headers.get("x-twilio-signature");
  const formData = await request.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => {
    params[key] = value.toString();
  });

  if (
    !authToken ||
    !signature ||
    !twilio.validateRequest(authToken, signature, request.url, params)
  ) {
    return NextResponse.json({ error: "Signature invalide." }, { status: 403 });
  }

  const from = (params.From ?? "").replace("whatsapp:", "");
  const body = params.Body || null;
  const messageSid = params.MessageSid ?? null;

  if (!from) {
    return new NextResponse(null, { status: 204 });
  }

  const supabase = createAdminClient();
  const { mediaPath, mediaType } = await downloadIncomingMedia(
    params,
    accountSid,
    authToken,
    supabase
  );

  const isFromOwner =
    !!ownerNumber && normalizeDigits(from) === normalizeDigits(ownerNumber);

  if (isFromOwner) {
    if (twilioNumber) {
      const { data: state } = await supabase
        .from("whatsapp_relay_state")
        .select("client_telephone")
        .eq("id", 1)
        .maybeSingle();
      if (state?.client_telephone) {
        await relayerVersClient(
          state.client_telephone,
          body,
          mediaPath,
          mediaType,
          twilioNumber,
          supabase
        );
      }
    }
    return new NextResponse(null, { status: 204 });
  }

  const match = await trouverClient(from, supabase);

  await supabase.from("whatsapp_messages").insert({
    client_id: match?.id ?? null,
    telephone: from,
    direction: "in",
    body,
    message_sid: messageSid,
    media_url: mediaPath,
    media_type: mediaType,
  });

  if (ownerNumber && twilioNumber) {
    await supabase.from("whatsapp_relay_state").upsert({
      id: 1,
      client_telephone: from,
      updated_at: new Date().toISOString(),
    });
    await envoyerVersOwner(
      ownerNumber,
      from,
      match?.nom ?? null,
      body,
      mediaPath,
      twilioNumber,
      supabase
    );
  }

  return new NextResponse(null, { status: 204 });
}
