// Analyse de l'activité : de quoi lire le fret et décider (part des petits
// colis, tranches de poids, évolution du prix moyen au kilo d'un départ à
// l'autre). Calculs purs, sans accès base.

export type ColisAnalyse = {
  projet_id?: string | null;
  poids_kg: number | null;
  montant_total: number;
  client_id?: string | null;
};

export type StatsGroupe = {
  colis: number;
  kg: number;
  montant: number;
  /** Prix moyen au kilo (montant ÷ kg) ; null si aucun poids saisi. */
  prixMoyenKg: number | null;
};

export type Tranche = StatsGroupe & {
  id: string;
  libelle: string;
  partColis: number;
  partKg: number;
};

export type ResumeActivite = {
  colis: number;
  colisSansPoids: number;
  kg: number;
  montant: number;
  clients: number;
  poidsMoyenKg: number | null;
  panierMoyen: number | null;
  prixMoyenKg: number | null;
  /** Colis sous le seuil « petit colis ». */
  petits: StatsGroupe & { partColis: number; partKg: number; partMontant: number };
  /** Tous les autres colis pesés. */
  autres: StatsGroupe;
};

function groupe(colis: ColisAnalyse[]): StatsGroupe {
  const pesés = colis.filter((c) => c.poids_kg !== null && c.poids_kg > 0);
  const kg = pesés.reduce((s, c) => s + (c.poids_kg as number), 0);
  const montantPesé = pesés.reduce((s, c) => s + c.montant_total, 0);
  return {
    colis: colis.length,
    kg,
    montant: colis.reduce((s, c) => s + c.montant_total, 0),
    prixMoyenKg: kg > 0 ? montantPesé / kg : null,
  };
}

function bornes(seuil: number): number[] {
  return [0, seuil, Math.max(20, seuil * 2), Math.max(50, seuil * 5)];
}

function libellesTranches(seuil: number, b: number[]): string[] {
  const n = (x: number) => String(Math.round(x * 10) / 10).replace(".", ",");
  return [
    `Petits colis (moins de ${n(b[1])} kg)`,
    `Moyens (${n(b[1])} à ${n(b[2])} kg)`,
    `Gros (${n(b[2])} à ${n(b[3])} kg)`,
    `Très gros (${n(b[3])} kg et plus)`,
  ];
}

export function analyserActivite(
  colis: ColisAnalyse[],
  seuilPetitColisKg: number
): { resume: ResumeActivite; tranches: Tranche[] } {
  const pesés = colis.filter((c) => c.poids_kg !== null && c.poids_kg > 0);
  const total = groupe(colis);
  const b = bornes(seuilPetitColisKg);

  const parTranche = [0, 1, 2, 3].map((i) =>
    pesés.filter((c) => {
      const p = c.poids_kg as number;
      return p >= b[i] && (i === 3 || p < b[i + 1]);
    })
  );
  const libelles = libellesTranches(seuilPetitColisKg, b);
  const tranches: Tranche[] = parTranche.map((liste, i) => {
    const g = groupe(liste);
    return {
      ...g,
      id: ["petits", "moyens", "gros", "tres_gros"][i],
      libelle: libelles[i],
      partColis: pesés.length > 0 ? g.colis / pesés.length : 0,
      partKg: total.kg > 0 ? g.kg / total.kg : 0,
    };
  });

  const petitsListe = parTranche[0];
  const autresListe = parTranche.slice(1).flat();
  const petitsG = groupe(petitsListe);

  const resume: ResumeActivite = {
    colis: colis.length,
    colisSansPoids: colis.length - pesés.length,
    kg: total.kg,
    montant: total.montant,
    clients: new Set(colis.map((c) => c.client_id).filter(Boolean)).size,
    poidsMoyenKg: pesés.length > 0 ? total.kg / pesés.length : null,
    panierMoyen: colis.length > 0 ? total.montant / colis.length : null,
    prixMoyenKg: total.prixMoyenKg,
    petits: {
      ...petitsG,
      partColis: pesés.length > 0 ? petitsG.colis / pesés.length : 0,
      partKg: total.kg > 0 ? petitsG.kg / total.kg : 0,
      partMontant:
        pesés.reduce((s, c) => s + c.montant_total, 0) > 0
          ? petitsG.montant / pesés.reduce((s, c) => s + c.montant_total, 0)
          : 0,
    },
    autres: groupe(autresListe),
  };
  return { resume, tranches };
}

