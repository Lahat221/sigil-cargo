"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { envoyerReponseWhatsApp } from "@/app/(dashboard)/notifications-whatsapp/actions";
import { IconSend } from "@/components/ui/Icons";

export function ReplyForm({
  telephone,
  clientId,
}: {
  telephone: string;
  clientId: string | null;
}) {
  const router = useRouter();
  const [texte, setTexte] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!texte.trim()) return;
    setError(null);

    startTransition(async () => {
      const result = await envoyerReponseWhatsApp(telephone, clientId, texte);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setTexte("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3">
      {error && (
        <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Écrire une réponse..."
          className="flex-1 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
        />
        <button
          type="submit"
          disabled={isPending || !texte.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          <IconSend size={15} />
          {isPending ? "..." : "Envoyer"}
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        La réponse fonctionne librement dans les 24h suivant le dernier
        message du client. Au-delà, utilise une campagne avec un modèle
        approuvé.
      </p>
    </form>
  );
}
