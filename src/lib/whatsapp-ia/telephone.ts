export function chiffres(telephone: string): string {
  return telephone.replace(/\D/g, "");
}

// Deux numéros désignent la même ligne si leurs 9 derniers chiffres sont
// identiques (gère "+33 6…", "06…", "+221 77…", "77…"). Exige au moins 9
// chiffres de chaque côté pour ne jamais rapprocher deux clients à tort.
export function memeTelephone(a: string, b: string): boolean {
  const da = chiffres(a);
  const db = chiffres(b);
  if (da.length < 9 || db.length < 9) return false;
  return da.slice(-9) === db.slice(-9);
}
