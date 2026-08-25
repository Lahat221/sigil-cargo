import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExtractionTable, type ProduitLigne } from "@/components/douane/ExtractionTable";
import { ValiderColisButton } from "@/components/douane/ValiderColisButton";
import { ReanalyserButton } from "@/components/douane/ReanalyserButton";
import { HistoriqueExtraction } from "@/components/douane/HistoriqueExtraction";
import { TraiterDepartButton } from "@/components/douane/TraiterDepartButton";
import { STATUT_DOUANE_LABELS } from "@/components/douane/statutLabels";
import type { StatutExtractionDouane } from "@/types/database.types";

export const dynamic = "force-dynamic";

type ColisDetail = {
  id: string;
  numero: number;
  poids_kg: number;
  description: string | null;
  clients: { nom: string; telephone: string | null } | null;
};

type ExtractionDetail = {
  id: string;
  statut: StatutExtractionDouane;
  version: number;
  anomalies: string[];
  erreur: string | null;
  valide_at: string | null;
  updated_at: string;
};

export default async function DetailDouanePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: colis } = await supabase
    .from("commandes")
    .select("id, numero, poids_kg, description, clients(nom, telephone)")
    .eq("id", params.id)
    .maybeSingle<ColisDetail>();

  if (!colis) notFound();

  const { data: extraction } = await supabase
    .from("douane_extractions")
    .select("id, statut, version, anomalies, erreur, valide_at, updated_at")
    .eq("commande_id", colis.id)
    .maybeSingle<ExtractionDetail>();

  let produits: ProduitLigne[] = [];
  let produitsRetires: { id: string; description: string }[] = [];
  let historique: {
    id: string;
    champ: string;
    ancienne_valeur: string | null;
    nouvelle_valeur: string | null;
    created_at: string;
    profiles: { nom: string } | null;
  }[] = [];

  if (extraction) {
    const [{ data: p }, { data: r }, { data: h }] = await Promise.all([
      supabase
        .from("douane_produits")
        .select(
          "id, type_produit, description_douane, hs_code, hs_status, description_produit, quantite, unite, confiance, statut"
        )
        .eq("extraction_id", extraction.id)
        .order("ordre"),
      supabase
        .from("douane_produits_retires")
        .select("id, description")
        .eq("extraction_id", extraction.id),
      supabase
        .from("douane_historique")
        .select("id, champ, ancienne_valeur, nouvelle_valeur, created_at, profiles(nom)")
        .eq("extraction_id", extraction.id)
        .order("created_at", { ascending: false }),
    ]);
    produits = (p as ProduitLigne[]) ?? [];
    produitsRetires = r ?? [];
    historique = (h as typeof historique) ?? [];
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Colis #{colis.numero}</h1>
          <p className="text-sm text-white/60">
            {colis.clients?.nom ?? "—"}
            {colis.clients?.telephone && ` · ${colis.clients.telephone}`} · {colis.poids_kg} kg
          </p>
        </div>
        {extraction && (
          <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">
            {STATUT_DOUANE_LABELS[extraction.statut]} · v{extraction.version}
          </span>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <p className="mb-1 text-sm font-medium text-slate-700">Description brute (saisie agent)</p>
        <p className="text-sm text-slate-600">{colis.description || "(aucune description)"}</p>
      </div>

      {!extraction ? (
        <div className="mb-6 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
          <TraiterDepartButton commandeIds={[colis.id]} />
        </div>
      ) : (
        <>
          {extraction.statut === "erreur" && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Échec de l&apos;extraction IA : {extraction.erreur}
            </div>
          )}

          {extraction.anomalies.length > 0 && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="mb-1 font-medium">Anomalies détectées</p>
              <ul className="list-inside list-disc">
                {extraction.anomalies.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-6 rounded-xl border border-slate-200/70 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-medium text-slate-700">Produits détectés</p>
            </div>
            <ExtractionTable produits={produits} />
          </div>

          {produitsRetires.length > 0 && (
            <div className="mb-6 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Produits retirés du colis (non déclarés)
              </p>
              <ul className="list-inside list-disc text-sm text-slate-600">
                {produitsRetires.map((p) => (
                  <li key={p.id}>{p.description}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
            <ReanalyserButton commandeId={colis.id} />
            {extraction.statut !== "valide" && <ValiderColisButton commandeId={colis.id} />}
            {extraction.statut === "valide" && extraction.valide_at && (
              <span className="text-xs text-slate-400">
                Validé le {new Date(extraction.valide_at).toLocaleString("fr-FR")}
              </span>
            )}
          </div>

          <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-slate-700">Historique des corrections</p>
            <HistoriqueExtraction entrees={historique} />
          </div>
        </>
      )}
    </div>
  );
}
