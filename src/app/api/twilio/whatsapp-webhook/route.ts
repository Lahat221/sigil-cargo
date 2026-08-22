import { NextResponse, type NextRequest } from "next/server";
import twilio from "twilio";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
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

    await supabase.from("whatsapp_messages").insert({
      client_id: match?.id ?? null,
      telephone: from,
      direction: "in",
      body,
      message_sid: messageSid,
    });
  }

  return new NextResponse(null, { status: 204 });
}
