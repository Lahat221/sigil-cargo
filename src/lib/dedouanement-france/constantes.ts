// Coordonnées fixes des 3 documents France — mêmes valeurs que le cahier des
// charges (§1.3), déjà utilisées dans les fichiers réels envoyés au
// transitaire (vérifié contre les 3 exemples fournis par l'utilisateur).

export const EXPORTATEUR = {
  raisonSociale: "COLLE AGRO",
  representant: "Aminata MBAYE, Présidente",
  adresse: "Djidah Thiaroye Kao, Dakar, Sénégal",
  telephone: "+221 77 970 49 23",
  email: "binet1801@gmail.com",
  tin: "SN005845493",
  rex: "SNREX1356ASX",
  chapitresRexEligibles: ["04", "08", "09", "10", "11", "12", "19", "20", "21"],
};

export const IMPORTATEUR = {
  nom: "ABDOU LAHAT MBAYE",
  adresse: "37 Rue Docteur Rollet, Bât. C, 69100 Villeurbanne, France",
  siret: "102 167 467 00012",
  eori: "FR10216746700012",
  tvaIntracom: "FR 67 102 167 467",
  telephone: "+33 06 95 81 11 29",
  email: "lahat221@gmail.com",
};

export const TRANSPORT_DEFAUT = {
  transporteur: "AIR SENEGAL SA",
  agentIata: "EUROWORLD CARGO & AIR FREIGHT (Dakar)",
  itineraire: "DAKAR (DSS) → PARIS (CDG) → LYON (LYS)",
  vol: "HC403",
  incoterm: "DAP Villeurbanne",
  devise: "XOF",
  tauxChangeXofEur: 655.957,
};

export const TRANSITAIRE = {
  nom: "PARTNAIR & SEA",
  agrement: "00006609",
  lieu: "Lyon Saint-Exupéry",
  contact: "Clément RENIAUT",
};

// Ordre des sections à respecter dans les 3 fichiers (§5.2 du cahier des charges).
export const SECTION_ORDER: { cle: string; label: string; couleur: "GREEN" | "GREY" }[] = [
  { cle: "AGRO_REX", label: "AGROALIMENTAIRE — REX préf. 200 (droit 0 %)", couleur: "GREEN" },
  { cle: "AGRO_NREX", label: "AGRO HORS REX (préf. 100)", couleur: "GREY" },
  { cle: "VETEMENTS", label: "VÊTEMENTS (préf. 100)", couleur: "GREY" },
  { cle: "TEXTILES", label: "TEXTILES / LINGE (préf. 100)", couleur: "GREY" },
  { cle: "MAROQ", label: "MAROQUINERIE / SACS (préf. 100)", couleur: "GREY" },
  { cle: "CHAUSSURES", label: "CHAUSSURES (préf. 100)", couleur: "GREY" },
  { cle: "PARFUMERIE", label: "PARFUMERIE / COSMÉTIQUES (préf. 100)", couleur: "GREY" },
  { cle: "ACCESSOIRES", label: "ACCESSOIRES / DIVERS (préf. 100)", couleur: "GREY" },
  { cle: "USTENSILES", label: "USTENSILES (préf. 100)", couleur: "GREY" },
  { cle: "BIJOUX", label: "BIJOUX FANTAISIE (préf. 100)", couleur: "GREY" },
  { cle: "COIFFURE", label: "COIFFURE / POSTICHES (préf. 100)", couleur: "GREY" },
];
