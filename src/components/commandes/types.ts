import type { StatutCommande } from "@/types/database.types";

export type CommandeListItem = {
  id: string;
  numero: number;
  statut: StatutCommande;
  poids_kg: number | null;
  montant_total: number;
  destination: string | null;
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
  // Versements (montants convertis dans la devise de l'entreprise) — absents sur certaines vues.
  paiements?: { montant_base: number }[] | null;
  // Suivi : colis vérifié à Dakar et dates de passage à chaque étape.
  contenu_verifie?: boolean;
  commandes_historique?: { nouveau_statut: StatutCommande; created_at: string }[] | null;
};
