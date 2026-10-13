// Numéro de téléphone saisi librement -> chiffres pour un lien wa.me.
// Règles : "00..." = international ; 10 chiffres commençant par 0 = France
// (+33) ; 9 chiffres = Sénégal (+221) ; sinon on garde les chiffres tels quels.
export function chiffresWhatsapp(telephone: string): string {
  const chiffres = telephone.replace(/\D/g, "");
  if (chiffres.startsWith("00")) return chiffres.slice(2);
  if (chiffres.length === 10 && chiffres.startsWith("0")) return `33${chiffres.slice(1)}`;
  if (chiffres.length === 9) return `221${chiffres}`;
  return chiffres;
}