export type LigneDepart = {
  projetId: string;
  nom: string;
  date: string;
  colis: number;
  kg: number;
  montant: number;
  prixMoyenKg: number | null;
  partPetitsKg: number;
  partPetitsColis: number;
  clients: number;
  nouveauxClients: number;
  /** Dernier départ encore ouvert : il se remplit encore, ses totaux ne sont pas définitifs. */
  enCours: boolean;
  /** Variation du prix moyen au kilo par rapport au départ précédent (fraction, ex. -0,05). */
  variationPrix: number | null;
  variationKg: number | null;
};

type ProjetDate = { id: string; nom: string; date_depart: string | null; created_at: string; statut?: string };

/**
 * Date d'un départ : sa date de départ si elle est saisie, sinon celle écrite
 * dans son nom (« Fret Aérien du 06-07-2026 », « du 05/10/2026 »), sinon sa
 * date de création — les anciens départs n'ont pas de date de départ saisie.
 */
export function dateDuDepart(p: ProjetDate): string {
  if (p.date_depart) return p.date_depart;
  const m = p.nom.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (m) {
    const [jour, mois, annee] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (mois >= 1 && mois <= 12 && jour >= 1 && jour <= 31) {
      return `${annee}-${String(mois).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
    }
  }
  return p.created_at;
}

/**
 * Un départ par ligne, du plus ancien au plus récent, avec la variation par
 * rapport au précédent (kilos, prix moyen au kilo) et les nouveaux clients
 * (jamais vus sur un départ antérieur).
 */
export function evolutionParDepart(
  colis: ColisAnalyse[],
  projets: ProjetDate[],
  seuilPetitColisKg: number
): LigneDepart[] {
  const ordonnes = [...projets].sort(
    (a, b) => new Date(dateDuDepart(a)).getTime() - new Date(dateDuDepart(b)).getTime()
  );
  const dejaVus = new Set<string>();
  const lignes: LigneDepart[] = [];

  for (const p of ordonnes) {
    const liste = colis.filter((c) => c.projet_id === p.id);
    if (liste.length === 0) continue;
    const { resume } = analyserActivite(liste, seuilPetitColisKg);
    const clients = new Set(liste.map((c) => c.client_id).filter((x): x is string => !!x));
    const nouveaux = Array.from(clients).filter((id) => !dejaVus.has(id)).length;
    clients.forEach((id) => dejaVus.add(id));

    const prec = lignes[lignes.length - 1];
    lignes.push({
      projetId: p.id,
      nom: p.nom,
      date: dateDuDepart(p),
      colis: resume.colis,
      kg: resume.kg,
      montant: resume.montant,
      prixMoyenKg: resume.prixMoyenKg,
      partPetitsKg: resume.petits.partKg,
      partPetitsColis: resume.petits.partColis,
      clients: clients.size,
      nouveauxClients: nouveaux,
      enCours: false,
      variationPrix:
        prec && prec.prixMoyenKg && resume.prixMoyenKg ? resume.prixMoyenKg / prec.prixMoyenKg - 1 : null,
      variationKg: prec && prec.kg > 0 ? resume.kg / prec.kg - 1 : null,
    });
  }

  // Seul le tout dernier départ peut être « en cours » ; on ne compare pas ses
  // kilos à ceux d'un départ terminé.
  const dernier = lignes[lignes.length - 1];
  const projetDernier = dernier ? projets.find((p) => p.id === dernier.projetId) : undefined;
  if (dernier && projetDernier?.statut === "actif") {
    dernier.enCours = true;
    dernier.variationKg = null;
  }
  return lignes;
}
