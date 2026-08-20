import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/commandes/PrintButton";

export const dynamic = "force-dynamic";

export default async function EtiquetteCommandePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: commande } = await supabase
    .from("commandes")
    .select(
      "numero, poids_kg, description, code_barre_colis, clients(nom), projets(nom)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!commande) notFound();

  return (
    <div className="mx-auto max-w-md p-8">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-navy">
          Étiquette — Commande #{commande.numero}
        </h1>
        <Suspense fallback={null}>
          <PrintButton />
        </Suspense>
      </div>

      <div className="etiquette rounded-lg border-2 border-slate-900 p-6 print:border-0">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
          SIGIL CARGO
        </p>

        <h2 className="mb-4 break-words text-4xl font-extrabold leading-tight text-slate-900">
          {commande.clients?.nom ?? "—"}
        </h2>

        <p className="mb-2 text-3xl font-black text-slate-900">
          #{commande.numero}
        </p>

        <div className="mb-4 space-y-1 text-sm text-slate-700">
          <p>{commande.poids_kg} kg</p>
          {commande.projets?.nom && <p>{commande.projets.nom}</p>}
        </div>

        {commande.description && (
          <p className="mb-4 border-t border-slate-300 pt-3 text-sm text-slate-800">
            {commande.description}
          </p>
        )}

        {commande.code_barre_colis && (
          <p className="border-t border-slate-300 pt-3 font-mono text-lg font-bold tracking-widest text-slate-900">
            {commande.code_barre_colis}
          </p>
        )}
      </div>

      <style>{`
        @media print {
          @page {
            size: 100mm 150mm;
            margin: 5mm;
          }
          .etiquette {
            border: none !important;
          }
        }
      `}</style>
    </div>
  );
}
