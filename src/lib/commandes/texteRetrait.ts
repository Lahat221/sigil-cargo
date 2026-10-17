import { BRAND } from "@/lib/brand";
import { formaterAvecEquivalent, resumePaiements } from "@/lib/paiements";

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BRAND.devise,
});

/**
 * Message "Notif retrait (perso)" — même construction utilisée par la fiche
 * colis et la liste de colis (évite que les deux dérivent l'un de l'autre).
 * Formaté avec le markdown WhatsApp (*gras*), des emoji et des sauts de
 * ligne pour rester lisible sur un téléphone plutôt qu'un simple paragraphe.
 */
export function construireTexteRetrait(params: {
  clientNom: string;
  numero: number;
  description: string | null;
  poidsKg: number | null;
  montantTotal: number;
  /** Déjà encaissé (devise de l'entreprise) : affiche le reste à régler au retrait. */
  montantPaye?: number;
}): string {
  if (!BRAND.retrait) return "";
  const { clientNom, numero, description, poidsKg, montantTotal, montantPaye } = params;
  const resume = resumePaiements(
    montantTotal,
    montantPaye && montantPaye > 0 ? [{ montant_base: montantPaye }] : []
  );

  return [
    `Bonjour ${clientNom}, votre colis *#${numero}* chez ${BRAND.nom} est prêt pour le retrait !`,
    "",
    description ? `📦 *Contenu :* ${description}` : null,
    poidsKg !== null ? `⚖️ *Poids :* ${poidsKg} kg` : null,
    `💰 *Montant :* ${montantFormatter.format(montantTotal)}`,
    resume.paye > 0 ? `✅ *Déjà réglé :* ${montantFormatter.format(resume.paye)}` : null,
    resume.paye > 0
      ? resume.reste > 0
        ? `🧾 *Reste à payer au retrait :* ${formaterAvecEquivalent(resume.reste)}`
        : `🧾 Votre colis est entièrement payé, rien à régler au retrait.`
      : null,
    "",
    `📍 *Adresse de retrait :*`,
    BRAND.retrait.adresse,
    `🕐 *Horaires :* ${BRAND.retrait.horaires}`,
    "",
    `🚚 ${BRAND.retrait.livraisonDomicile}`,
  ]
    .filter((ligne) => ligne !== null)
    .join("\n");
}
