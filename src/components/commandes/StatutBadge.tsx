import type { StatutCommande } from "@/types/database.types";
import { STATUT_LABELS, STYLES_STATUT, libelleStatut } from "@/lib/commandes/statuts";

// Les libellés et le parcours vivent dans src/lib/commandes/statuts.ts ;
// ré-exporté ici car beaucoup d'écrans importent STATUT_LABELS d'ici.
export { STATUT_LABELS };

export function StatutBadge({
  statut,
  destination,
}: {
  statut: StatutCommande;
  /** Ville de destination du colis : « Arrivé à Lyon » plutôt que « Arrivé à destination ». */
  destination?: string | null;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES_STATUT[statut]}`}
    >
      {libelleStatut(statut, destination)}
    </span>
  );
}
