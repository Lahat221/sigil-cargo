import { Suspense } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/commandes/PrintButton";
import { ImageImprimanteButton } from "@/components/commandes/ImageImprimanteButton";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

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
      "id, numero, poids_kg, mode_fret, volume_m3, nombre_paquets, code_barre_colis, destination, clients(nom), projets(nom)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!commande) notFound();

  // URL de la page publique (pas de connexion requise, voir
  // src/app/colis/[id]/page.tsx) encodée dans le QR code de l'étiquette —
  // construite depuis les en-têtes de la requête pour pointer vers le bon
  // domaine (local/preview/prod) sans variable d'env à maintenir.
  const headersList = headers();
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const host = headersList.get("host");
  const urlColis = `${proto}://${host}/colis/${commande.id}`;
  const qrDataUrl = await QRCode.toDataURL(urlColis, { width: 160, margin: 1 });

  // Une étiquette par paquet déclaré (ex. 3 paquets → 1/3, 2/3, 3/3), pas
  // une seule étiquette pour tout le colis — chaque paquet physique doit
  // pouvoir être identifié séparément.
  const totalPaquets = Math.max(1, commande.nombre_paquets);
  const paquets = Array.from({ length: totalPaquets }, (_, i) => i + 1);

  return (
    <div className="mx-auto max-w-md p-8">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-ink">
          Étiquette — Colis #{commande.numero}
          {totalPaquets > 1 && ` (${totalPaquets} paquets)`}
        </h1>
        <div className="flex items-center gap-2 print:hidden">
          <ImageImprimanteButton
            selector=".etiquette"
            filenamePrefix={`etiquette-colis-${commande.numero}`}
          />
          <Suspense fallback={null}>
            <PrintButton />
          </Suspense>
        </div>
      </div>

      <div className="space-y-6 print:space-y-0">
        {paquets.map((paquet) => (
          /* Aperçu écran plus large que le rouleau réel (58mm) pour rester
             lisible ici — .etiquette impose la largeur/police réelles à
             l'impression via le bloc @media print ci-dessous. */
          <div
            key={paquet}
            className="etiquette mx-auto max-w-xs rounded-lg border-2 border-slate-900 bg-white p-4 text-center shadow-lg print:border-0 print:shadow-none"
          >
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {BRAND.nom}
            </p>

            <h2 className="mb-1 break-words text-lg font-extrabold leading-tight text-slate-900">
              {commande.clients?.nom ?? "—"}
            </h2>

            <p className="mb-1 text-2xl font-black text-slate-900">
              #{commande.numero}
            </p>

            {totalPaquets > 1 && (
              <p className="mb-2 text-sm font-bold text-slate-600">
                Paquet {paquet} / {totalPaquets}
              </p>
            )}

            {commande.destination && (
              <p className="mb-2 rounded-md bg-slate-900 py-1 text-base font-extrabold uppercase tracking-wide text-white">
                {commande.destination}
              </p>
            )}

            <div className="mb-2 space-y-0.5 text-xs text-slate-700">
              <p>
                {[
                  commande.poids_kg !== null ? `${commande.poids_kg} kg` : null,
                  commande.mode_fret === "conteneur" && commande.volume_m3 !== null
                    ? `${commande.volume_m3} m³`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </p>
              {commande.projets?.nom && <p>{commande.projets.nom}</p>}
            </div>

            <div className="my-2 flex flex-col items-center gap-1 border-t border-dashed border-slate-300 pt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR code — voir le contenu et la vidéo du colis"
                className="h-24 w-24"
              />
              <p className="text-[10px] leading-tight text-slate-500">
                Scanner : photos &amp; vidéo du colis
              </p>
            </div>

            {commande.code_barre_colis && (
              <p className="border-t border-slate-300 pt-2 font-mono text-xs font-bold tracking-widest text-slate-900">
                {commande.code_barre_colis}
              </p>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          /* Mini imprimante thermique — rouleau continu 58mm, hauteur libre
             (le rouleau se découpe selon la longueur du contenu, pas une
             hauteur fixe comme une étiquette 100x150mm). */
          @page {
            size: 58mm auto;
            margin: 2mm;
          }
          .etiquette {
            max-width: none !important;
            width: 54mm;
            border: none !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            break-after: page;
          }
          .etiquette:last-of-type {
            break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
