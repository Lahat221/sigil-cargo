import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EnvoyerCampagneListe } from "@/components/whatsapp/EnvoyerCampagneListe";
import { SupprimerCampagneButton } from "@/components/whatsapp/SupprimerCampagneButton";

export const dynamic = "force-dynamic";

export default async function CampagnePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: campagne } = await supabase
    .from("campagnes_whatsapp")
    .select("id, nom, message")
    .eq("id", params.id)
    .maybeSingle();

  if (!campagne) notFound();

  const { data: destinataires } = await supabase
    .from("campagnes_whatsapp_destinataires")
    .select("id, envoyee, clients(nom, telephone, telephone_pays)")
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

      <div className="mb-4 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          Message
        </p>
        <p className="whitespace-pre-wrap text-sm text-slate-900">
          {campagne.message}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <EnvoyerCampagneListe
          destinataires={destinataires ?? []}
          message={campagne.message}
        />
      </div>
    </div>
  );
}
