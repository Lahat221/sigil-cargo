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

export interface Database {
  public: {
    Tables: {
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
          created_at: string;
        };
        Insert: {
          id?: string;
          nom: string;
          message: string;
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
          created_at: string;
        };
        Insert: {
          id?: string;
          campagne_id: string;
          client_id: string;
          envoyee?: boolean;
          envoyee_at?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      statut_commande: StatutCommande;
    };
    CompositeTypes: Record<string, never>;
  };
}
