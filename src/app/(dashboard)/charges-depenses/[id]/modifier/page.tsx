import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChargeForm } from "@/components/charges/ChargeForm";

export const dynamic = "force-dynamic";

export default async function ModifierChargePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: charge } = await supabase
    .from("charges")
    .select("id, libelle, montant, categorie, date_charge, remarque, facture_url")
    .eq("id", params.id)
    .maybeSingle();

  if (!charge) notFound();

  let factureUrlSigned: string | null = null;
  if (charge.facture_url) {
    const { data } = await supabase.storage
      .from("charges-factures")
      .createSignedUrl(charge.facture_url, 3600);
    factureUrlSigned = data?.signedUrl ?? null;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Modifier la charge</h1>
        <Link
          href="/charges-depenses"
          className="text-sm text-white/60 hover:text-white"
        >
          ← Retour à la liste
        </Link>
      </div>

      <ChargeForm
        chargeId={charge.id}
        initialLibelle={charge.libelle}
        initialMontant={charge.montant.toString()}
        initialCategorie={charge.categorie ?? ""}
        initialDateCharge={charge.date_charge}
        initialRemarque={charge.remarque ?? ""}
        initialFactureUrl={charge.facture_url}
        initialFactureUrlSigned={factureUrlSigned}
      />
    </div>
  );
}
