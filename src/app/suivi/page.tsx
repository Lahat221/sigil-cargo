import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/layout/Logo";
import { STATUT_LABELS } from "@/components/commandes/StatutBadge";
import type { StatutCommande } from "@/types/database.types";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

const PIPELINE: StatutCommande[] = [
  "recue",
  "a_preparer",
  "en_preparation",
  "prete",
  "expediee",
  "livree",
];

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "long",
  timeStyle: "short",
});

// Page PUBLIQUE (voir PUBLIC_PATHS dans middleware.ts) — un client suit son
// colis en indiquant son numéro ET son téléphone (les deux doivent
// correspondre). Le numéro de colis seul est une simple séquence (1, 2,
// 3...) : sans cette double vérification, n'importe qui pourrait feuilleter
// les colis des autres clients en changeant juste le chiffre dans l'URL.
function chiffres(valeur: string) {
  return valeur.replace(/\D/g, "");
}

export default async function SuiviColisPage({
  searchParams,
}: {
  searchParams: { numero?: string; telephone?: string };
}) {
  const numero = searchParams.numero?.trim() ?? "";
  const telephone = searchParams.telephone?.trim() ?? "";
  const aRecherche = numero.length > 0 && telephone.length > 0;

  let resultat: {
    numero: number;
    statut: StatutCommande;
    destination: string | null;
    poids_kg: number | null;
    created_at: string;
    date_livraison_prevue: string | null;
    date_livraison_reelle: string | null;
    id: string;
    projets: { nom: string; date_depart: string | null } | null;
  } | null = null;
  let erreur: string | null = null;

  if (aRecherche) {
    const numeroNombre = Number(numero);
    const telDigits = chiffres(telephone);

    if (Number.isNaN(numeroNombre) || telDigits.length < 6) {
      erreur = "Vérifie le numéro de colis et le numéro de téléphone saisis.";
    } else {
      const supabase = createAdminClient();
      const { data } = await supabase
        .from("commandes")
        .select(
          "id, numero, statut, destination, poids_kg, created_at, date_livraison_prevue, date_livraison_reelle, clients(telephone), projets(nom, date_depart)"
        )
        .eq("numero", numeroNombre)
        .returns<
          {
            id: string;
            numero: number;
            statut: StatutCommande;
            destination: string | null;
            poids_kg: number | null;
            created_at: string;
            date_livraison_prevue: string | null;
            date_livraison_reelle: string | null;
            clients: { telephone: string | null } | null;
            projets: { nom: string; date_depart: string | null } | null;
          }[]
        >();

      const trouve = (data ?? []).find((c) => {
        const clientDigits = chiffres(c.clients?.telephone ?? "");
        return (
          clientDigits.length >= 6 &&
          (clientDigits.endsWith(telDigits) || telDigits.endsWith(clientDigits))
        );
      });

      if (trouve) {
        resultat = trouve;
      } else {
        erreur =
          "Aucun colis trouvé avec ce numéro et ce téléphone. Vérifie les informations saisies.";
      }
    }
  }

  const currentIndex = resultat ? PIPELINE.indexOf(resultat.statut) : -1;

  return (
    <div className="min-h-screen bg-navy-gradient px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/">
            <Logo size={48} tagline />
          </Link>
        </div>

        <div className="rounded-xl border border-line bg-white p-6 shadow-xl">
          <h1 className="mb-4 text-xl font-bold text-slate-900">
            Suivre mon colis
          </h1>

          <form className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                N° de colis
              </label>
              <input
                type="text"
                name="numero"
                defaultValue={numero}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Numéro de téléphone (celui donné au dépôt)
              </label>
              <input
                type="tel"
                name="telephone"
                defaultValue={telephone}
                required
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-gold-gradient px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all hover:shadow-md hover:brightness-105"
            >
              Rechercher
            </button>
          </form>

          {erreur && (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erreur}
            </p>
          )}

          {resultat && (
            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-lg font-bold text-slate-900">
                  Colis #{resultat.numero}
                </p>
                {resultat.destination && (
                  <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-bold uppercase text-white">
                    {resultat.destination}
                  </span>
                )}
              </div>

              {resultat.statut === "annulee" ? (
                <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                  Colis annulé
                </span>
              ) : (
                <div className="space-y-1.5">
                  {PIPELINE.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          i <= currentIndex ? "bg-navy" : "bg-slate-200"
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          i <= currentIndex
                            ? "font-semibold text-slate-900"
                            : "text-slate-400"
                        }`}
                      >
                        {STATUT_LABELS[s]}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
                {resultat.projets?.nom && (
                  <p>
                    Projet : <span className="font-medium">{resultat.projets.nom}</span>
                  </p>
                )}
                {resultat.poids_kg !== null && (
                  <p>
                    Poids : <span className="font-medium">{resultat.poids_kg} kg</span>
                  </p>
                )}
                <p>
                  Déposé le :{" "}
                  <span className="font-medium">
                    {dateFormatter.format(new Date(resultat.created_at))}
                  </span>
                </p>
                {resultat.date_livraison_reelle && (
                  <p>
                    Livré le :{" "}
                    <span className="font-medium">
                      {dateFormatter.format(new Date(resultat.date_livraison_reelle))}
                    </span>
                  </p>
                )}
              </div>

              <Link
                href={`/colis/${resultat.id}`}
                className="mt-4 inline-block text-sm text-gold-2 hover:underline"
              >
                Voir les photos / vidéo du colis →
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted2">{BRAND.nom}</p>
      </div>
    </div>
  );
}
