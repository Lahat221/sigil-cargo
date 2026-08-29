// Configuration de marque — un déploiement Vercel = un tenant, sélectionné
// via la variable d'environnement NEXT_PUBLIC_BRAND (différente par projet
// Vercel, donc figée au build de chaque déploiement, pas de bascule runtime).
// Chaque tenant a sa propre base Supabase (isolation totale des données) et
// son propre déploiement Vercel avec ce même code — un seul codebase à
// maintenir, les futures fonctionnalités profitent aux deux automatiquement.

export type BrandConfig = {
  slug: string;
  nom: string;
  tagline: string;
  couleurs: {
    navy: string;
    navy2: string;
    navy3: string;
    gold1: string;
    gold2: string;
    muted2: string;
    line: string;
    gradientGoldDe: string;
    gradientGoldMid: string;
    gradientGoldA: string;
    gradientNavyA: string;
    gradientNavyB: string;
    gradientNavyC: string;
  };
  // Le module Dédouanement France (HS parapluie, REX, TVA FR, LTA...) est
  // spécifique aux règles douanières françaises — n'a pas de sens pour un
  // tenant qui ne fait pas de fret vers la France.
  moduleFranceActif: boolean;
  // Chemin dans /public du logo (sidebar/header, remplace le mark SVG
  // dessiné à la main de SIGIL). null tant que le fichier n'est pas fourni
  // — le composant Logo retombe alors sur le texte seul.
  logoImagePath: string | null;
  // Description de la route pour le prompt IA de classification douanière
  // (src/lib/douane/prompt.ts) — influence le contexte que l'IA suppose.
  routeDescription: string;
  // Identité figée sur la déclaration douanière (déclarationXlsx.ts et
  // l'écran Déclaration) — donnée métier réelle, pas juste un habillage.
  identite: {
    expediteurNom: string;
    expediteurAdresse: string;
    expediteurTel: string;
    destinataireNom: string;
    destinataireSiret: string;
    destinataireEori: string;
    destinataireAdresse: string;
    destinataireTel: string;
    destinataireEmail: string;
  };
  // Identité de l'exportateur telle qu'imprimée sur la facture commerciale
  // client (commandes/[id]/facture) — distincte de `identite` : ici c'est
  // l'entité qui VEND la marchandise (ex. COLLE AGRO), pas celle qui
  // transporte/dédouane. Couleurs propres, pas navy/or.
  factureExportateur: {
    nom: string;
    adresse: string;
    ninea: string;
    rex: string;
    email: string;
    couleurPrincipale: string;
    couleurSecondaire: string;
    // Chemins dans /public — null tant que les fichiers du tenant ne sont
    // pas fournis (le composant n'affiche alors pas d'image cassée).
    logoPath: string | null;
    cachetPath: string | null;
  };
};

const SIGIL_CARGO: BrandConfig = {
  slug: "sigil-cargo",
  nom: "SIGIL CARGO",
  tagline: "Rapide · Fiable · Sûre",
  couleurs: {
    navy: "#0A1A33",
    navy2: "#0E2547",
    navy3: "#12326B",
    gold1: "#F3CE63",
    gold2: "#D3A238",
    muted2: "#9FB2CC",
    line: "#223960",
    gradientGoldDe: "#F7D97A",
    gradientGoldMid: "#EBBF52",
    gradientGoldA: "#C9962F",
    gradientNavyA: "#12326B",
    gradientNavyB: "#0E2547",
    gradientNavyC: "#0A1A33",
  },
  moduleFranceActif: true,
  logoImagePath: null,
  routeDescription: "entre le Sénégal et la France",
  identite: {
    expediteurNom: "Aminata MBAYE",
    expediteurAdresse: "Pikine  Djidah Thiaroye, Dakar Senegal",
    expediteurTel: "+221 77 970 49 23  -  +221 77 271 65 25",
    destinataireNom: "Abdou Lahat MBAYE",
    destinataireSiret: "10216746700012",
    destinataireEori: "FR10216746700012",
    destinataireAdresse: "37 Rue Docteur Rollet 69100, Villeurbanne",
    destinataireTel: "+33 06 95 81 11 29",
    destinataireEmail: "lahat221@gmail.com",
  },
  factureExportateur: {
    nom: "AMINATA MBAYE",
    adresse: "Djidah Thiaroye Kao, Dakar, Sénégal",
    ninea: "SN005845493",
    rex: "SNREX1356ASX",
    email: "Binet1801@gmail.com",
    couleurPrincipale: "#3C6E32",
    couleurSecondaire: "#96461E",
    logoPath: "/colle-agro-logo.jpg",
    cachetPath: "/colle-agro-cachet.jpg",
  },
};

