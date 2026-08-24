type EntreeHistorique = {
  id: string;
  champ: string;
  ancienne_valeur: string | null;
  nouvelle_valeur: string | null;
  created_at: string;
  profiles: { nom: string } | null;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function HistoriqueExtraction({ entrees }: { entrees: EntreeHistorique[] }) {
  if (entrees.length === 0) {
    return <p className="text-sm text-slate-400">Aucune correction enregistrée.</p>;
  }

  return (
    <ul className="space-y-2 text-sm">
      {entrees.map((e) => (
        <li key={e.id} className="rounded-md bg-slate-50 px-3 py-2">
          <p className="font-medium text-slate-700">{e.champ}</p>
          <p className="text-slate-500">
            {e.ancienne_valeur ?? "—"} → <span className="text-slate-900">{e.nouvelle_valeur ?? "—"}</span>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {e.profiles?.nom ?? "Système"} · {dateFormatter.format(new Date(e.created_at))}
          </p>
        </li>
      ))}
    </ul>
  );
}
