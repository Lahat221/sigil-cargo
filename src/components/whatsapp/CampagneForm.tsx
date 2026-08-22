"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { creerCampagne } from "@/app/(dashboard)/notifications-whatsapp/actions";

type Client = { id: string; nom: string; telephone: string | null };

export function CampagneForm({ clients }: { clients: Client[] }) {
  const router = useRouter();
  const [nom, setNom] = useState("");
  const [message, setMessage] = useState(
    "Bonjour {nom}, "
  );
  const [affiche, setAffiche] = useState<File | null>(null);
  const [contentSid, setContentSid] = useState("");
  const [recherche, setRecherche] = useState("");
  const [selectionnes, setSelectionnes] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientsAvecTelephone = useMemo(
    () => clients.filter((c) => c.telephone),
    [clients]
  );

  const clientsFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return clientsAvecTelephone;
    return clientsAvecTelephone.filter((c) => c.nom.toLowerCase().includes(q));
  }, [clientsAvecTelephone, recherche]);

  function toggle(id: string) {
    setSelectionnes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toutSelectionner() {
    setSelectionnes(new Set(clientsFiltres.map((c) => c.id)));
  }

  function toutDeselectionner() {
    setSelectionnes(new Set());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (selectionnes.size === 0) {
      setError("Sélectionne au moins un client.");
      return;
    }

    setSubmitting(true);

    try {
      let imageUrl: string | null = null;
      if (affiche) {
        const supabase = createClient();
        const path = `${crypto.randomUUID()}-${affiche.name}`;
        const { error: uploadError } = await supabase.storage
          .from("campagnes-media")
          .upload(path, affiche);
        if (uploadError) throw new Error(uploadError.message);
        imageUrl = path;
      }

      const result = await creerCampagne(
        nom,
        message,
        Array.from(selectionnes),
        imageUrl,
        contentSid || null
      );

      if ("error" in result) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      router.push(`/notifications-whatsapp/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-4 rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Nom de la campagne *
        </label>
        <input
          type="text"
          required
          autoFocus
          placeholder="Rappel vol du 28/08"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Message *
        </label>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
        <p className="mt-1 text-xs text-slate-400">
          Utilise <code className="font-mono">{"{nom}"}</code> pour insérer le
          nom du client automatiquement.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Modèle approuvé Twilio (optionnel)
        </label>
        <input
          type="text"
          placeholder="HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          value={contentSid}
          onChange={(e) => setContentSid(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
        <p className="mt-1 text-xs text-slate-400">
          Content SID d&apos;un modèle WhatsApp approuvé par Meta (Twilio
          Content Template Builder). Nécessaire pour contacter un client qui
          ne t&apos;a pas écrit depuis plus de 24h — sinon l&apos;envoi via
          l&apos;API échouera et se rabattra sur l&apos;envoi manuel.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Affiche / visuel (optionnel)
        </label>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setAffiche(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
        <p className="mt-1 text-xs text-slate-400">
          L&apos;image sera jointe automatiquement aux envois via Twilio. Si
          l&apos;envoi bascule en mode manuel (WhatsApp non configuré), tu
          devras la télécharger depuis la campagne et l&apos;attacher
          toi-même.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">
            Destinataires * ({selectionnes.size} sélectionné(s))
          </label>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={toutSelectionner}
              className="font-medium text-navy hover:underline"
            >
              Tout sélectionner
            </button>
            <button
              type="button"
              onClick={toutDeselectionner}
              className="font-medium text-slate-500 hover:underline"
            >
              Aucun
            </button>
          </div>
        </div>
        <input
          type="text"
          placeholder="Rechercher un client..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="mb-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
        <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200">
          {clientsFiltres.length === 0 ? (
            <p className="p-3 text-sm text-slate-400">Aucun client.</p>
          ) : (
            clientsFiltres.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-b-0 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={selectionnes.has(c.id)}
                  onChange={() => toggle(c.id)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <span className="text-slate-900">{c.nom}</span>
                <span className="text-slate-400">{c.telephone}</span>
              </label>
            ))
          )}
        </div>
        {clients.length > clientsAvecTelephone.length && (
          <p className="mt-1 text-xs text-amber-600">
            {clients.length - clientsAvecTelephone.length} client(s) sans
            téléphone ne sont pas affichés.
          </p>
        )}
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
        {submitting ? "Création..." : "Créer la campagne"}
      </button>
    </form>
  );
}
