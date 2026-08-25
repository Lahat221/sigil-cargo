import type { LigneVueEnsemble } from "./vueEnsemble";

// Regroupement en grandes sections pour la déclaration douanière — la
// valeur estimée (FCFA) est saisie une seule fois par section, pas ligne
// par ligne (modèle fourni par l'utilisateur). Toute catégorie non listée
// explicitement tombe dans la dernière section ("divers"), donc l'ajout
// d'une nouvelle catégorie de type_produit ne casse rien.
export type DeclarationSection = {
  cle: string;
  nom: string;
  types: string[];
};

// 6 sections au lieu de 3 : l'ancien découpage (alimentaire / vêtements /
// divers) noyait 7 familles de produits aux densités et prix très différents
// (maroquinerie, chaussures, cosmétiques, bijoux, ustensiles...) dans un
// seul bucket "divers" — le module Dédouanement France ne pouvait alors
// ancrer ses estimations que sur 3 sous-totaux réels, forçant une répartition
// à l'aveugle entre des familles très hétérogènes. Chaque section ci-dessous
// correspond à un profil de densité/prix distinct (voir la table de
// coefficients dans promptSysteme.ts, section 6.4).
export const SECTIONS_DECLARATION: DeclarationSection[] = [
  {
    cle: "alimentaire",
    nom: "Alimentaire, plantes & épices",
    types: ["Produit alimentaire", "Épice / Condiment", "Plante séchée"],
  },
  { cle: "vetements", nom: "Vêtements & textile", types: ["Vêtement", "Textile"] },
  { cle: "maroquinerie", nom: "Maroquinerie & chaussures", types: ["Maroquinerie", "Chaussures"] },
  {
    cle: "cosmetiques",
    nom: "Cosmétiques & parfumerie",
    types: ["Produit cosmétique", "Encens"],
  },
  { cle: "bijoux", nom: "Bijoux fantaisie", types: ["Bijoux fantaisie"] },
  { cle: "divers", nom: "Divers, ustensiles & accessoires", types: [] },
];

export function indexSectionPour(typeProduit: string): number {
  for (let i = 0; i < SECTIONS_DECLARATION.length - 1; i++) {
    if (SECTIONS_DECLARATION[i].types.includes(typeProduit)) return i;
  }
  return SECTIONS_DECLARATION.length - 1;
}

export function regrouperParSection(
  lignes: LigneVueEnsemble[]
): { section: DeclarationSection; lignes: LigneVueEnsemble[] }[] {
  const lignesAvecProduit = lignes.filter((l) => l.typeProduit !== null);
  return SECTIONS_DECLARATION.map((section, i) => ({
    section,
    lignes: lignesAvecProduit.filter((l) => indexSectionPour(l.typeProduit!) === i),
  }));
}

/** Somme des poids de colis uniques (un colis présent dans plusieurs
 * sections ne doit être compté qu'une seule fois). */
export function poidsTotalUnique(lignes: LigneVueEnsemble[]): number {
  const vus = new Set<string>();
  let total = 0;
  for (const l of lignes) {
    if (l.typeProduit === null) continue;
    if (!vus.has(l.colisId)) {
      vus.add(l.colisId);
      total += l.poidsKg;
    }
  }
  return total;
}
