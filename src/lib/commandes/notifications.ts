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
  /** Lien TikTok (module Publicités) : pour ne pas rater le prochain départ. */
  lienTiktok?: string | null;
};

const SEPARATEUR = "┈┈┈┈┈┈┈┈┈┈┈┈┈┈";

function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Points de retrait connus. Les adresses exactes de la marque (lib/brand.ts) font foi
 * pour leurs villes ; les villes que seul Paramètres → Site connaît s'y ajoutent.
 */
function pointsConnus(ctx: ContexteNotif): PointRetrait[] {
  const marque = BRAND.retrait?.points ?? [];
  const villesMarque = new Set(marque.map((p) => normaliser(p.ville)));
  return [...marque, ...ctx.pointsRetrait.filter((p) => !villesMarque.has(normaliser(p.ville)))];
}

/** Point de retrait de la ville du colis (null si la ville est inconnue ou sans point de retrait). */
export function pointRetraitPour(destination: string | null, ctx: ContexteNotif): PointRetrait | null {
  if (!destination?.trim()) return null;
  const cible = normaliser(destination);
  return pointsConnus(ctx).find((p) => normaliser(p.ville) === cible) ?? null;
}

/** « 2 boîtes de thiakry · 14,5 kg » — la description est coupée si elle est longue. */
function ligneContenu(colis: ColisNotif): string | null {
  const description = colis.description?.trim().replace(/\s+/g, " ") ?? "";
  const court = description.length > 90 ? `${description.slice(0, 87).trimEnd()}…` : description;
  const poids = colis.poidsKg !== null ? `${poidsFormatter.format(colis.poidsKg)} kg` : "";
  const contenu = [court, poids].filter(Boolean).join(" · ");
  return contenu ? `📦 ${contenu}` : null;
}

/** Montant, déjà réglé et reste à payer (une ou deux lignes). */
function lignesMontant(colis: ColisNotif): string[] {
  const paye = colis.montantPaye ?? 0;
  const total = montantFormatter.format(colis.montantTotal);
  if (paye <= 0) return [`💰 *${formaterAvecEquivalent(colis.montantTotal)}* à régler au retrait`];
  const resume = resumePaiements(colis.montantTotal, [{ montant_base: paye }]);
  if (resume.reste <= 0) return [`💰 *${total}* — entièrement payé ✅`];
  return [
    `💰 *${total}* — déjà réglé ${montantFormatter.format(resume.paye)} ✅`,
    `🧾 Reste à payer au retrait : *${formaterAvecEquivalent(resume.reste)}*`,
  ];
}

/** Bloc encadré : contenu du colis et montants. */
function blocColis(colis: ColisNotif): string[] {
  const contenu = ligneContenu(colis);
  return [SEPARATEUR, ...(contenu ? [contenu] : []), ...lignesMontant(colis), SEPARATEUR];
}

/** Pied de message : TikTok (pour ne pas rater le prochain départ) et signature de la marque. */
function piedDeMessage(ctx: ContexteNotif): string[] {
  return [
    ...(ctx.lienTiktok
      ? ["", "🎵 *Ne ratez pas le prochain départ !*", `Suivez-nous sur TikTok 👉 ${ctx.lienTiktok}`]
      : []),
    "",
    `_${BRAND.nom} — ${BRAND.tagline}_`,
  ];
}

function assembler(lignes: (string | null)[]): string {
  return lignes.filter((l): l is string => l !== null).join("\n");
}

/**
 * Notification « colis reçu » : accueillante et courte, avec la ville de destination,
 * le reste à payer et le point de retrait exact de la ville. Aucune date annoncée.
 * Pour les marques sans fret vers la France : message simple.
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
    "📦✨ *Colis bien reçu !*",
    "",
    `Bonjour ${clientNom} 👋`,
    `Votre colis *#${numero}* est arrivé chez nous à ${BRAND.villeDepart}, direction *${ville ?? "la France"}* ✈️🇫🇷`,
    "",
    ...blocColis(colis),
    ...(point
      ? ["", `📍 *Retrait à ${point.ville}*`, point.adresse, point.horaires ? `🕐 _${point.horaires}_` : null]
      : []),
    "",
    "Merci pour votre confiance 🙏",
    ...piedDeMessage(ctx),
  ]);
}

/**
 * Notification « prêt pour le retrait » : l'adresse exacte, les horaires et les options
 * (ex. livraison à domicile) de la ville du colis — Lyon, Paris, Marseille… Sans ville
 * connue, tous les points sont listés.
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
    lieu = [
      "📍 *Où le récupérer ?*",
      point.adresse,
      point.horaires ? `🕐 _${point.horaires}_` : null,
      point.remarque ? `🚚 ${point.remarque}` : null,
    ];
  } else if (ville) {
    lieu = [`📍 Nous vous confirmons très vite le lieu de retrait à ${ville}.`];
  } else {
    lieu = [
      "📍 *Nos points de retrait*",
      ...pointsConnus(ctx).map((p) => `• *${p.ville}* : ${p.adresse}${p.horaires ? ` (${p.horaires})` : ""}`),
    ];
  }

  return assembler([
    "🎉 *Votre colis est arrivé !*",
    "",
    `Bonjour ${clientNom} 👋`,
    `Votre colis *#${numero}* vous attend${ville ? ` à *${ville}*` : ""} 🥳`,
    "",
    ...blocColis(colis),
    "",
    ...lieu,
    "",
    "À très vite 🙏",
    ...piedDeMessage(ctx),
  ]);
}
