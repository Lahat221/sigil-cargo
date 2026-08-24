import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ReferentielTable, type EntreeReferentiel } from "@/components/douane/ReferentielTable";

export const dynamic = "force-dynamic";

export default async function ReferentielPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from("douane_produits_referentiel")
    .select("id, nom_local, type_produit, description_douane, hs_code, synonymes, actif")
    .order("nom_local")
    .returns<EntreeReferentiel[]>();

  return (
    <div className="max-w-4xl">
      <Link
        href="/gestion-douaniere"
        className="mb-4 inline-block text-sm text-white/60 hover:text-white"
      >
        ← Retour à Gestion Douanière
      </Link>
      <h1 className="mb-4 text-xl font-bold text-white">Référentiel produits</h1>
      <p className="mb-4 text-sm text-white/60">
        Les correspondances trouvées ici sont proposées en priorité à l&apos;IA avant qu&apos;elle
        n&apos;improvise une classification. Les codes HS non renseignés seront proposés par l&apos;IA
        au cas par cas et resteront à vérifier.
      </p>
      <ReferentielTable entrees={data ?? []} />
    </div>
  );
}
