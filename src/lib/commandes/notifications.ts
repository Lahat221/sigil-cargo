import { BRAND } from "@/lib/brand";
import { formaterAvecEquivalent, resumePaiements } from "@/lib/paiements";
import type { PointRetrait } from "@/lib/parametres";

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BRAND.devise,
});
const poidsFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

export type ColisNotif = {
  clientNom: string;
  numero: number;
  /** Ville de destination du colis (Lyon, Paris, Marseille…) : sert à choisir le point de retrait. */
  destination: string | null;
  description: string | null;
  poidsKg: number | null;
  montantTotal: number;
  /** Déjà encaissé (devise de l'entreprise). */
  montantPaye?: number;
};

export type ContexteNotif = {
  /** Points de retrait saisis dans Paramètres → Site (une ville par ligne). */
  pointsRetrait: PointRetrait[];
  /** Adresse du site (ex. www.sigilcargo.com), pour le lien de suivi. */
  siteWeb: string;
};

function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/** Points de retrait connus : ceux des paramètres, à défaut celui de la marque. */
function pointsConnus(ctx: ContexteNotif): PointRetrait[] {
  if (ctx.pointsRetrait.length > 0) return ctx.pointsRetrait;
  if (!BRAND.retrait) return [];
  return [
    {
      ville: BRAND.retrait.villeLivraison,
      adresse: BRAND.retrait.adresse,
      horaires: BRAND.retrait.horaires,
      remarque: BRAND.retrait.livraisonDomicile,
    },
  ];
}

/** Point de retrait de la ville du colis (null si la ville est inconnue ou sans point de retrait). */
export function pointRetraitPour(destination: string | null, ctx: ContexteNotif): PointRetrait | null {
  if (!destination?.trim()) return null;
  const cible = normaliser(destination);
  return pointsConnus(ctx).find((p) => normaliser(p.ville) === cible) ?? null;
}

/** Remarque du point (ex. livraison à domicile) ; celle de la marque ne vaut que pour sa propre ville. */
function remarqueDuPoint(point: PointRetrait): string {
  if (point.remarque) return point.remarque;
  if (BRAND.retrait && normaliser(point.ville) === normaliser(BRAND.retrait.villeLivraison)) {
    return BRAND.retrait.livraisonDomicile;
  }
  return "";
}

function lignesColis(colis: ColisNotif): (string | null)[] {
  return [
    colis.description?.trim() ? `📦 *Contenu :* ${colis.description.trim()}` : null,
    colis.poidsKg !== null ? `⚖️ *Poids :* ${poidsFormatter.format(colis.poidsKg)} kg` : null,
    `💰 *Montant :* ${montantFormatter.format(colis.montantTotal)}`,
  ];
}

function lignesPaiement(colis: ColisNotif, aLaRemise: boolean): (string | null)[] {
  const paye = colis.montantPaye ?? 0;
  const resume = resumePaiements(colis.montantTotal, paye > 0 ? [{ montant_base: paye }] : []);
  if (paye <= 0) {
    return [
      aLaRemise
        ? `🧾 *À régler au retrait :* ${formaterAvecEquivalent(colis.montantTotal)}`
        : "🧾 Le montant se règle au retrait du colis.",
    ];
  }
  return [
    `✅ *Déjà réglé :* ${montantFormatter.format(resume.paye)}`,
    resume.reste > 0
      ? `🧾 *Reste à payer au retrait :* ${formaterAvecEquivalent(resume.reste)}`
      : "🧾 Votre colis est entièrement payé, rien à régler au retrait.",
  ];
}

function lienSuivi(colis: ColisNotif, ctx: ContexteNotif): (string | null)[] {
  const site = ctx.siteWeb.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!site) return [null];
  return [`🔎 *Suivre votre colis :* https://${site}/suivi`, `(numéro *#${colis.numero}* + votre numéro de téléphone)`];
}

