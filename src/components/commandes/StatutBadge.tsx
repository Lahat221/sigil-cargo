import type { StatutCommande } from "@/types/database.types";

export const STATUT_LABELS: Record<StatutCommande, string> = {
  recue: "Reçue",
  a_preparer: "À préparer",
  en_preparation: "En préparation",
  prete: "Prête",
  expediee: "Expédiée",
  livree: "Livrée",
  annulee: "Annulée",
};

const STATUT_STYLES: Record<StatutCommande, string> = {
  recue: "bg-slate-100 text-slate-700",
  a_preparer: "bg-amber-100 text-amber-800",
  en_preparation: "bg-blue-100 text-blue-800",
  prete: "bg-purple-100 text-purple-800",
  expediee: "bg-indigo-100 text-indigo-800",
  livree: "bg-green-100 text-green-800",
  annulee: "bg-red-100 text-red-800",
};

export function StatutBadge({ statut }: { statut: StatutCommande }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUT_STYLES[statut]}`}
    >
      {STATUT_LABELS[statut]}
    </span>
  );
}
