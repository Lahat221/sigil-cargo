import type { StatutCommande } from "@/types/database.types";

export type CommandeListItem = {
  id: string;
  numero: number;
  statut: StatutCommande;
  poids_kg: number;
  montant_total: number;
  created_at: string;
  clients: { nom: string; telephone: string | null } | null;
  projets: { nom: string } | null;
};
