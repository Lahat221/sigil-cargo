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
  // Code devise ISO 4217 utilisé par Intl.NumberFormat pour tous les
  // montants (devis, commandes, factures) — SIGIL CARGO facture en euros
  // (destination France), M.N Logistics Cargo en franc CFA (Sénégal).
  devise: string;
  // Le module "groupage conteneur" (tarification au m³, en plus du fret
  // aérien classique tarifé au kg) n'a de sens que pour un tenant qui fait
  // du fret maritime/groupage — désactivé par défaut.
  modeGroupageConteneurActif: boolean;
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
    // Fond de la zone de contenu du tableau de bord (distinct de la
    // sidebar, qui reste toujours navy-gradient) + couleur du texte
    // "principal" sur ce fond. Par défaut = mêmes valeurs que le navy
    // (thème sombre inchangé) ; un tenant à fond de page clair (ex. M.N
    // Logistics Cargo) les surcharge.
    pageGradientA: string;
    pageGradientB: string;
    pageGradientC: string;
    ink: string;
    inkMuted: string;
    inkOverlay: string;
    // Fond de la barre de menu mobile (bas d'écran, cf. Sidebar.tsx
    // MobileTabBar) — doit être une couleur PLEINE (jamais transparente),
    // le composant est fixed par-dessus du contenu qui peut être blanc
    // (cartes) juste en dessous. Distinct du reste du thème mobile pour
    // rester bien visible/identifiable sur tous les fonds.
    mobileNavBg: string;
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
  // Infos de retrait colis (bouton "Notif retrait" — WhatsApp perso, cf.
  // commandes/[id]/page.tsx) : adresse/horaires du point de retrait physique
  // + l'option livraison à domicile si le tenant la propose. null tant
  // qu'un tenant n'a pas de point de retrait fixe configuré — le bouton ne
  // s'affiche alors pas.
  retrait: {
    adresse: string;
    horaires: string;
    livraisonDomicile: string;
  } | null;
};

const SIGIL_CARGO: BrandConfig = {
  slug: "sigil-cargo",
  nom: "SIGIL CARGO",
  tagline: "Rapide · Fiable · Sûre",
  devise: "EUR",
  modeGroupageConteneurActif: false,
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
    pageGradientA: "#12326B",
    pageGradientB: "#0E2547",
    pageGradientC: "#0A1A33",
    ink: "#FFFFFF",
    inkMuted: "#FFFFFF99",
    inkOverlay: "#FFFFFF1A",
    mobileNavBg: "#0E2547",
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
  retrait: {
    adresse: "2 rue Jean Baptiste Croibier, Vénissieux",
    horaires: "17h à 20h30",
    livraisonDomicile: "Livraison à domicile disponible sur Lyon : 14 €",
  },
};

// M.N Logistics Cargo — logo reçu le 28/08/2026 (sunburst bronze sur
// triangle navy, "MAWAAHIBOU NAAFIH" en sous-titre du mark). Palette
// affinée par rapport au brief initial (l'utilisateur a laissé le choix
// final) : même famille de couleurs (bleu nuit secondaire, dominante
// or/bronze) mais un fond de page ivoire/champagne très doux plutôt qu'un
// aplat orange saturé — plus "premium élégant", moins "orange soupe" — et
// un texte en brun foncé nuancé plutôt que noir pur.
//   orange doré #D78F33 · brun orangé #A75517 · brun profond #8D3F11
//   bronze #BC6B20 · or/bronze clair #D3AC83 · bleu nuit #202639
//   blanc cassé #E8E6E3 (réservé au monogramme du logo, pas un token UI)
// Le slug "ami-chine-dakar" doit correspondre à la valeur de
// NEXT_PUBLIC_BRAND réglée sur son déploiement Vercel. Sens du flux inversé
// par rapport à SIGIL CARGO : expéditeur en Chine, destinataire à Dakar.
const AMI_CHINE_DAKAR: BrandConfig = {
  slug: "ami-chine-dakar",
  nom: "M.N Logistics Cargo",
  tagline: "Rapide · Fiable · Sûre",
  devise: "XOF",
  modeGroupageConteneurActif: true,
  couleurs: {
    navy: "#202639",
    navy2: "#262C42",
    navy3: "#2C3350",
    gold1: "#D78F33",
    gold2: "#BC6B20",
    muted2: "#D7D2CB",
    line: "#333B54",
    gradientGoldDe: "#D3AC83",
    gradientGoldMid: "#BC6B20",
    gradientGoldA: "#8D3F11",
    gradientNavyA: "#2C3350",
    gradientNavyB: "#262C42",
    gradientNavyC: "#202639",
    // Fond de page orange foncé, dans l'esprit du dégradé du logo lui-même
    // (amber en haut, brun profond vers les bords). Texte en blanc cassé
    // (même ton que le monogramme du logo, #E8E6E3) pour rester lisible sur
    // ce fond sombre. La sidebar reste bleu nuit (gradientNavyA/B/C
    // ci-dessus, inchangés).
    pageGradientA: "#E8A857",
    pageGradientB: "#C97D2E",
    pageGradientC: "#8D3F11",
    ink: "#E8E6E3",
    inkMuted: "#E8E6E3B3",
    inkOverlay: "#E8E6E31A",
    // Bande pleine (pas de transparence) pour la barre de menu mobile —
    // brun-orangé profond de la palette officielle, bien distincte du fond
    // de page (clair) et du reste de l'app (demande explicite : rendre la
    // barre visible en bas d'écran, elle passait inaperçue en navy sur fond
    // blanc).
    mobileNavBg: "#8D3F11",
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
  // Pas de point de retrait physique connu pour M.N pour l'instant — le
  // bouton "Notif retrait (WhatsApp perso)" ne s'affiche donc pas. À
  // renseigner si besoin plus tard.
  retrait: null,
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
