"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { creerProjet, modifierProjet } from "@/app/(dashboard)/projets/actions";
import { BRAND } from "@/lib/brand";

export function ProjetForm({
  projetId,
  initialNom = "",
  initialDateDepart = "",
  initialDateArrivee = "",
  initialStatut = "actif",
  initialModeFret = "aerien",
}: {
  projetId?: string;
  initialNom?: string;
  initialDateDepart?: string;
  initialDateArrivee?: string;
  initialStatut?: "actif" | "clos" | "annule";
  initialModeFret?: "aerien" | "conteneur";
}) {
  const router = useRouter();
  const [nom, setNom] = useState(initialNom);
  const [dateDepart, setDateDepart] = useState(initialDateDepart);
  const [dateArrivee, setDateArrivee] = useState(initialDateArrivee);
  const [statut, setStatut] = useState(initialStatut);
  const [modeFret, setModeFret] = useState(initialModeFret);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const input = { nom, dateDepart, dateArrivee, statut, modeFret };
    const result = projetId
      ? await modifierProjet(projetId, input)
      : await creerProjet(input);

    if ("error" in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push("/projets");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-4 rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Nom du projet *
        </label>
        <input
          type="text"
          required
          autoFocus
          placeholder="Fret Aérien du 28/08/2026"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Date de départ
          </label>
          <input
            type="date"
            value={dateDepart}
            onChange={(e) => setDateDepart(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Date d&apos;arrivée
          </label>
          <input
            type="date"
            value={dateArrivee}
            onChange={(e) => setDateArrivee(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          />
        </div>
      </div>

      {BRAND.modeGroupageConteneurActif && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Mode de fret
          </label>
          <select
            value={modeFret}
            onChange={(e) =>
              setModeFret(e.target.value as "aerien" | "conteneur")
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          >
            <option value="aerien">Fret aérien (tarifé au kg)</option>
            <option value="conteneur">Groupage conteneur (tarifé au m³)</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            S&apos;applique à tous les colis créés sous ce projet.
          </p>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Statut
        </label>
        <select
          value={statut}
          onChange={(e) =>
            setStatut(e.target.value as "actif" | "clos" | "annule")
          }
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        >
          <option value="actif">Actif</option>
          <option value="clos">Clos</option>
          <option value="annule">Annulé</option>
        </select>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-gold-gradient px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all hover:shadow-md hover:brightness-105 disabled:opacity-50"
      >
        {submitting
          ? "Enregistrement..."
          : projetId
            ? "Enregistrer les modifications"
            : "Créer le projet"}
      </button>
    </form>
  );
}
