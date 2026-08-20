"use client";

import { useEffect, useRef, useState } from "react";
import {
  searchClients,
  type ClientMatch,
} from "@/app/(dashboard)/commandes/nouvelle/actions";

export type ClientSelection =
  | { clientId: string; nouveauClient: null }
  | {
      clientId: null;
      nouveauClient: {
        nom: string;
        telephone: string;
        telephonePays: string;
        adresse: string;
      };
    }
  | { clientId: null; nouveauClient: null };

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

export function ClientField({
  onChange,
  initialSelected,
}: {
  onChange: (selection: ClientSelection) => void;
  initialSelected?: ClientMatch | null;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<ClientMatch[]>([]);
  const [selected, setSelected] = useState<ClientMatch | null>(
    initialSelected ?? null
  );
  const [creatingNew, setCreatingNew] = useState(false);
  const [newClient, setNewClient] = useState({
    nom: "",
    telephone: "",
    telephonePays: "+33",
    adresse: "",
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (selected || creatingNew || !query.trim()) {
      setMatches([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const results = await searchClients(query);
      setMatches(results);
    }, 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, selected, creatingNew]);

  useEffect(() => {
    if (selected) {
      onChange({ clientId: selected.id, nouveauClient: null });
    } else if (creatingNew) {
      onChange({ clientId: null, nouveauClient: newClient });
    } else {
      onChange({ clientId: null, nouveauClient: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, creatingNew, newClient]);

  if (selected) {
    return (
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Client
        </label>
        <div className="flex items-center justify-between rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm">
          <div>
            <span className="font-medium text-slate-900">{selected.nom}</span>
            {selected.telephone && (
              <span className="ml-2 text-slate-500">{selected.telephone}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setQuery("");
            }}
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            Changer
          </button>
        </div>
      </div>
    );
  }

  if (creatingNew) {
    return (
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">
            Nouveau client
          </label>
          <button
            type="button"
            onClick={() => {
              setCreatingNew(false);
              setNewClient({
                nom: "",
                telephone: "",
                telephonePays: "+33",
                adresse: "",
              });
            }}
            className="text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            Annuler
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            type="text"
            placeholder="Nom *"
            required
            autoFocus
            value={newClient.nom}
            onChange={(e) =>
              setNewClient((c) => ({ ...c, nom: e.target.value }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
          <div className="flex gap-1">
            <select
              value={newClient.telephonePays}
              onChange={(e) =>
                setNewClient((c) => ({ ...c, telephonePays: e.target.value }))
              }
              className="w-24 rounded-md border border-slate-300 px-1.5 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              {INDICATIFS.map((i) => (
                <option key={i.code} value={i.code}>
                  {i.label}
                </option>
              ))}
            </select>
            <input
              type="tel"
              placeholder="Téléphone"
              value={newClient.telephone}
              onChange={(e) =>
                setNewClient((c) => ({ ...c, telephone: e.target.value }))
              }
              className="w-full min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <input
            type="text"
            placeholder="Adresse"
            value={newClient.adresse}
            onChange={(e) =>
              setNewClient((c) => ({ ...c, adresse: e.target.value }))
            }
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label className="mb-1 block text-sm font-medium text-slate-700">
        Client
      </label>
      <input
        type="text"
        placeholder="Rechercher par nom ou téléphone..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />

      {matches.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-md">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setSelected(m)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{m.nom}</span>
                {m.telephone && (
                  <span className="text-slate-500">{m.telephone}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setCreatingNew(true)}
        className="mt-1 text-xs font-medium text-slate-500 hover:text-slate-900"
      >
        + Créer un nouveau client
      </button>
    </div>
  );
}
