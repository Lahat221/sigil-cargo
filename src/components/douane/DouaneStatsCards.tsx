import Link from "next/link";
import type { StatutExtractionDouane } from "@/types/database.types";

type Stats = {
  total: number;
  nonTraite: number;
  enCours: number;
  traite: number;
  aVerifier: number;
  valide: number;
  erreur: number;
  hsIncertain: number;
  produitsRetires: number;
};

function Carte({
  label,
  valeur,
  couleur,
  href,
  actif,
}: {
  label: string;
  valeur: number;
  couleur: string;
  href?: string;
  actif?: boolean;
}) {
  const contenu = (
    <>
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${couleur}`}>{valeur}</p>
    </>
  );

  const classesBase = `rounded-xl border bg-white p-4 shadow-sm ${
    actif ? "border-gold-2 ring-1 ring-gold-2" : "border-slate-200/70"
  }`;

  if (!href) {
    return <div className={classesBase}>{contenu}</div>;
  }

  return (
    <Link href={href} className={`block transition-colors hover:bg-slate-50 ${classesBase}`}>
      {contenu}
    </Link>
  );
}

export function DouaneStatsCards({
  stats,
  projetId,
  statutActif,
}: {
  stats: Stats;
  projetId: string;
  statutActif?: StatutExtractionDouane;
}) {
  const hrefStatut = (statut: StatutExtractionDouane) =>
    `/gestion-douaniere?projet=${projetId}&statut=${statut}`;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Carte
        label="Total colis"
        valeur={stats.total}
        couleur="text-navy"
        href={`/gestion-douaniere?projet=${projetId}`}
        actif={!statutActif}
      />
      <Carte
        label="Non traités"
        valeur={stats.nonTraite}
        couleur="text-slate-500"
        href={hrefStatut("non_traite")}
        actif={statutActif === "non_traite"}
      />
      <Carte
        label="En cours"
        valeur={stats.enCours}
        couleur="text-blue-600"
        href={hrefStatut("en_cours")}
        actif={statutActif === "en_cours"}
      />
      <Carte
        label="Traités"
        valeur={stats.traite}
        couleur="text-emerald-600"
        href={hrefStatut("traite")}
        actif={statutActif === "traite"}
      />
      <Carte
        label="À vérifier"
        valeur={stats.aVerifier}
        couleur="text-amber-600"
        href={hrefStatut("a_verifier")}
        actif={statutActif === "a_verifier"}
      />
      <Carte
        label="Validés"
        valeur={stats.valide}
        couleur="text-emerald-700"
        href={hrefStatut("valide")}
        actif={statutActif === "valide"}
      />
      <Carte
        label="Erreurs"
        valeur={stats.erreur}
        couleur="text-red-600"
        href={hrefStatut("erreur")}
        actif={statutActif === "erreur"}
      />
      <Carte
        label="HS incertains"
        valeur={stats.hsIncertain}
        couleur="text-amber-600"
        href={`/gestion-douaniere/vue-ensemble?projet=${projetId}&hs=a_verifier`}
      />
      <Carte label="Produits retirés" valeur={stats.produitsRetires} couleur="text-slate-500" />
    </div>
  );
}
