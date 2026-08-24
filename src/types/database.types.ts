// Types générés manuellement à partir de schema_supabase_commandes.sql.
// À remplacer par `npm run gen:types` une fois le projet Supabase créé
// (voir README pour la commande exacte avec le project-ref).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StatutCommande =
  | "recue"
  | "a_preparer"
  | "en_preparation"
  | "prete"
  | "expediee"
  | "livree"
  | "annulee";

export type RoleUtilisateur = "admin" | "agent";

export type StatutExtractionDouane =
  | "non_traite"
  | "en_cours"
  | "traite"
  | "a_verifier"
  | "valide"
  | "erreur";

export type HsStatus = "confirme" | "propose" | "a_verifier";
export type HsCodeSource = "referentiel" | "ia" | "utilisateur";
export type StatutProduitDouane = "a_valider" | "valide";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nom: string;
          email: string;
          role: RoleUtilisateur;
          modules_autorises: string[];
          created_at: string;
        };
        Insert: {
          id: string;
          nom: string;
          email: string;
          role?: RoleUtilisateur;
          modules_autorises?: string[];
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          nom: string;
          telephone: string | null;
          telephone_pays: string | null;
          adresse: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          telephone?: string | null;
          telephone_pays?: string | null;
          adresse?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["clients"]["Insert"]>;
        Relationships: [];
      };
      projets: {
        Row: {
          id: string;
          nom: string;
          date_depart: string | null;
          date_arrivee: string | null;
          statut: "actif" | "clos" | "annule";
          created_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          date_depart?: string | null;
          date_arrivee?: string | null;
          statut?: "actif" | "clos" | "annule";
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projets"]["Insert"]>;
        Relationships: [];
      };
      produits: {
        Row: {
          id: string;
          nom: string;
          prix_par_kg: number;
          sku: string | null;
          code_barre: string | null;
          actif: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          prix_par_kg: number;
          sku?: string | null;
          code_barre?: string | null;
          actif?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["produits"]["Insert"]>;
        Relationships: [];
      };
      commandes: {
        Row: {
          id: string;
          numero: number;
          client_id: string;
          projet_id: string;
          produit_id: string;
          poids_kg: number;
          prix_par_kg: number;
          enveloppe: boolean;
          nombre_paquets: number;
          montant_total: number;
          statut: StatutCommande;
          paye: boolean;
          adresse_livraison: string | null;
          description: string | null;
          remarque_interne: string | null;
          code_barre_colis: string | null;
          pesee_faite: boolean;
          emballage_fait: boolean;
          etiquette_collee: boolean;
          photo_urls: string[] | null;
          video_url: string | null;
          video_urls: string[] | null;
          note_vocale_url: string | null;
          date_livraison_prevue: string | null;
          date_livraison_reelle: string | null;
          preuve_livraison_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          numero?: number;
          client_id: string;
          projet_id: string;
          produit_id: string;
          poids_kg: number;
          prix_par_kg: number;
          enveloppe?: boolean;
          nombre_paquets?: number;
          statut?: StatutCommande;
          paye?: boolean;
          adresse_livraison?: string | null;
          description?: string | null;
          remarque_interne?: string | null;
          code_barre_colis?: string | null;
          pesee_faite?: boolean;
          emballage_fait?: boolean;
          etiquette_collee?: boolean;
          photo_urls?: string[] | null;
          video_url?: string | null;
          video_urls?: string[] | null;
          note_vocale_url?: string | null;
          date_livraison_prevue?: string | null;
          date_livraison_reelle?: string | null;
          preuve_livraison_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["commandes"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "commandes_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commandes_projet_id_fkey";
            columns: ["projet_id"];
            referencedRelation: "projets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commandes_produit_id_fkey";
            columns: ["produit_id"];
            referencedRelation: "produits";
            referencedColumns: ["id"];
          }
        ];
      };
      commandes_historique: {
        Row: {
          id: string;
          commande_id: string | null;
          ancien_statut: StatutCommande | null;
          nouveau_statut: StatutCommande;
          notif_envoyee: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          commande_id?: string | null;
          ancien_statut?: StatutCommande | null;
          nouveau_statut: StatutCommande;
          notif_envoyee?: boolean;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["commandes_historique"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "commandes_historique_commande_id_fkey";
            columns: ["commande_id"];
            referencedRelation: "commandes";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications_a_envoyer: {
        Row: {
          id: string;
          commande_id: string | null;
          canal: string;
          statut_commande: StatutCommande;
          destinataire_telephone: string | null;
          envoyee: boolean;
          envoyee_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          commande_id?: string | null;
          canal?: string;
          statut_commande: StatutCommande;
          destinataire_telephone?: string | null;
          envoyee?: boolean;
          envoyee_at?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["notifications_a_envoyer"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "notifications_a_envoyer_commande_id_fkey";
            columns: ["commande_id"];
            referencedRelation: "commandes";
            referencedColumns: ["id"];
          }
        ];
      };
      charges: {
        Row: {
          id: string;
          projet_id: string;
          libelle: string;
          montant: number;
          categorie: string | null;
          date_charge: string;
          facture_url: string | null;
          remarque: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          libelle: string;
          montant: number;
          categorie?: string | null;
          date_charge?: string;
          facture_url?: string | null;
          remarque?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["charges"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "charges_projet_id_fkey";
            columns: ["projet_id"];
            referencedRelation: "projets";
            referencedColumns: ["id"];
          }
        ];
      };
      campagnes_whatsapp: {
        Row: {
          id: string;
          nom: string;
          message: string;
          image_url: string | null;
          content_sid: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          message: string;
          image_url?: string | null;
          content_sid?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["campagnes_whatsapp"]["Insert"]
        >;
        Relationships: [];
      };
      campagnes_whatsapp_destinataires: {
        Row: {
          id: string;
          campagne_id: string;
          client_id: string;
          envoyee: boolean;
          envoyee_at: string | null;
          erreur: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campagne_id: string;
          client_id: string;
          envoyee?: boolean;
          envoyee_at?: string | null;
          erreur?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["campagnes_whatsapp_destinataires"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "campagnes_whatsapp_destinataires_campagne_id_fkey";
            columns: ["campagne_id"];
            referencedRelation: "campagnes_whatsapp";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campagnes_whatsapp_destinataires_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      whatsapp_messages: {
        Row: {
          id: string;
          client_id: string | null;
          telephone: string;
          direction: "in" | "out";
          body: string | null;
          message_sid: string | null;
          media_url: string | null;
          media_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id?: string | null;
          telephone: string;
          direction: "in" | "out";
          body?: string | null;
          message_sid?: string | null;
          media_url?: string | null;
          media_type?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["whatsapp_messages"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "clients";
            referencedColumns: ["id"];
          }
        ];
      };
      whatsapp_relay_state: {
        Row: {
          id: number;
          client_telephone: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          client_telephone?: string | null;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["whatsapp_relay_state"]["Insert"]
        >;
        Relationships: [];
      };
      douane_extractions: {
        Row: {
          id: string;
          commande_id: string;
          statut: StatutExtractionDouane;
          version: number;
          raw_description: string;
          poids_total: number;
          client_nom: string | null;
          client_telephone: string | null;
          anomalies: Json;
          modele: string | null;
          prompt_version: string | null;
          erreur: string | null;
          valide_par: string | null;
          valide_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          commande_id: string;
          statut?: StatutExtractionDouane;
          version?: number;
          raw_description: string;
          poids_total: number;
          client_nom?: string | null;
          client_telephone?: string | null;
          anomalies?: Json;
          modele?: string | null;
          prompt_version?: string | null;
          erreur?: string | null;
          valide_par?: string | null;
          valide_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["douane_extractions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "douane_extractions_commande_id_fkey";
            columns: ["commande_id"];
            referencedRelation: "commandes";
            referencedColumns: ["id"];
          }
        ];
      };
      douane_produits: {
        Row: {
          id: string;
          extraction_id: string;
          type_produit: string;
          description_douane: string;
          hs_code: string | null;
          hs_status: HsStatus;
          hs_code_source: HsCodeSource;
          description_produit: string;
          quantite: number;
          unite: string;
          confiance: number | null;
          statut: StatutProduitDouane;
          ordre: number;
          exclu_declaration_france: boolean;
          raison_exclusion_france: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          extraction_id: string;
          type_produit: string;
          description_douane: string;
          hs_code?: string | null;
          hs_status?: HsStatus;
          hs_code_source?: HsCodeSource;
          description_produit: string;
          quantite?: number;
          unite?: string;
          confiance?: number | null;
          statut?: StatutProduitDouane;
          ordre?: number;
          exclu_declaration_france?: boolean;
          raison_exclusion_france?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["douane_produits"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "douane_produits_extraction_id_fkey";
            columns: ["extraction_id"];
            referencedRelation: "douane_extractions";
            referencedColumns: ["id"];
          }
        ];
      };
      douane_produits_retires: {
        Row: {
          id: string;
          extraction_id: string;
          description: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          extraction_id: string;
          description: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["douane_produits_retires"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "douane_produits_retires_extraction_id_fkey";
            columns: ["extraction_id"];
            referencedRelation: "douane_extractions";
            referencedColumns: ["id"];
          }
        ];
      };
      douane_historique: {
        Row: {
          id: string;
          produit_id: string | null;
          extraction_id: string;
          champ: string;
          ancienne_valeur: string | null;
          nouvelle_valeur: string | null;
          modifie_par: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          produit_id?: string | null;
          extraction_id: string;
          champ: string;
          ancienne_valeur?: string | null;
          nouvelle_valeur?: string | null;
          modifie_par?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["douane_historique"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "douane_historique_extraction_id_fkey";
            columns: ["extraction_id"];
            referencedRelation: "douane_extractions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "douane_historique_produit_id_fkey";
            columns: ["produit_id"];
            referencedRelation: "douane_produits";
            referencedColumns: ["id"];
          }
        ];
      };
      douane_produits_referentiel: {
        Row: {
          id: string;
          nom_local: string;
          nom_normalise: string;
          type_produit: string;
          description_douane: string;
          hs_code: string | null;
          synonymes: string[];
          actif: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nom_local: string;
          nom_normalise: string;
          type_produit: string;
          description_douane: string;
          hs_code?: string | null;
          synonymes?: string[];
          actif?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["douane_produits_referentiel"]["Insert"]
        >;
        Relationships: [];
      };
      douane_logs: {
        Row: {
          id: string;
          extraction_id: string | null;
          commande_id: string | null;
          modele: string;
          prompt_version: string | null;
          duree_ms: number | null;
          statut: string;
          erreur: string | null;
          tokens_entree: number | null;
          tokens_sortie: number | null;
          cout_estime_usd: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          extraction_id?: string | null;
          commande_id?: string | null;
          modele: string;
          prompt_version?: string | null;
          duree_ms?: number | null;
          statut: string;
          erreur?: string | null;
          tokens_entree?: number | null;
          tokens_sortie?: number | null;
          cout_estime_usd?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["douane_logs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "douane_logs_commande_id_fkey";
            columns: ["commande_id"];
            referencedRelation: "commandes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "douane_logs_extraction_id_fkey";
            columns: ["extraction_id"];
            referencedRelation: "douane_extractions";
            referencedColumns: ["id"];
          }
        ];
      };
      douane_declaration_valeurs: {
        Row: {
          id: string;
          projet_id: string;
          section: string;
          montant_fcfa: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          section: string;
          montant_fcfa?: number | null;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["douane_declaration_valeurs"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "douane_declaration_valeurs_projet_id_fkey";
            columns: ["projet_id"];
            referencedRelation: "projets";
            referencedColumns: ["id"];
          }
        ];
      };
      douane_expeditions_france: {
        Row: {
          id: string;
          projet_id: string;
          mawb: string | null;
          date_vol: string | null;
          poids_brut_lta_kg: number | null;
          nombre_colis: number;
          dimensions: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          projet_id: string;
          mawb?: string | null;
          date_vol?: string | null;
          poids_brut_lta_kg?: number | null;
          nombre_colis?: number;
          dimensions?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["douane_expeditions_france"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "douane_expeditions_france_projet_id_fkey";
            columns: ["projet_id"];
            referencedRelation: "projets";
            referencedColumns: ["id"];
          }
        ];
      };
      douane_declarations_france: {
        Row: {
          id: string;
          expedition_id: string;
          version: number;
          statut: "genere" | "erreur";
          reponse_json: Json | null;
          modele: string | null;
          prompt_version: string | null;
          tokens_entree: number | null;
          tokens_sortie: number | null;
          cout_estime_usd: number | null;
          erreur: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          expedition_id: string;
          version?: number;
          statut?: "genere" | "erreur";
          reponse_json?: Json | null;
          modele?: string | null;
          prompt_version?: string | null;
          tokens_entree?: number | null;
          tokens_sortie?: number | null;
          cout_estime_usd?: number | null;
          erreur?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["douane_declarations_france"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "douane_declarations_france_expedition_id_fkey";
            columns: ["expedition_id"];
            referencedRelation: "douane_expeditions_france";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      statut_commande: StatutCommande;
    };
    CompositeTypes: Record<string, never>;
  };
}
