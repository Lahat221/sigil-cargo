type Stats = {
  total: number;
  nonTraite: number;
  enCours: number;
  traite: number;
  aVerifier: number;
  valide: number;
  erreur: number;
  hsIncertain: number;
  produitsRetires: number;
};

function Carte({
  label,
  valeur,
  couleur,
}: {
  label: string;
  valeur: number;
  couleur: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${couleur}`}>{valeur}</p>
    </div>
  );
}

export function DouaneStatsCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Carte label="Total colis" valeur={stats.total} couleur="text-navy" />
      <Carte label="Non traités" valeur={stats.nonTraite} couleur="text-slate-500" />
      <Carte label="En cours" valeur={stats.enCours} couleur="text-blue-600" />
      <Carte label="Traités" valeur={stats.traite} couleur="text-emerald-600" />
      <Carte label="À vérifier" valeur={stats.aVerifier} couleur="text-amber-600" />
      <Carte label="Validés" valeur={stats.valide} couleur="text-emerald-700" />
      <Carte label="Erreurs" valeur={stats.erreur} couleur="text-red-600" />
      <Carte label="HS incertains" valeur={stats.hsIncertain} couleur="text-amber-600" />
      <Carte label="Produits retirés" valeur={stats.produitsRetires} couleur="text-slate-500" />
    </div>
  );
}
