import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatutBadge, STATUT_LABELS } from "@/components/commandes/StatutBadge";
import { DashboardFiltres } from "@/components/dashboard/DashboardFiltres";
import { BarChart } from "@/components/dashboard/BarChart";
import type { StatutCommande } from "@/types/database.types";

export const dynamic = "force-dynamic";

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});
const jourLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
});

const STATUTS_PIPELINE: StatutCommande[] = [
  "recue",
  "a_preparer",
  "en_preparation",
  "prete",
  "expediee",
  "livree",
];

function calculerPeriode(
  periode: string | undefined,
  debut: string | undefined,
  fin: string | undefined
): { debut: string | null; fin: string | null } {
  const maintenant = new Date();

  if (periode === "jour") {
    const d = new Date(maintenant);
    d.setHours(0, 0, 0, 0);
    return { debut: d.toISOString(), fin: null };
  }
  if (periode === "semaine") {
    const d = new Date(maintenant);
    const jour = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() - jour + 1);
    d.setHours(0, 0, 0, 0);
    return { debut: d.toISOString(), fin: null };
  }
  if (periode === "mois") {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    return { debut: d.toISOString(), fin: null };
  }
  if (periode === "personnalise") {
    return {
      debut: debut ? new Date(debut).toISOString() : null,
      fin: fin ? new Date(fin + "T23:59:59").toISOString() : null,
    };
  }
  return { debut: null, fin: null };
}

function joursDeLaPeriode(debut: string | null, fin: string | null): Date[] {
  const finDate = fin ? new Date(fin) : new Date();
  let debutDate: Date;
  if (debut) {
    debutDate = new Date(debut);
  } else {
    debutDate = new Date(finDate);
    debutDate.setDate(debutDate.getDate() - 13);
  }
  const jours: Date[] = [];
  const cur = new Date(debutDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(finDate);
  end.setHours(0, 0, 0, 0);
  while (cur <= end && jours.length < 60) {
    jours.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return jours;
}

export default async function TableauDeBordPage({
  searchParams,
}: {
  searchParams: { projet?: string; periode?: string; debut?: string; fin?: string };
}) {
  const supabase = createClient();

  const { data: projets } = await supabase
    .from("projets")
    .select("id, nom")
    .order("created_at", { ascending: false });

  const { debut, fin } = calculerPeriode(
    searchParams.periode,
    searchParams.debut,
    searchParams.fin
  );

  let query = supabase
    .from("commandes")
    .select(
      "id, numero, statut, poids_kg, montant_total, created_at, clients(nom), projets(nom), produits(nom)"
    )
    .order("created_at", { ascending: false });

  if (searchParams.projet) query = query.eq("projet_id", searchParams.projet);
  if (debut) query = query.gte("created_at", debut);
  if (fin) query = query.lte("created_at", fin);

  const { data: commandes } = await query;
  const { count: nombreClients } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true });

  const toutes = commandes ?? [];
  const actives = toutes.filter((c) => c.statut !== "annulee");

  const chiffreAffaires = actives.reduce((sum, c) => sum + c.montant_total, 0);
  const compteParStatut = STATUTS_PIPELINE.reduce<Record<string, number>>(
    (acc, s) => {
      acc[s] = toutes.filter((c) => c.statut === s).length;
      return acc;
    },
    {}
  );

  const poidsParProduit = new Map<string, number>();
  for (const c of actives) {
    const nom = c.produits?.nom ?? "—";
    poidsParProduit.set(nom, (poidsParProduit.get(nom) ?? 0) + c.poids_kg);
  }
  const meilleurProduit =
    Array.from(poidsParProduit.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "—";

  const poidsTotal = actives.reduce((sum, c) => sum + c.poids_kg, 0);

  const jours = joursDeLaPeriode(debut, fin);
  const caParJourMap = new Map<string, number>();
  for (const c of actives) {
    const cle = c.created_at.slice(0, 10);
    caParJourMap.set(cle, (caParJourMap.get(cle) ?? 0) + c.montant_total);
  }
  const caParJour = jours.map((j) => {
    const cle = j.toISOString().slice(0, 10);
    return {
      label: jourLabelFormatter.format(j),
      value: caParJourMap.get(cle) ?? 0,
    };
  });

  const poidsParProjetMap = new Map<string, number>();
  for (const c of actives) {
    const nom = c.projets?.nom ?? "—";
    poidsParProjetMap.set(nom, (poidsParProjetMap.get(nom) ?? 0) + c.poids_kg);
  }
  const poidsParProjet = Array.from(poidsParProjetMap.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const recentes = toutes.slice(0, 8);

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy">Tableau de bord</h1>
      <p className="mb-6 text-sm text-slate-500">
        SIGIL CARGO · Vue d&apos;ensemble
      </p>

      <DashboardFiltres projets={projets ?? []} />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Chiffre d'affaires"
          valeur={montantFormatter.format(chiffreAffaires)}
          sousTitre={`${actives.length} commande(s)`}
          couleur="bg-green-50 text-green-600"
          icone="€"
        />
        <KpiCard
          label="Poids total"
          valeur={`${poidsTotal.toLocaleString("fr-FR")} kg`}
          sousTitre="commandes actives"
          couleur="bg-purple-50 text-purple-600"
          icone="kg"
        />
        <KpiCard
          label="Commandes"
          valeur={toutes.length.toString()}
          sousTitre={`${nombreClients ?? 0} client(s) au total`}
          couleur="bg-blue-50 text-blue-600"
          icone="#"
        />
        <KpiCard
          label="Meilleur produit"
          valeur={meilleurProduit}
          sousTitre="par poids expédié"
          couleur="bg-amber-50 text-amber-600"
          icone="★"
          petit
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200/70 bg-white shadow-sm p-5">
          <h2 className="mb-1 text-sm font-medium text-slate-700">
            Chiffre d&apos;affaires par jour
          </h2>
          <p className="mb-4 text-xs text-slate-400">
            {debut ? "Période sélectionnée" : "14 derniers jours"}
          </p>
          <BarChart
            data={caParJour}
            color="#D3A238"
            formatValue={(v) => montantFormatter.format(v)}
          />
        </div>
        <div className="rounded-xl border border-slate-200/70 bg-white shadow-sm p-5">
          <h2 className="mb-1 text-sm font-medium text-slate-700">
            Poids par projet
          </h2>
          <p className="mb-4 text-xs text-slate-400">en kg, projets actifs</p>
          {poidsParProjet.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              Aucune donnée.
            </p>
          ) : (
            <BarChart
              data={poidsParProjet}
              color="#0A1A33"
              formatValue={(v) => `${v.toLocaleString("fr-FR")} kg`}
            />
          )}
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-slate-200/70 bg-white shadow-sm p-5">
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

      <div className="rounded-xl border border-slate-200/70 bg-white shadow-sm p-5">
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

function KpiCard({
  label,
  valeur,
  sousTitre,
  couleur,
  icone,
  petit,
}: {
  label: string;
  valeur: string;
  sousTitre: string;
  couleur: string;
  icone: string;
  petit?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${couleur}`}
        >
          {icone}
        </span>
      </div>
      <p
        className={`font-bold text-navy ${
          petit ? "truncate text-lg" : "text-2xl"
        }`}
        title={valeur}
      >
        {valeur}
      </p>
      <p className="mt-1 text-xs text-slate-400">{sousTitre}</p>
    </div>
  );
}
