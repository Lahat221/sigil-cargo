import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ChargeForm } from "@/components/charges/ChargeForm";

export const dynamic = "force-dynamic";

export default async function NouvelleChargePage() {
  const supabase = createClient();
  const { data: projets } = await supabase
    .from("projets")
    .select("id, nom")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Nouvelle charge</h1>
        <Link
          href="/charges-depenses"
          className="text-sm text-ink-muted hover:text-ink"
        >
          ← Retour à la liste
        </Link>
      </div>

      <ChargeForm projets={projets ?? []} />
    </div>
  );
}
