"use client";

import { useState, useTransition, type FormEvent } from "react";
import { mettreAJourNom, changerMotDePasse } from "@/app/(dashboard)/parametres/actions";
import { BOUTON_PRIMAIRE, INPUT_CLASS } from "./styles";

type Message = { type: "ok" | "erreur"; texte: string } | null;

export function MessageForm({ message }: { message: Message }) {
  if (!message) return null;
  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm ${
        message.type === "ok"
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {message.texte}
    </p>
  );
}

export function NomForm({ nomInitial }: { nomInitial: string }) {
  const [nom, setNom] = useState(nomInitial);
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const r = await mettreAJourNom(nom);
      setMessage(
        "error" in r
          ? { type: "erreur", texte: r.error }
          : { type: "ok", texte: "Nom enregistré." }
      );
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Nom affiché
        </label>
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          required
          className={INPUT_CLASS}
        />
      </div>
      <MessageForm message={message} />
      <button type="submit" disabled={isPending} className={BOUTON_PRIMAIRE}>
        {isPending ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}

export function MotDePasseForm() {
  const [nouveau, setNouveau] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<Message>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (nouveau !== confirmation) {
      setMessage({ type: "erreur", texte: "Les deux mots de passe ne correspondent pas." });
      return;
    }
    startTransition(async () => {
      const r = await changerMotDePasse(nouveau);
      if ("error" in r) {
        setMessage({ type: "erreur", texte: r.error });
        return;
      }
      setNouveau("");
      setConfirmation("");
      setMessage({ type: "ok", texte: "Mot de passe modifié." });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nouveau mot de passe
          </label>
          <input
            type="password"
            value={nouveau}
            onChange={(e) => setNouveau(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Confirmer
          </label>
          <input
            type="password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            minLength={8}
            required
            autoComplete="new-password"
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">8 caractères minimum.</p>
      <MessageForm message={message} />
      <button type="submit" disabled={isPending} className={BOUTON_PRIMAIRE}>
        {isPending ? "Modification..." : "Changer le mot de passe"}
      </button>
    </form>
  );
}
