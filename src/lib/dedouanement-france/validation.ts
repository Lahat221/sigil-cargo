import { EXPORTATEUR } from "./constantes";
import type { DeclarationFranceIA } from "./schema";

const CHAPITRES_REX = new Set(EXPORTATEUR.chapitresRexEligibles);
const HS_REGEX = /^\d{4}\.\d{2}\.\d{2}\.\d{2}$/;

/**
 * Les 5 invariants métier du cahier des charges (§7) — appliqués après le
 * parsing JSON/Zod, avant de faire confiance au résultat de Claude.
 * Renvoie la liste des erreurs (vide = valide).
 */
export function validerDeclarationFrance(
  data: DeclarationFranceIA,
  poidsBrutLtaKg: number | null
): string[] {
  const erreurs: string[] = [];

  // 1. Somme des poids ≈ poids LTA (tolérance 0,5 kg), seulement si un poids
  // LTA a été fourni.
  if (poidsBrutLtaKg != null && poidsBrutLtaKg > 0) {
    const totalPoids = data.lignes.reduce((acc, l) => acc + l.poids_kg, 0);
    if (Math.abs(totalPoids - poidsBrutLtaKg) >= 0.5) {
      erreurs.push(
        `Poids total des lignes (${totalPoids.toFixed(2)} kg) ne correspond pas au poids LTA (${poidsBrutLtaKg} kg).`
      );
    }
  }

  for (const l of data.lignes) {
    // 2. Préférence valide.
    if (l.preference !== 100 && l.preference !== 200) {
      erreurs.push(`Ligne HS ${l.hs} : préférence invalide (${l.preference}), doit être 100 ou 200.`);
      continue;
    }

    // 3. Chapitre REX cohérent avec la préférence 200 ; chocolat (chap 18)
    // toujours en préférence 100.
    const chapitre = l.hs.slice(0, 2);
    if (l.preference === 200 && !CHAPITRES_REX.has(chapitre)) {
      erreurs.push(
        `Ligne HS ${l.hs} : en préférence 200 mais chapitre ${chapitre} non éligible au REX.`
      );
    }
    if (chapitre === "18" && l.preference !== 100) {
      erreurs.push(`Ligne HS ${l.hs} : chocolat (chapitre 18) doit toujours être en préférence 100.`);
    }

    // 5. Format HS (déjà contraint par Zod, revérifié ici pour un message clair).
    if (!HS_REGEX.test(l.hs)) {
      erreurs.push(`Ligne HS ${l.hs} : format invalide, attendu xxxx.xx.xx.xx.`);
    }

    // 4. Cohérence des calculs (tolérance 0,05 €).
    const valeurEurCalc = l.valeur_fcfa / 655.957;
    if (Math.abs(l.valeur_eur - valeurEurCalc) >= 0.05) {
      erreurs.push(
        `Ligne HS ${l.hs} : valeur_eur (${l.valeur_eur}) incohérente avec valeur_fcfa/655.957 (${valeurEurCalc.toFixed(2)}).`
      );
    }
    const baseCalc = l.valeur_eur + l.droit_eur;
    if (Math.abs(l.base_tva_eur - baseCalc) >= 0.05) {
      erreurs.push(
        `Ligne HS ${l.hs} : base_tva_eur (${l.base_tva_eur}) incohérente avec valeur_eur + droit_eur (${baseCalc.toFixed(2)}).`
      );
    }
    // droit_pct/tva_pct doivent être des fractions (0-1), pas des pourcentages.
    if (l.droit_pct > 1 || l.tva_pct > 1) {
      erreurs.push(
        `Ligne HS ${l.hs} : droit_pct/tva_pct doivent être des fractions (ex. 0.055), pas des pourcentages.`
      );
    }
  }

  return erreurs;
}
