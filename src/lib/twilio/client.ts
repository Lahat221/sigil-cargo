import twilio from "twilio";

export function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      "Twilio n'est pas configuré (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN manquants)."
    );
  }

  return twilio(accountSid, authToken);
}

export function whatsappAddress(numeroE164: string) {
  return `whatsapp:${numeroE164}`;
}
