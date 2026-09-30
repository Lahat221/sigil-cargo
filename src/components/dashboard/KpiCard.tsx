export function KpiCard({
  label,
  valeur,
  sousTitre,
  couleur,
  icone,
  petit,
  masked,
}: {
  label: string;
  valeur: string;
  sousTitre: string;
  couleur: string;
  icone: string;
  petit?: boolean;
  masked?: boolean;
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
        } ${masked ? "select-none blur-sm" : ""}`}
        title={masked ? undefined : valeur}
      >
        {masked ? "••••••" : valeur}
      </p>
      <p className="mt-1 text-xs text-slate-400">{sousTitre}</p>
    </div>
  );
}
