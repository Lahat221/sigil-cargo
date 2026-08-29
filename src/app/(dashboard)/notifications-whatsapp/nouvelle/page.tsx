import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CampagneForm } from "@/components/whatsapp/CampagneForm";

export const dynamic = "force-dynamic";

export default async function NouvelleCampagnePage() {
  const supabase = createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, nom, telephone")
    .order("nom");

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Nouvelle campagne</h1>
        <Link
          href="/notifications-whatsapp"
          className="text-sm text-ink-muted hover:text-ink"
        >
          ← Retour à la liste
        </Link>
      </div>

      <CampagneForm clients={clients ?? []} />
    </div>
  );
}
