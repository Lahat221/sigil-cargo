import { randomUUID } from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
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
  const body = params.Body ?? null;
  const messageSid = params.MessageSid ?? null;

  if (from) {
    const supabase = createAdminClient();
    const digits = from.replace(/\D/g, "");

    const { data: clients } = await supabase
      .from("clients")
      .select("id, telephone");
    const match = clients?.find((c) => {
      if (!c.telephone) return false;
      const cDigits = c.telephone.replace(/\D/g, "");
      return (
        cDigits === digits || digits.endsWith(cDigits) || cDigits.endsWith(digits)
      );
    });

    let mediaPath: string | null = null;
    let mediaType: string | null = null;

    const numMedia = parseInt(params.NumMedia ?? "0", 10);
    const mediaUrl = params.MediaUrl0;
    if (numMedia > 0 && mediaUrl && accountSid) {
      try {
        const contentType = params.MediaContentType0 || "application/octet-stream";
        const mediaRes = await fetch(mediaUrl, {
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
          },
        });
        if (mediaRes.ok) {
          const buffer = Buffer.from(await mediaRes.arrayBuffer());
          const ext = contentType.split("/")[1]?.split(";")[0] ?? "bin";
          const path = `incoming/${randomUUID()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("campagnes-media")
            .upload(path, buffer, { contentType });
          if (!uploadError) {
            mediaPath = path;
            mediaType = contentType;
          }
        }
      } catch {
        // Le message texte reste enregistré même si le média échoue.
      }
    }

    await supabase.from("whatsapp_messages").insert({
      client_id: match?.id ?? null,
      telephone: from,
      direction: "in",
      body,
      message_sid: messageSid,
      media_url: mediaPath,
      media_type: mediaType,
    });
  }

  return new NextResponse(null, { status: 204 });
}
