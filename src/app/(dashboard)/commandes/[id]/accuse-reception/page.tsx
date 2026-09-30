import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/commandes/PrintButton";
import { ImageImprimanteButton } from "@/components/commandes/ImageImprimanteButton";
import { MarquerVerifieButton } from "@/components/commandes/MarquerVerifieButton";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function AccuseReceptionPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: commande } = await supabase
    .from("commandes")
    .select(
      "id, numero, poids_kg, mode_fret, volume_m3, description, livreur_nom, livreur_telephone, contenu_verifie, created_at, clients(nom, telephone)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!commande) notFound();

  const deposantEstClient = !commande.livreur_nom && !commande.livreur_telephone;

  return (
    <div className="mx-auto max-w-lg p-8">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-ink">
          Accusé de réception — Colis #{commande.numero}
        </h1>
        <div className="flex items-center gap-2 print:hidden">
          <ImageImprimanteButton
            selector=".accuse"
            filenamePrefix={`accuse-reception-colis-${commande.numero}`}
          />
          <Suspense fallback={null}>
            <PrintButton />
          </Suspense>
        </div>
      </div>

      <div className="accuse rounded-lg border-2 border-slate-900 bg-white p-6 shadow-lg print:border-0 print:p-0 print:shadow-none">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500 print:text-[10px]">
          {BRAND.nom}
        </p>
        <h2 className="mb-4 text-xl font-bold text-slate-900 print:mb-2 print:text-sm">
          Accusé de réception de colis
        </h2>

        <div className="mb-4 grid grid-cols-2 gap-3 text-sm print:mb-2 print:grid-cols-1 print:gap-1 print:text-[11px]">
          <div>
            <p className="text-slate-500">Colis</p>
            <p className="font-semibold text-slate-900">#{commande.numero}</p>
          </div>
          <div>
            <p className="text-slate-500">Reçu le</p>
            <p className="font-semibold text-slate-900">
              {dateFormatter.format(new Date(commande.created_at))}
            </p>
          </div>
        </div>

        <div className="mb-4 border-t border-slate-200 pt-3 text-sm print:mb-2 print:pt-2 print:text-[11px]">
          <p className="text-slate-500">Client</p>
          <p className="font-medium text-slate-900">
            {commande.clients?.nom ?? "—"}
            {commande.clients?.telephone && ` · ${commande.clients.telephone}`}
          </p>
        </div>

        <div className="mb-4 border-t border-slate-200 pt-3 text-sm print:mb-2 print:pt-2 print:text-[11px]">
          <p className="text-slate-500">Déposé par</p>
          <p className="font-medium text-slate-900">
            {deposantEstClient
              ? "Le client lui-même"
              : [commande.livreur_nom, commande.livreur_telephone]
                  .filter(Boolean)
                  .join(" · ") || "—"}
          </p>
        </div>

        <div className="mb-4 border-t border-slate-200 pt-3 text-sm print:mb-2 print:pt-2 print:text-[11px]">
          <p className="text-slate-500">Contenu déclaré</p>
          <p className="font-medium text-slate-900">
            {commande.description || "—"}
          </p>
          <p className="mt-1 text-slate-600">
            {commande.poids_kg !== null ? `${commande.poids_kg} kg` : null}
            {commande.mode_fret === "conteneur" && commande.volume_m3 !== null
              ? ` · ${commande.volume_m3} m³`
              : null}
            {commande.poids_kg === null &&
              !(commande.mode_fret === "conteneur" && commande.volume_m3 !== null) &&
              "Poids non renseigné"}
          </p>
        </div>

        <div className="mb-5 border-t border-slate-200 pt-3 text-sm print:mb-3 print:pt-2 print:text-[11px]">
          {commande.contenu_verifie ? (
            <p className="text-slate-700">
              Nous confirmons avoir reçu ET vérifié ce colis, conformément à la
              description ci-dessus.
            </p>
          ) : (
            <>
              <p className="text-slate-700">
                Nous confirmons avoir reçu ce colis, tel que déclaré par le
                déposant. Le contenu n&apos;a pas encore été vérifié à ce
                stade.
              </p>
              <div className="mt-2 print:hidden">
                <MarquerVerifieButton commandeId={commande.id} />
              </div>
            </>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-6 text-center text-xs text-slate-500 print:mt-4 print:grid-cols-1 print:gap-4 print:text-[10px]">
          <div>
            <div className="mb-1 h-16 border-b border-slate-400 print:h-10" />
            Signature du déposant
          </div>
          <div>
            <div className="mb-1 h-16 border-b border-slate-400 print:h-10" />
            Signature de l&apos;agent {BRAND.nom}
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          /* Mini imprimante thermique — rouleau continu 58mm, comme
             l'étiquette colis (même matériel à la réception). */
          @page {
            size: 58mm auto;
            margin: 2mm;
          }
          .accuse {
            max-width: none !important;
            width: 54mm;
            border: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
