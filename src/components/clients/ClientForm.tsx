"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { creerClient, modifierClient } from "@/app/(dashboard)/clients/actions";

const INDICATIFS = [
  { code: "+33", label: "🇫🇷 +33" },
  { code: "+221", label: "🇸🇳 +221" },
  { code: "+223", label: "🇲🇱 +223" },
  { code: "+225", label: "🇨🇮 +225" },
  { code: "+224", label: "🇬🇳 +224" },
  { code: "+226", label: "🇧🇫 +226" },
  { code: "+227", label: "🇳🇪 +227" },
  { code: "+228", label: "🇹🇬 +228" },
  { code: "+229", label: "🇧🇯 +229" },
  { code: "+230", label: "🇲🇺 +230" },
];

export function ClientForm({
  clientId,
  initialNom = "",
  initialTelephone = "",
  initialTelephonePays = "+33",
  initialAdresse = "",
}: {
  clientId?: string;
  initialNom?: string;
  initialTelephone?: string;
  initialTelephonePays?: string;
  initialAdresse?: string;
}) {
  const router = useRouter();
  const [nom, setNom] = useState(initialNom);
  const [telephone, setTelephone] = useState(initialTelephone);
  const [telephonePays, setTelephonePays] = useState(initialTelephonePays);
  const [adresse, setAdresse] = useState(initialAdresse);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const input = { nom, telephone, telephonePays, adresse };
    const result = clientId
      ? await modifierClient(clientId, input)
      : await creerClient(input);

    if ("error" in result) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push("/clients");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-4 rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Nom complet *
        </label>
        <input
          type="text"
          required
          autoFocus
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Téléphone *
        </label>
        <div className="flex gap-1">
          <select
            value={telephonePays}
            onChange={(e) => setTelephonePays(e.target.value)}
            className="w-24 rounded-md border border-slate-300 px-1.5 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          >
            {INDICATIFS.map((i) => (
              <option key={i.code} value={i.code}>
                {i.label}
              </option>
            ))}
          </select>
          <input
            type="tel"
            required
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            className="w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Adresse
        </label>
        <input
          type="text"
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
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
          : clientId
            ? "Enregistrer les modifications"
            : "Créer le client"}
      </button>
    </form>
  );
}
