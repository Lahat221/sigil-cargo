import type { StatutCommande } from "@/types/database.types";
import type { VerifPrix } from "@/lib/commandes/verifPrix";

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
  nombre_paquets?: number | null;
  // Prix au kilo appliqué et contrôle par rapport au tarif attendu.
  prix_par_kg?: number | null;
  alimentaire?: boolean | null;
  mode_fret?: "aerien" | "conteneur" | null;
  verif_prix?: VerifPrix;
  client_id?: string | null;
  commandes_historique?: { nouveau_statut: StatutCommande; created_at: string }[] | null;
};
