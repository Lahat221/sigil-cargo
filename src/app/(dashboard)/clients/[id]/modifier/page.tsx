import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientForm } from "@/components/clients/ClientForm";

export const dynamic = "force-dynamic";

export default async function ModifierClientPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, nom, telephone, telephone_pays, adresse")
    .eq("id", params.id)
    .maybeSingle();

  if (!client) notFound();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Modifier le client</h1>
        <Link href="/clients" className="text-sm text-ink-muted hover:text-ink">
          ← Retour à la liste
        </Link>
      </div>

      <ClientForm
        clientId={client.id}
        initialNom={client.nom}
        initialTelephone={client.telephone ?? ""}
        initialTelephonePays={client.telephone_pays ?? "+33"}
        initialAdresse={client.adresse ?? ""}
      />
    </div>
  );
}
