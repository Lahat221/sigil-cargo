"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  creerUtilisateur,
  mettreAJourAcces,
} from "@/app/(dashboard)/parametres/actions";
import { MODULES_DISPONIBLES } from "@/lib/modules";
import type { RoleUtilisateur } from "@/types/database.types";
import { MessageForm } from "./MonCompteForms";
import { BOUTON_PRIMAIRE, BOUTON_SECONDAIRE, INPUT_CLASS } from "./styles";

export function UtilisateurForm({
  utilisateurId,
  estSoiMeme = false,
  initial,
}: {
  utilisateurId?: string;
  estSoiMeme?: boolean;
  initial?: {
    nom: string;
    email: string;
    role: RoleUtilisateur;
    modules: string[];
  };
}) {
  const router = useRouter();
  const edition = !!utilisateurId;

  const [nom, setNom] = useState(initial?.nom ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [motDePasse, setMotDePasse] = useState("");
  const [role, setRole] = useState<RoleUtilisateur>(initial?.role ?? "agent");
  const [modules, setModules] = useState<string[]>(initial?.modules ?? []);
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function basculerModule(slug: string) {
    setModules((m) => (m.includes(slug) ? m.filter((s) => s !== slug) : [...m, slug]));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    startTransition(async () => {
      const r = edition
        ? await mettreAJourAcces(utilisateurId!, {
            nom,
            role,
            modules,
            nouveauMotDePasse: motDePasse,
          })
        : await creerUtilisateur({ nom, email, motDePasse, role, modules });
      if ("error" in r) {
        setErreur(r.error);
        return;
      }
      router.push("/parametres/utilisateurs");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-5 rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Email (identifiant de connexion)
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={edition}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {edition ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe"}
        </label>
        <input
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          required={!edition}
          minLength={edition && !motDePasse ? undefined : 8}
          autoComplete="new-password"
          className={INPUT_CLASS}
        />
        <p className="mt-1 text-xs text-slate-500">8 caractères minimum.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Rôle</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as RoleUtilisateur)}
          disabled={estSoiMeme}
          className={INPUT_CLASS}
        >
          <option value="agent">Agent — accès limité aux modules cochés</option>
          <option value="admin">Administrateur — accès à tout</option>
        </select>
        {estSoiMeme && (
          <p className="mt-1 text-xs text-slate-500">
            Vous ne pouvez pas modifier votre propre rôle.
          </p>
        )}
      </div>

      {role === "agent" && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">Modules accessibles</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setModules(MODULES_DISPONIBLES.map((m) => m.slug))}
                className={BOUTON_SECONDAIRE}
              >
                Tout cocher
              </button>
              <button
                type="button"
                onClick={() => setModules([])}
                className={BOUTON_SECONDAIRE}
              >
                Tout décocher
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODULES_DISPONIBLES.map((m) => (
              <label
                key={m.slug}
                className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={modules.includes(m.slug)}
                  onChange={() => basculerModule(m.slug)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                {m.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <MessageForm message={erreur ? { type: "erreur", texte: erreur } : null} />

      <button type="submit" disabled={isPending} className={`w-full ${BOUTON_PRIMAIRE}`}>
        {isPending ? "Enregistrement..." : edition ? "Enregistrer les modifications" : "Créer l'utilisateur"}
      </button>
    </form>
  );
}
