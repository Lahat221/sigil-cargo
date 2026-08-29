import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/commandes/PrintButton";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

export const dynamic = "force-dynamic";

function formatMontant(valeur: number): string {
  return valeur.toFixed(2);
}
const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

// Identité + couleurs de l'exportateur telles qu'imprimées sur la facture
// (marque commerciale du tenant — distincte de l'identité douane/LTA).
const {
  nom: EXPORTATEUR_NOM,
  adresse: EXPORTATEUR_ADRESSE,
  ninea: EXPORTATEUR_NINEA,
  rex: EXPORTATEUR_REX,
  email: EXPORTATEUR_EMAIL,
  couleurPrincipale: VERT,
  couleurSecondaire: TERRE,
  logoPath: LOGO_PATH,
  cachetPath: CACHET_PATH,
} = BRAND.factureExportateur;

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
          Facture — Colis #{commande.numero}
        </h1>
        <Suspense fallback={null}>
          <PrintButton />
        </Suspense>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg print:border-0 print:shadow-none">
        <div
          className="h-2 w-full print:h-1.5"
          style={{
            background: `linear-gradient(90deg, ${VERT}, ${TERRE})`,
          }}
        />

        <div className="p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2
                className="mb-4 text-xl font-bold"
                style={{ color: VERT }}
              >
                {EXPORTATEUR_NOM}
              </h2>
              <div className="text-sm text-slate-700">
                <p>Exportateur : {EXPORTATEUR_NOM}</p>
                <p>Adresse : {EXPORTATEUR_ADRESSE}</p>
                <p>NINEA : {EXPORTATEUR_NINEA}</p>
                <p>REX : {EXPORTATEUR_REX}</p>
                <p>Email : {EXPORTATEUR_EMAIL}</p>
              </div>
            </div>
            {LOGO_PATH && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={LOGO_PATH}
                alt={EXPORTATEUR_NOM}
                className="h-20 w-auto shrink-0 object-contain"
              />
            )}
          </div>

          <p
            className="mb-6 text-right text-lg font-bold tracking-wide"
            style={{ color: TERRE }}
          >
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
              <tr
                className="border-b text-left text-xs"
                style={{ borderColor: `${VERT}4D`, color: VERT }}
              >
                <th className="py-2 font-semibold">Produit</th>
                <th className="py-2 text-right font-semibold">Poids (kg)</th>
                <th className="py-2 text-right font-semibold">
                  Valeur unitaire en Euro
                </th>
                <th className="py-2 text-right font-semibold">
                  Valeur totale en Euro
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-900">
                  Fret aérien {BRAND.nom.split(" ")[0]}
                </td>
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

          <div className="mb-6 flex justify-end">
            <p
              className="rounded-md px-4 py-2 text-sm font-bold"
              style={{ backgroundColor: `${VERT}14`, color: VERT }}
            >
              TOTAL FACTURE : {formatMontant(commande.montant_total)} EUR
            </p>
          </div>

          <p
            className="border-t pt-4 text-xs text-slate-500"
            style={{ borderColor: `${VERT}33` }}
          >
            Commande N° {numeroFacture} — Date :{" "}
            {dateFormatter.format(new Date(commande.created_at))}
          </p>

          {CACHET_PATH && (
            <div className="mt-16 flex justify-center print:mt-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={CACHET_PATH}
                alt={`Cachet ${EXPORTATEUR_NOM}`}
                className="h-24 w-auto object-contain"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
