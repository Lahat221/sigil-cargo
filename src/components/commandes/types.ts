import type { StatutCommande } from "@/types/database.types";

export type CommandeListItem = {
  id: string;
  numero: number;
  statut: StatutCommande;
  poids_kg: number | null;
  montant_total: number;
  description: string | null;
  video_urls: string[] | null;
  code_barre_colis: string | null;
  created_at: string;
  clients: {
    nom: string;
    telephone: string | null;
    telephone_pays: string | null;
    adresse: string | null;
  } | null;
  projets: { nom: string } | null;
};
