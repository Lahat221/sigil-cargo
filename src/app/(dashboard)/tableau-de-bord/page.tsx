import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatutBadge, STATUT_LABELS } from "@/components/commandes/StatutBadge";
import type { StatutCommande } from "@/types/database.types";

export const dynamic = "force-dynamic";

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

const STATUTS_PIPELINE: StatutCommande[] = [
  "recue",
  "a_preparer",
  "en_preparation",
  "prete",
  "expediee",
  "livree",
];

export default async function TableauDeBordPage() {
  const supabase = createClient();

  const [{ data: commandes }, { count: nombreClients }] = await Promise.all([
    supabase
      .from("commandes")
      .select(
        "id, numero, statut, montant_total, created_at, clients(nom), projets(nom)"
      )
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id", { count: "exact", head: true }),
  ]);

  const toutes = commandes ?? [];
  const actives = toutes.filter((c) => c.statut !== "annulee");

  const montantTotal = actives.reduce((sum, c) => sum + c.montant_total, 0);
  const compteParStatut = STATUTS_PIPELINE.reduce<Record<string, number>>(
    (acc, s) => {
      acc[s] = toutes.filter((c) => c.statut === s).length;
      return acc;
    },
    {}
  );
  const recentes = toutes.slice(0, 8);

  return (
    <div>
      <h1 className="mb-6 text-lg font-semibold text-slate-900">
        Tableau de bord
      </h1>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Commandes actives
          </p>
          <p className="mt-1 text-2xl font-bold text-navy">
            {actives.length}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Montant total
          </p>
          <p className="mt-1 text-2xl font-bold text-navy">
            {montantFormatter.format(montantTotal)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Clients
          </p>
          <p className="mt-1 text-2xl font-bold text-navy">
            {nombreClients ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            À traiter
          </p>
          <p className="mt-1 text-2xl font-bold text-navy">
            {compteParStatut.recue +
              compteParStatut.a_preparer +
              compteParStatut.en_preparation}
          </p>
        </div>
      </div>

      <div className="mb-8 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-medium text-slate-700">
          Pipeline de préparation
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STATUTS_PIPELINE.map((s) => (
            <Link
              key={s}
              href={`/commandes?statut=${s}`}
              className="rounded-md bg-slate-50 p-3 text-center transition-colors hover:bg-slate-100"
            >
              <p className="text-xl font-bold text-navy">
                {compteParStatut[s]}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {STATUT_LABELS[s]}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700">
            Commandes récentes
          </h2>
          <Link
            href="/commandes"
            className="text-sm text-gold-2 hover:underline"
          >
            Voir tout →
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {recentes.length === 0 && (
            <p className="py-4 text-sm text-slate-400">Aucune commande.</p>
          )}
          {recentes.map((c) => (
            <Link
              key={c.id}
              href={`/commandes/${c.id}`}
              className="flex items-center justify-between py-3 text-sm hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-slate-900">
                  #{c.numero}
                </span>
                <span className="text-slate-600">
                  {c.clients?.nom ?? "—"}
                </span>
                <span className="text-xs text-slate-400">
                  {c.projets?.nom ?? "—"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <StatutBadge statut={c.statut} />
                <span className="font-medium text-slate-900">
                  {montantFormatter.format(c.montant_total)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