function assembler(lignes: (string | null)[]): string {
  const gardees = lignes.filter((l): l is string => l !== null);
  // Un bloc absent (point de retrait, lien de suivi) ne doit pas laisser deux lignes vides de suite.
  return gardees.filter((l, i) => !(l === "" && (i === 0 || gardees[i - 1] === ""))).join("\n");
}

/**
 * Notification « colis reçu » : confirme la réception à Dakar et annonce la
 * ville d'arrivée, ce qui reste à payer, où retirer le colis et comment le
 * suivre. Aucune date annoncée : le colis est remis quand il arrive. Pour les marques sans fret vers la France : message simple.
 */
export function construireNotifCommande(colis: ColisNotif, ctx: ContexteNotif): string {
  const { clientNom, numero } = colis;
  if (!BRAND.moduleFranceActif) {
    const poids = colis.poidsKg !== null ? `${poidsFormatter.format(colis.poidsKg)} kg, ` : "";
    const contenu = colis.description?.trim() ? ` : ${colis.description.trim()}` : "";
    return `Bonjour ${clientNom}, nous avons bien reçu votre colis #${numero} chez ${BRAND.nom} (${poids}${montantFormatter.format(colis.montantTotal)})${contenu}. Merci !`;
  }

  const point = pointRetraitPour(colis.destination, ctx);
  const ville = point?.ville ?? (colis.destination?.trim() || null);
  return assembler([
    `Bonjour ${clientNom} 👋`,
    "",
    `Nous avons bien reçu votre colis *#${numero}* à ${BRAND.villeDepart}${ville ? `, à destination de *${ville}*` : ""}. ✅`,
    "",
    ...lignesColis(colis),
    ...lignesPaiement(colis, false),
    point ? "" : null,
    point ? `📍 *Retrait à ${point.ville} :*` : null,
    point?.adresse ?? null,
    point?.horaires ? `🕐 *Horaires :* ${point.horaires}` : null,
    "",
    ...lienSuivi(colis, ctx),
    "",
    "Merci de votre confiance ! 🙏",
    BRAND.nom,
  ]);
}

/**
 * Notification « prêt pour le retrait » : l'adresse, les horaires et les options
 * (ex. livraison à domicile) sont ceux de la ville du colis — Lyon, Paris,
 * Marseille… — avec le reste à payer. Sans ville connue, tous les points sont listés.
 */
export function construireNotifRetrait(colis: ColisNotif, ctx: ContexteNotif): string {
  const { clientNom, numero } = colis;
  if (!BRAND.moduleFranceActif) {
    return `Bonjour ${clientNom}, votre colis #${numero} est prêt pour le retrait chez ${BRAND.nom}. À bientôt !`;
  }

  const point = pointRetraitPour(colis.destination, ctx);
  const ville = point?.ville ?? (colis.destination?.trim() || null);

  let lieu: (string | null)[];
  if (point) {
    const remarque = remarqueDuPoint(point);
    lieu = [
      `📍 *Où retirer votre colis (${point.ville}) :*`,
      point.adresse,
      point.horaires ? `🕐 *Horaires :* ${point.horaires}` : null,
      remarque ? "" : null,
      remarque ? `🚚 ${remarque}` : null,
    ];
  } else if (ville) {
    lieu = [`📍 Nous vous confirmons très vite le lieu de retrait à ${ville}.`];
  } else {
    const points = pointsConnus(ctx);
    lieu =
      points.length > 0
        ? [
            "📍 *Nos points de retrait :*",
            ...points.map((p) => `• *${p.ville}* : ${p.adresse}${p.horaires ? ` (${p.horaires})` : ""}`),
          ]
        : [];
  }

  return assembler([
    `Bonjour ${clientNom} 🎉`,
    "",
    `Bonne nouvelle : votre colis *#${numero}* est arrivé${ville ? ` à *${ville}*` : ""} et prêt pour le retrait !`,
    "",
    ...lignesColis(colis),
    ...lignesPaiement(colis, true),
    "",
    ...lieu,
    "",
    "Merci de votre confiance ! 🙏",
    BRAND.nom,
  ]);
}
