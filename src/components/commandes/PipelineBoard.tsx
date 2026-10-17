"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { avancerDepart, changerStatut } from "@/app/(dashboard)/commandes/actions";
import {
  PIPELINE,
  STATUT_LABELS,
  SUIVI_FRET_FRANCE,
  libelleStatut,
  statutSuivant,
} from "@/lib/commandes/statuts";
import { LIBELLES_STATUT_PAIEMENT, resumePaiements } from "@/lib/paiements";
import { STYLE_STATUT_PAIEMENT } from "./PaiementsPanel";
import type { StatutCommande } from "@/types/database.types";
import type { CommandeListItem } from "./types";
import { BRAND } from "@/lib/brand";

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BRAND.devise,
});

// Étapes côté Dakar : on y affiche si le colis a été vérifié.
const ETAPES_DAKAR: StatutCommande[] = ["recue", "a_preparer", "en_preparation", "prete"];
// Au-delà de ce nombre de jours dans la même étape, le colis ressort en orange.
const SEUIL_STAGNATION_JOURS = 5;
const MAX_LIVRES_AFFICHES = 15;

function normaliser(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Jours passés dans l'étape actuelle (date du dernier passage à ce statut). */
function joursDansEtape(c: CommandeListItem): number {
  const entrees = (c.commandes_historique ?? [])
    .filter((h) => h.nouveau_statut === c.statut)
    .map((h) => new Date(h.created_at).getTime());
  const depuis = entrees.length > 0 ? Math.max(...entrees) : new Date(c.created_at).getTime();
  return Math.max(0, Math.floor((Date.now() - depuis) / 86_400_000));
}

export function PipelineBoard({
  commandes,
  projetId,
  destinations,
}: {
  commandes: CommandeListItem[];
  /** Départ affiché : active le bouton « Tout avancer » (jamais sur « tous les départs »). */
  projetId: string | null;
  destinations: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [recherche, setRecherche] = useState("");
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  const colonnes = PIPELINE;

  const visibles = useMemo(() => {
    const q = normaliser(recherche.trim());
    return commandes.filter((c) => {
      if (destination && (c.destination ?? "") !== destination) return false;
      if (!q) return true;
      return normaliser(`${c.numero} ${c.clients?.nom ?? ""} ${c.destination ?? ""}`).includes(q);
    });
  }, [commandes, recherche, destination]);

  function avancer(c: CommandeListItem, vers: StatutCommande) {
    setMessage(null);
    startTransition(async () => {
      let r = await changerStatut(c.id, vers);
      if ("error" in r && r.confirmable) {
        if (!window.confirm(r.error)) return;
        r = await changerStatut(c.id, vers, { forcer: true });
      }
      if ("error" in r) setMessage({ type: "erreur", texte: r.error });
      router.refresh();
    });
  }

  function toutAvancer(statut: StatutCommande, nb: number) {
    if (!projetId) return;
    const suite = SUIVI_FRET_FRANCE ? " (chaque colis passe à l'étape qui suit pour sa destination)" : "";
    if (
      !window.confirm(
        `Faire avancer les ${nb} colis de ce départ qui sont « ${STATUT_LABELS[statut]} »${suite} ?`
      )
    ) {
      return;
    }
    setMessage(null);
    startTransition(async () => {
      let r = await avancerDepart(projetId, statut);
      if ("error" in r && r.confirmable) {
        if (!window.confirm(r.error)) return;
        r = await avancerDepart(projetId, statut, { forcer: true });
      }
      setMessage(
        "error" in r
          ? { type: "erreur", texte: r.error }
          : { type: "ok", texte: `${r.nbMisAJour} colis avancés.` }
      );
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher un colis ou un client…"
          className="w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
        {destinations.length > 0 && (
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          >
            <option value="">Toutes destinations</option>
            {destinations.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
        <span className="text-xs text-slate-500">
          {visibles.length} colis{visibles.length !== commandes.length && ` sur ${commandes.length}`}
        </span>
      </div>

      {message && (
        <p
          className={`mb-3 rounded-md border px-3 py-2 text-sm ${
            message.type === "ok"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.texte}
        </p>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {colonnes.map((statut) => {
          const cartes = visibles.filter((c) => c.statut === statut);
          const poidsTotal = cartes.reduce((s, c) => s + (c.poids_kg ?? 0), 0);
          const estLivre = statut === "livree";
          const affichees = estLivre && !recherche ? cartes.slice(0, MAX_LIVRES_AFFICHES) : cartes;
          const peutToutAvancer = !!projetId && !estLivre && cartes.length > 0;
          return (
            <div key={statut} className="flex w-64 flex-shrink-0 flex-col rounded-lg bg-slate-100">
              <div className="px-3 py-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-700">{STATUT_LABELS[statut]}</h3>
                  <span className="text-xs text-slate-400">{cartes.length}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-xs text-slate-400">
                  <span>{poidsTotal > 0 ? `${poidsTotal.toLocaleString("fr-FR")} kg` : " "}</span>
                  {peutToutAvancer && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => toutAvancer(statut, cartes.length)}
                      className="font-medium text-navy hover:underline disabled:opacity-50"
                      title="Fait avancer tous les colis de cette colonne pour ce départ"
                    >
                      Tout avancer →
                    </button>
                  )}
                </div>
              </div>
              <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto px-2 pb-2">
                {affichees.map((c) => {
                  const suivant = statutSuivant(c.statut, c.destination);
                  const paiement = resumePaiements(c.montant_total, c.paiements);
                  const jours = estLivre ? 0 : joursDansEtape(c);
                  const bloque = jours >= SEUIL_STAGNATION_JOURS;
                  return (
                    <div
                      key={c.id}
                      className="rounded-md border border-slate-200 bg-white p-2.5 text-sm shadow-sm"
                    >
                      <Link
                        href={`/commandes/${c.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        #{c.numero} — {c.clients?.nom ?? "—"}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {c.destination && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                            {c.destination}
                          </span>
                        )}
                        {SUIVI_FRET_FRANCE && ETAPES_DAKAR.includes(c.statut) && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                              c.contenu_verifie
                                ? "bg-green-50 text-green-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {c.contenu_verifie ? "✓ vérifié" : "à vérifier"}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${STYLE_STATUT_PAIEMENT[paiement.statut]}`}
                        >
                          {LIBELLES_STATUT_PAIEMENT[paiement.statut]}
                        </span>
                        {!estLivre && (
                          <span
                            className={`text-[10px] ${bloque ? "font-semibold text-orange-600" : "text-slate-400"}`}
                            title="Temps passé dans cette étape"
                          >
                            {jours === 0 ? "aujourd'hui" : `depuis ${jours} j`}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                        <span>{c.poids_kg !== null ? `${c.poids_kg} kg` : "—"}</span>
                        <span>{montantFormatter.format(c.montant_total)}</span>
                      </div>
                      {suivant && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => avancer(c, suivant)}
                          className="mt-2 w-full rounded-md bg-navy px-2 py-1 text-xs font-medium text-white hover:bg-navy-2 disabled:opacity-50"
                        >
                          → {libelleStatut(suivant, c.destination)}
                        </button>
                      )}
                    </div>
                  );
                })}
                {cartes.length === 0 && <p className="px-1 py-2 text-xs text-slate-400">Vide</p>}
                {estLivre && !recherche && cartes.length > MAX_LIVRES_AFFICHES && (
                  <Link
                    href="/commandes?statut=livree"
                    className="px-1 py-2 text-center text-xs text-navy hover:underline"
                  >
                    + {cartes.length - MAX_LIVRES_AFFICHES} autres — voir la liste
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
