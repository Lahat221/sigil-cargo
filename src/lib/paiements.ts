import { BRAND } from "@/lib/brand";

// Le franc CFA est arrimé à l'euro à parité fixe : 1 EUR = 655,957 XOF.
export const TAUX_XOF_PAR_EUR = 655.957;

export type DevisePaiement = "EUR" | "XOF";

export const DEVISES: { code: DevisePaiement; label: string; court: string }[] = [
  { code: "EUR", label: "Euro (€)", court: "€" },
  { code: "XOF", label: "Franc CFA (FCFA)", court: "FCFA" },
];

export const MODES_PAIEMENT: { code: string; label: string }[] = [
  { code: "especes", label: "Espèces" },
  { code: "wave", label: "Wave" },
  { code: "orange_money", label: "Orange Money" },
  { code: "virement", label: "Virement" },
  { code: "carte", label: "Carte bancaire" },
  { code: "autre", label: "Autre" },
];

export function libelleMode(code: string): string {
  return MODES_PAIEMENT.find((m) => m.code === code)?.label ?? code;
}

export function deviseBase(): DevisePaiement {
  return BRAND.devise === "XOF" ? "XOF" : "EUR";
}

function arrondir(montant: number, devise: DevisePaiement): number {
  // XOF : pas de centimes.
  return devise === "XOF" ? Math.round(montant) : Math.round(montant * 100) / 100;
}

/** Convertit un montant d'une devise à une autre (EUR ↔ XOF, parité fixe). */
export function convertir(
  montant: number,
  de: DevisePaiement,
  vers: DevisePaiement
): number {
  if (de === vers) return arrondir(montant, vers);
  const converti = de === "EUR" ? montant * TAUX_XOF_PAR_EUR : montant / TAUX_XOF_PAR_EUR;
  return arrondir(converti, vers);
}

export function versDeviseBase(montant: number, devise: DevisePaiement): number {
  return convertir(montant, devise, deviseBase());
}

export function formaterMontant(montant: number, devise: DevisePaiement): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: devise,
    maximumFractionDigits: devise === "XOF" ? 0 : 2,
  }).format(montant);
}

/** Montant dans la devise de l'entreprise, suivi de l'équivalent dans l'autre devise. */
export function formaterAvecEquivalent(montantBase: number): string {
  const base = deviseBase();
  const autre: DevisePaiement = base === "EUR" ? "XOF" : "EUR";
  return `${formaterMontant(montantBase, base)} (≈ ${formaterMontant(
    convertir(montantBase, base, autre),
    autre
  )})`;
}

export type PaiementLigne = {
  id: string;
  created_at: string;
  montant: number;
  devise: DevisePaiement;
  montant_base: number;
  mode: string;
  note: string | null;
};

export type StatutPaiement = "impaye" | "acompte" | "solde";

export type ResumePaiement = {
  paye: number;
  reste: number;
  statut: StatutPaiement;
};

/** Reste dû : un écart d'arrondi de conversion (< 1 centime / 1 FCFA) compte comme soldé. */
export function resumePaiements(
  montantTotal: number,
  paiements: { montant_base: number }[] | null | undefined
): ResumePaiement {
  const paye = (paiements ?? []).reduce((s, p) => s + Number(p.montant_base), 0);
  const tolerance = deviseBase() === "XOF" ? 1 : 0.02;
  const reste = Math.max(montantTotal - paye, 0);
  if (paye <= 0) return { paye: 0, reste: montantTotal, statut: "impaye" };
  if (reste < tolerance) return { paye, reste: 0, statut: "solde" };
  return { paye, reste, statut: "acompte" };
}

export const LIBELLES_STATUT_PAIEMENT: Record<StatutPaiement, string> = {
  impaye: "Non payé",
  acompte: "Acompte versé",
  solde: "Payé",
};

export type PaiementInput = {
  montant: number;
  devise: DevisePaiement;
  mode: string;
  note?: string;
};

export type PaiementPrepare = {
  montant: number;
  devise: DevisePaiement;
  montant_base: number;
  mode: string;
  note: string | null;
};

/** Valide un versement et calcule sa conversion dans la devise de l'entreprise. */
export function preparerPaiement(input: PaiementInput): { error: string } | PaiementPrepare {
  const montant = Number(input.montant);
  if (!Number.isFinite(montant) || montant <= 0) {
    return { error: "Indiquez un montant supérieur à zéro." };
  }
  if (input.devise !== "EUR" && input.devise !== "XOF") {
    return { error: "Devise invalide." };
  }
  if (montant > 1_000_000_000) return { error: "Montant trop élevé." };
  const mode = MODES_PAIEMENT.some((m) => m.code === input.mode) ? input.mode : "autre";
  const montantBase = versDeviseBase(montant, input.devise);
  if (montantBase <= 0) return { error: "Montant trop faible." };
  return {
    montant,
    devise: input.devise,
    montant_base: montantBase,
    mode,
    note: input.note?.trim().slice(0, 200) || null,
  };
}
