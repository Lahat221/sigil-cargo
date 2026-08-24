import type { StatutExtractionDouane } from "@/types/database.types";

export const STATUT_DOUANE_LABELS: Record<StatutExtractionDouane, string> = {
  non_traite: "Non traité",
  en_cours: "En cours",
  traite: "Traité",
  a_verifier: "À vérifier",
  valide: "Validé",
  erreur: "Erreur",
};

export const STATUT_DOUANE_STYLES: Record<StatutExtractionDouane, string> = {
  non_traite: "bg-slate-100 text-slate-600",
  en_cours: "bg-blue-100 text-blue-700",
  traite: "bg-emerald-100 text-emerald-700",
  a_verifier: "bg-amber-100 text-amber-700",
  valide: "bg-emerald-100 text-emerald-800",
  erreur: "bg-red-100 text-red-700",
};
