import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EnvoyerCampagneListe } from "@/components/whatsapp/EnvoyerCampagneListe";
import { SupprimerCampagneButton } from "@/components/whatsapp/SupprimerCampagneButton";
import { IconDownload } from "@/components/ui/Icons";

export const dynamic = "force-dynamic";

export default async function CampagnePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: campagne } = await supabase
    .from("campagnes_whatsapp")
    .select("id, nom, message, image_url, content_sid")
    .eq("id", params.id)
    .maybeSingle();

  if (!campagne) notFound();

  const twilioConfigure = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM
  );

  let imageUrlSigned: string | null = null;
  if (campagne.image_url) {
    const { data } = await supabase.storage
      .from("campagnes-media")
      .createSignedUrl(campagne.image_url, 3600);
    imageUrlSigned = data?.signedUrl ?? null;
  }

  const { data: destinataires } = await supabase
    .from("campagnes_whatsapp_destinataires")
    .select("id, envoyee, erreur, clients(nom, telephone, telephone_pays)")
    .eq("campagne_id", campagne.id)
    .order("created_at");

  const total = destinataires?.length ?? 0;
  const envoyes = (destinataires ?? []).filter((d) => d.envoyee).length;

  return (
    <div>
      <Link
        href="/notifications-whatsapp"
        className="mb-4 inline-block text-sm text-white/60 hover:text-white"
      >
        ← Retour aux campagnes
      </Link>

      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{campagne.nom}</h1>
          <p className="text-sm text-white/60">
            {envoyes}/{total} envoyé(s)
          </p>
        </div>
        <SupprimerCampagneButton campagneId={campagne.id} nom={campagne.nom} />
      </div>

      {!twilioConfigure && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Envoi automatique Twilio non configuré — les messages s&apos;ouvrent
          pour l&apos;instant dans WhatsApp pour un envoi manuel.
        </p>
      )}

      <div className="mb-4 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Message
        </p>
        <p className="whitespace-pre-wrap text-sm text-slate-900">
          {campagne.message}
        </p>
        {campagne.content_sid && (
          <p className="mt-2 text-xs text-slate-400">
            Modèle approuvé : <span className="font-mono">{campagne.content_sid}</span>
          </p>
        )}
      </div>

      {imageUrlSigned && (
        <div className="mb-4 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Affiche / visuel
          </p>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrlSigned}
              alt="Affiche de la campagne"
              className="h-24 w-24 rounded-md border border-slate-200 object-cover"
            />
            <div>
              <a
                href={imageUrlSigned}
                download
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-sm font-medium text-navy hover:underline"
              >
                <IconDownload size={14} />
                Télécharger
              </a>
              <p className="mt-1 text-xs text-slate-400">
                À joindre manuellement dans WhatsApp avant l&apos;envoi.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <EnvoyerCampagneListe
          destinataires={destinataires ?? []}
          message={campagne.message}
        />
      </div>
    </div>
  );
}
