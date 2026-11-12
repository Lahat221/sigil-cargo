import { BRAND } from "@/lib/brand";
import { formaterAvecEquivalent, resumePaiements } from "@/lib/paiements";
import type { PointRetrait } from "@/lib/parametres";

const poidsFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });
const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BRAND.devise,
});

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
  /** Lien TikTok (module Publicités) : pour ne pas rater le prochain départ. */
  lienTiktok?: string | null;
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

/** « 2 boîtes de thiakry · 14,5 kg » — la description est coupée si elle est longue. */
function ligneContenu(colis: ColisNotif): string | null {
  const description = colis.description?.trim().replace(/\s+/g, " ") ?? "";
  const court = description.length > 90 ? `${description.slice(0, 87).trimEnd()}…` : description;
  const poids = colis.poidsKg !== null ? `${poidsFormatter.format(colis.poidsKg)} kg` : "";
  const contenu = [court, poids].filter(Boolean).join(" · ");
  return contenu ? `📦 ${contenu}` : null;
}

/** Une seule ligne pour le montant et ce qui reste à payer. */
function ligneMontant(colis: ColisNotif): string {
  const paye = colis.montantPaye ?? 0;
  const total = montantFormatter.format(colis.montantTotal);
  if (paye <= 0) return `💰 *${formaterAvecEquivalent(colis.montantTotal)}* à régler au retrait`;
  const resume = resumePaiements(colis.montantTotal, [{ montant_base: paye }]);
  if (resume.reste <= 0) return `💰 *${total}* — entièrement payé ✅`;
  return `💰 *${total}* — déjà réglé ${montantFormatter.format(resume.paye)}, reste *${formaterAvecEquivalent(resume.reste)}* à payer au retrait`;
}

function ligneSuivi(colis: ColisNotif, ctx: ContexteNotif): string | null {
  const site = ctx.siteWeb.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return site ? `🔎 Suivi : https://${site}/suivi (n° *#${colis.numero}* + votre téléphone)` : null;
}

function ligneTiktok(ctx: ContexteNotif): string | null {
  return ctx.lienTiktok ? `🎵 Pour ne pas rater le prochain départ, suivez-nous sur TikTok : ${ctx.lienTiktok}` : null;
}

/** Pour un texte placé entre parenthèses : « Du lundi… » devient « du lundi… » (« 7j/7 » reste tel quel). */
function minuscule(texte: string): string {
  return texte.charAt(0).toLowerCase() + texte.slice(1);
}

function assembler(lignes: (string | null)[]): string {
  return lignes.filter((l): l is string => l !== null).join("\n");
}

/**
 * Notification « colis reçu » : courte, adaptée à la ville de destination
 * (retrait, horaires, reste à payer, suivi). Aucune date annoncée : le colis est
 * remis à son arrivée. Pour les marques sans fret vers la France : message simple.
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
    `Votre colis *#${numero}* est bien arrivé chez nous à ${BRAND.villeDepart}${ville ? `, direction *${ville}*` : ""} ✈️`,
    ligneContenu(colis),
    ligneMontant(colis),
    point
      ? `📍 Retrait à ${point.ville} : ${point.adresse}${point.horaires ? ` (${minuscule(point.horaires)})` : ""}`
      : null,
    ligneSuivi(colis, ctx),
    "Merci pour votre confiance 🙏",
    ligneTiktok(ctx),
    `— ${BRAND.nom}`,
  ]);
}

/**
 * Notification « prêt pour le retrait » : courte, avec l'adresse, les horaires et
 * les options (ex. livraison à domicile) de la ville du colis — Lyon, Paris,
 * Marseille… Sans ville connue, tous les points sont listés.
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
      `📍 ${point.adresse}`,
      point.horaires ? `🕐 ${point.horaires}` : null,
      remarque ? `🚚 ${remarque}` : null,
    ];
  } else if (ville) {
    lieu = [`📍 Nous vous confirmons très vite le lieu de retrait à ${ville}.`];
  } else {
    lieu = pointsConnus(ctx).map((p) => `📍 *${p.ville}* : ${p.adresse}${p.horaires ? ` (${p.horaires})` : ""}`);
  }

  return assembler([
    `Bonjour ${clientNom} 🎉`,
    `Bonne nouvelle, votre colis *#${numero}* est arrivé${ville ? ` à *${ville}*` : ""} et vous attend !`,
    ligneContenu(colis),
    ligneMontant(colis),
    ...lieu,
    "À très vite 🙏",
    ligneTiktok(ctx),
    `— ${BRAND.nom}`,
  ]);
}
