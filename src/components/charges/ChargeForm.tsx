"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  creerCharge,
  modifierCharge,
} from "@/app/(dashboard)/charges-depenses/actions";

const CATEGORIES_SUGGESTIONS = [
  "Transport",
  "Emballage",
  "Marketing",
  "Fournitures",
  "Loyer",
  "Autre",
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function ChargeForm({
  chargeId,
  projets,
  initialProjetId = "",
  initialLibelle = "",
  initialMontant = "",
  initialCategorie = "",
  initialDateCharge = todayIso(),
  initialRemarque = "",
  initialFactureUrl = null,
  initialFactureUrlSigned = null,
}: {
  chargeId?: string;
  projets: { id: string; nom: string }[];
  initialProjetId?: string;
  initialLibelle?: string;
  initialMontant?: string;
  initialCategorie?: string;
  initialDateCharge?: string;
  initialRemarque?: string;
  initialFactureUrl?: string | null;
  initialFactureUrlSigned?: string | null;
}) {
  const router = useRouter();
  const [projetId, setProjetId] = useState(initialProjetId || projets[0]?.id || "");
  const [libelle, setLibelle] = useState(initialLibelle);
  const [montant, setMontant] = useState(initialMontant);
  const [categorie, setCategorie] = useState(initialCategorie);
  const [dateCharge, setDateCharge] = useState(initialDateCharge);
  const [remarque, setRemarque] = useState(initialRemarque);
  const [factureUrl, setFactureUrl] = useState(initialFactureUrl);
  const [factureUrlSigned, setFactureUrlSigned] = useState(
    initialFactureUrlSigned
  );
  const [nouvelleFacture, setNouvelleFacture] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!projetId) {
      setError("Sélectionne un projet (fret).");
      return;
    }
    const montantNum = parseFloat(montant);
    if (Number.isNaN(montantNum) || montantNum < 0) {
      setError("Indique un montant valide.");
      return;
    }

    setSubmitting(true);
    let finalFactureUrl = factureUrl;

    try {
      if (nouvelleFacture) {
        const supabase = createClient();
        const path = `${crypto.randomUUID()}-${nouvelleFacture.name}`;
        const { error: uploadError } = await supabase.storage
          .from("charges-factures")
          .upload(path, nouvelleFacture);
        if (uploadError) throw new Error(uploadError.message);
        finalFactureUrl = path;
      }

      const input = {
        projetId,
        libelle,
        montant: montantNum,
        categorie,
        dateCharge,
        remarque,
        factureUrl: finalFactureUrl,
      };

      const result = chargeId
        ? await modifierCharge(chargeId, input)
        : await creerCharge(input);

      if ("error" in result) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      router.push("/charges-depenses");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-4 rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Projet (fret) *
        </label>
        <select
          required
          value={projetId}
          onChange={(e) => setProjetId(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        >
          {projets.length === 0 && <option value="">Aucun projet</option>}
          {projets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Libellé *
        </label>
        <input
          type="text"
          required
          autoFocus
          placeholder="Achat de cartons d'emballage"
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Montant (€) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Date
          </label>
          <input
            type="date"
            required
            value={dateCharge}
            onChange={(e) => setDateCharge(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Catégorie
        </label>
        <input
          type="text"
          list="categories-suggestions"
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
        <datalist id="categories-suggestions">
          {CATEGORIES_SUGGESTIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Remarque
        </label>
        <textarea
          rows={2}
          value={remarque}
          onChange={(e) => setRemarque(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Facture (PDF ou photo)
        </label>
        {factureUrl && !nouvelleFacture && (
          <div className="mb-2 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
            {factureUrlSigned ? (
              <a
                href={factureUrlSigned}
                target="_blank"
                rel="noreferrer"
                className="text-navy hover:underline"
              >
                Voir la facture actuelle
              </a>
            ) : (
              <span className="text-slate-500">Facture jointe</span>
            )}
            <button
              type="button"
              onClick={() => {
                setFactureUrl(null);
                setFactureUrlSigned(null);
              }}
              className="text-xs font-medium text-red-600 hover:underline"
            >
              Retirer
            </button>
          </div>
        )}
        <input
          type="file"
          accept="application/pdf,image/*"
          onChange={(e) => setNouvelleFacture(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
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
          : chargeId
            ? "Enregistrer les modifications"
            : "Créer la charge"}
      </button>
    </form>
  );
}