// M.N Logistics Cargo — logo reçu le 28/08/2026 (sunburst bronze sur
// triangle navy, "MAWAAHIBOU NAAFIH" en sous-titre du mark). Couleurs
// Palette officielle communiquée par l'utilisateur (identité visuelle du
// logo de référence) — luxe africain contemporain, dominante orange/bronze/
// or, bleu nuit en couleur secondaire (utilisée ici pour les fonds sombres
// de l'interface, cohérent avec "élément métallique bronze/or sur zone bleu
// nuit" décrit dans le brief) :
//   orange doré #D78F33 · brun orangé #A75517 · brun profond #8D3F11
//   bronze #BC6B20 · or/bronze clair #D3AC83 · bleu nuit #202639
//   blanc cassé #E8E6E3 (réservé au monogramme du logo, pas un token UI)
//   gris clair #D7D2CB
// Le slug "ami-chine-dakar" doit correspondre à la valeur de
// NEXT_PUBLIC_BRAND réglée sur son déploiement Vercel. Sens du flux inversé
// par rapport à SIGIL CARGO : expéditeur en Chine, destinataire à Dakar.
const AMI_CHINE_DAKAR: BrandConfig = {
  slug: "ami-chine-dakar",
  nom: "M.N Logistics Cargo",
  tagline: "Rapide · Fiable · Sûre",
  couleurs: {
    navy: "#202639",
    navy2: "#262C42",
    navy3: "#2C3350",
    gold1: "#D78F33",
    gold2: "#A75517",
    muted2: "#D7D2CB",
    line: "#333B54",
    gradientGoldDe: "#D3AC83",
    gradientGoldMid: "#BC6B20",
    gradientGoldA: "#8D3F11",
    gradientNavyA: "#2C3350",
    gradientNavyB: "#262C42",
    gradientNavyC: "#202639",
  },
  moduleFranceActif: false,
  logoImagePath: "/mn-logistics-logo.jpeg",
  routeDescription: "entre la Chine et le Sénégal",
  identite: {
    expediteurNom: "À RENSEIGNER (expéditeur Chine)",
    expediteurAdresse: "À RENSEIGNER",
    expediteurTel: "À RENSEIGNER",
    destinataireNom: "À RENSEIGNER (destinataire Dakar)",
    destinataireSiret: "À RENSEIGNER",
    destinataireEori: "À RENSEIGNER",
    destinataireAdresse: "À RENSEIGNER",
    destinataireTel: "À RENSEIGNER",
    destinataireEmail: "À RENSEIGNER",
  },
  factureExportateur: {
    nom: "À RENSEIGNER",
    adresse: "À RENSEIGNER",
    ninea: "À RENSEIGNER",
    rex: "À RENSEIGNER",
    email: "À RENSEIGNER",
    couleurPrincipale: "#D78F33",
    couleurSecondaire: "#8D3F11",
    logoPath: "/mn-logistics-logo.jpeg",
    cachetPath: null,
  },
};

const BRANDS: Record<string, BrandConfig> = {
  [SIGIL_CARGO.slug]: SIGIL_CARGO,
  [AMI_CHINE_DAKAR.slug]: AMI_CHINE_DAKAR,
};

// .trim() défensif : une valeur Vercel copiée/collée avec un espace ou un
// retour à la ligne invisible ferait échouer silencieusement le lookup et
// retomber sur SIGIL_CARGO sans aucune erreur visible.
const BRAND_SLUG = (process.env.NEXT_PUBLIC_BRAND ?? SIGIL_CARGO.slug).trim();
export const BRAND: BrandConfig = BRANDS[BRAND_SLUG] ?? SIGIL_CARGO;
