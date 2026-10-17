// Normalisation et validation des champs lus sur une LTA (lecture IA).

/** « 49002087654 » ou « 490 0208 7654 » -> « 490-02087654 » ; null si ce n'est pas un MAWB. */
export function normaliserMawb(valeur: unknown): string | null {
  const chiffres = String(valeur ?? "").replace(/\D/g, "");
  return chiffres.length === 11 ? `${chiffres.slice(0, 3)}-${chiffres.slice(3)}` : null;
}

/** Accepte 13/08/2026, 13-8-2026, 13.08.2026 ; renvoie JJ-MM-AAAA ou null si la date est impossible. */
export function normaliserDateVol(valeur: unknown): string | null {
  const m = String(valeur ?? "").match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (!m) return null;
  const [jour, mois, annee] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(annee, mois - 1, jour));
  const valide =
    date.getUTCFullYear() === annee && date.getUTCMonth() === mois - 1 && date.getUTCDate() === jour;
  if (!valide || annee < 2020 || annee > 2100) return null;
  return `${String(jour).padStart(2, "0")}-${String(mois).padStart(2, "0")}-${annee}`;
}

export function nombrePositif(valeur: unknown): number | null {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const n = Number(String(valeur).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}
