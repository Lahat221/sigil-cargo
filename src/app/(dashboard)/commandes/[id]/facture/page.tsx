import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/commandes/PrintButton";

export const dynamic = "force-dynamic";

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export default async function FactureCommandePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: commande } = await supabase
    .from("commandes")
    .select(
      "numero, poids_kg, prix_par_kg, enveloppe, nombre_paquets, montant_total, code_barre_colis, created_at, clients(nom, telephone), projets(nom), produits(nom)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!commande) notFound();

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
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">SIGIL CARGO</h2>
            <p className="text-sm text-slate-500">Fret aérien Dakar → France</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium text-slate-900">
              Facture n° {commande.numero}
            </p>
            <p className="text-slate-500">
              {dateFormatter.format(new Date(commande.created_at))}
            </p>
          </div>
        </div>

        <div className="mb-6 text-sm">
          <p className="font-medium text-slate-700">Client</p>
          <p className="text-slate-900">{commande.clients?.nom ?? "—"}</p>
          {commande.clients?.telephone && (
            <p className="text-slate-500">{commande.clients.telephone}</p>
          )}
        </div>

        <table className="mb-6 w-full text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-xs uppercase text-slate-500">
              <th className="py-2">Produit</th>
              <th className="py-2 text-right">Poids</th>
              <th className="py-2 text-right">Prix/kg</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-900">
                {commande.produits?.nom ?? "—"}
                {commande.enveloppe && (
                  <span className="block text-xs text-slate-500">
                    + option enveloppe
                  </span>
                )}
              </td>
              <td className="py-2 text-right text-slate-700">
                {commande.poids_kg} kg
              </td>
              <td className="py-2 text-right text-slate-700">
                {montantFormatter.format(commande.prix_par_kg)}
              </td>
              <td className="py-2 text-right font-medium text-slate-900">
                {montantFormatter.format(commande.montant_total)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mb-6 flex justify-end">
          <div className="text-right">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-xl font-bold text-slate-900">
              {montantFormatter.format(commande.montant_total)}
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          <p>Projet : {commande.projets?.nom ?? "—"}</p>
          <p>Paquets : {commande.nombre_paquets}</p>
          {commande.code_barre_colis && (
            <p className="font-mono">Code colis : {commande.code_barre_colis}</p>
          )}
        </div>
      </div>
    </div>
  );
}
