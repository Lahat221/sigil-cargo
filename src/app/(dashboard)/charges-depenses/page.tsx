import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SupprimerChargeButton } from "@/components/charges/SupprimerChargeButton";
import { ProjetFilterSelect } from "@/components/commandes/ProjetFilterSelect";
import { IconFileText, IconInvoice, IconPencil, IconPlus } from "@/components/ui/Icons";

export const dynamic = "force-dynamic";

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

export default async function ChargesDepensesPage({
  searchParams,
}: {
  searchParams: { projet?: string };
}) {
  const supabase = createClient();

  const { data: projets } = await supabase
    .from("projets")
    .select("id, nom")
    .order("created_at", { ascending: false });

  let query = supabase
    .from("charges")
    .select("id, libelle, montant, categorie, date_charge, facture_url, projets(nom)")
    .order("date_charge", { ascending: false });

  if (searchParams.projet) {
    query = query.eq("projet_id", searchParams.projet);
  }

  const { data: charges, error } = await query;

  const total = (charges ?? []).reduce((sum, c) => sum + c.montant, 0);

  const factureUrls = new Map<string, string>();
  for (const c of charges ?? []) {
    if (c.facture_url) {
      const { data } = await supabase.storage
        .from("charges-factures")
        .createSignedUrl(c.facture_url, 3600);
      if (data) factureUrls.set(c.id, data.signedUrl);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink">Charges & Dépenses</h1>
        <Link
          href="/charges-depenses/nouveau"
          className="flex items-center gap-1.5 rounded-lg bg-gold-gradient px-4 py-1.5 text-sm font-semibold text-navy shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:brightness-105"
        >
          <IconPlus size={15} />
          Nouvelle charge
        </Link>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <p className="text-sm text-slate-500">Total des charges</p>
        <p className="text-2xl font-bold text-navy">
          {montantFormatter.format(total)}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <ProjetFilterSelect projets={projets ?? []} />
        </div>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Erreur : {error.message}
          </p>
        ) : !charges || charges.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
            <IconInvoice size={28} />
            <p className="text-sm">Aucune charge enregistrée.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Projet</th>
                  <th className="px-3 py-2 font-medium">Libellé</th>
                  <th className="px-3 py-2 font-medium">Catégorie</th>
                  <th className="px-3 py-2 font-medium">Montant</th>
                  <th className="px-3 py-2 font-medium">Facture</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {charges.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-slate-600">
                      {dateFormatter.format(new Date(c.date_charge))}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {c.projets?.nom ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      {c.libelle}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {c.categorie ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      {montantFormatter.format(c.montant)}
                    </td>
                    <td className="px-3 py-2.5">
                      {factureUrls.has(c.id) ? (
                        <a
                          href={factureUrls.get(c.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex w-fit items-center gap-1.5 text-navy hover:underline"
                        >
                          <IconFileText size={14} />
                          Voir
                        </a>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/charges-depenses/${c.id}/modifier`}
                          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
                        >
                          <IconPencil size={14} />
                          Modifier
                        </Link>
                        <SupprimerChargeButton
                          chargeId={c.id}
                          libelle={c.libelle}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
