import { BRAND } from "@/lib/brand";

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BRAND.devise,
});

/**
 * Message "Notif retrait (perso)" — même construction utilisée par la fiche
 * colis et la liste de colis (évite que les deux dérivent l'un de l'autre).
 * Formaté avec le markdown WhatsApp (*gras*) et des sauts de ligne pour
 * rester lisible sur un téléphone plutôt qu'un simple paragraphe.
 */
export function construireTexteRetrait(params: {
  clientNom: string;
  numero: number;
  description: string | null;
  poidsKg: number | null;
  montantTotal: number;
}): string {
  if (!BRAND.retrait) return "";
  const { clientNom, numero, description, poidsKg, montantTotal } = params;

  return [
    `Bonjour ${clientNom}, votre colis *#${numero}* chez ${BRAND.nom} est prêt pour le retrait !`,
    "",
    description ? `📦 *Contenu* : ${description}` : null,
    poidsKg !== null ? `⚖️ *Poids* : ${poidsKg} kg` : null,
    `💰 *Montant* : ${montantFormatter.format(montantTotal)}`,
    "",
    `📍 *Adresse de retrait*`,
    BRAND.retrait.adresse,
    `🕐 ${BRAND.retrait.horaires}`,
    "",
    `🚚 ${BRAND.retrait.livraisonDomicile}`,
  ]
    .filter((ligne) => ligne !== null)
    .join("\n");
}
