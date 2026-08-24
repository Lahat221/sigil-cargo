import { IMPORTATEUR, TRANSITAIRE } from "./constantes";
import type { DeclarationFranceIA } from "./schema";

const montantFcfaFormatter = new Intl.NumberFormat("fr-FR");

export function genererMailTransitaire(data: DeclarationFranceIA): string {
  const { meta } = data;
  return `À :     ${TRANSITAIRE.contact} — ${TRANSITAIRE.nom}
Objet : SIGIL CARGO — MAWB ${meta.mawb} — Dédouanement

Bonjour ${TRANSITAIRE.contact.split(" ")[0]},

Nouvelle expédition qui arrive à Lyon prochainement.

- MAWB : ${meta.mawb}
- Vol : HC403 du ${meta.date_vol}
- ${meta.poids_lta_kg} kg / ${montantFcfaFormatter.format(meta.valeur_totale_fcfa)} FCFA (${meta.valeur_totale_eur.toFixed(2)} €)
- DAP Villeurbanne — REX SNREX1356ASX — TVA en ATVAI (${IMPORTATEUR.tvaIntracom})
- ${meta.nb_lignes_regroupees} lignes HS (packing regroupé et optimisé, préf. 200 sur agro éligibles)

Pièces jointes : facture commerciale, packing list, déclaration douane, LTA.

Merci de me confirmer et de m'envoyer le devis.

Cordialement,

Abdou Lahat MBAYE — SIGIL CARGO
06 95 81 11 29`;
}
