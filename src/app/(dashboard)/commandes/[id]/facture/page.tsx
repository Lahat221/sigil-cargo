import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/commandes/PrintButton";

export const dynamic = "force-dynamic";

function formatMontant(valeur: number): string {
  return valeur.toFixed(2);
}
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

// Informations légales de l'exportateur (identiques sur toutes les factures).
const EXPORTATEUR_NOM = "AMINATA MBAYE";
const EXPORTATEUR_ADRESSE = "Djidah Thiaroye Kao, Dakar, Sénégal";
const EXPORTATEUR_NINEA = "SN005845493";
const EXPORTATEUR_REX = "SNREX1356ASX";
const EXPORTATEUR_EMAIL = "Binet1801@gmail.com";

export default async function FactureCommandePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: commande } = await supabase
    .from("commandes")
    .select(
      "numero, poids_kg, prix_par_kg, montant_total, created_at, clients(nom, telephone, adresse), projets(nom)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!commande) notFound();

  const numeroFacture = String(commande.numero).padStart(4, "0");

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-white">
          Facture — Commande #{commande.numero}
        </h1>
        <Suspense fallback={null}>
          <PrintButton />
        </Suspense>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-lg print:border-0 print:shadow-none">
        <h2 className="mb-6 text-xl font-bold text-slate-900">COLLE AGRO</h2>

        <div className="mb-6 text-sm text-slate-700">
          <p>Exportateur : {EXPORTATEUR_NOM}</p>
          <p>Adresse : {EXPORTATEUR_ADRESSE}</p>
          <p>NINEA : {EXPORTATEUR_NINEA}</p>
          <p>REX : {EXPORTATEUR_REX}</p>
          <p>Email : {EXPORTATEUR_EMAIL}</p>
        </div>

        <p className="mb-6 text-right text-lg font-bold tracking-wide text-slate-900">
          FACTURE
        </p>

        <div className="mb-6 text-sm text-slate-700">
          <p>Client : {commande.clients?.nom ?? "—"}</p>
          <div className="flex items-baseline justify-between">
            <p>Adresse : {commande.clients?.adresse ?? "—"}</p>
            <p className="shrink-0 font-medium text-slate-900">
              N° {numeroFacture}
            </p>
          </div>
          <p>Tél : {commande.clients?.telephone ?? "—"}</p>
          <p>Type de fret : {commande.projets?.nom ?? "—"}</p>
        </div>

        <table className="mb-4 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs text-slate-500">
              <th className="py-2 font-normal">Produit</th>
              <th className="py-2 text-right font-normal">Poids (kg)</th>
              <th className="py-2 text-right font-normal">
                Valeur unitaire en Euro
              </th>
              <th className="py-2 text-right font-normal">
                Valeur totale en Euro
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-900">Fret aérien SIGIL</td>
              <td className="py-2 text-right text-slate-700">
                {commande.poids_kg}
              </td>
              <td className="py-2 text-right text-slate-700">
                {formatMontant(commande.prix_par_kg)}
              </td>
              <td className="py-2 text-right font-medium text-slate-900">
                {formatMontant(commande.montant_total)}
              </td>
            </tr>
          </tbody>
        </table>

        <p className="mb-6 text-right text-sm font-bold text-slate-900">
          TOTAL FACTURE : {formatMontant(commande.montant_total)} EUR
        </p>

        <p className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          Commande N° {numeroFacture} — Date :{" "}
          {dateFormatter.format(new Date(commande.created_at))}
        </p>
      </div>
    </div>
  );
}
