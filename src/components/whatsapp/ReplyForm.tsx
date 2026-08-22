"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { envoyerReponseWhatsApp } from "@/app/(dashboard)/notifications-whatsapp/actions";
import { VoiceRecorder } from "@/components/commandes/VoiceRecorder";
import { IconPaperclip, IconSend, IconX } from "@/components/ui/Icons";

type Piece = { blob: Blob; type: string; nom: string; previewUrl: string };

export function ReplyForm({
  telephone,
  clientId,
}: {
  telephone: string;
  clientId: string | null;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [texte, setTexte] = useState("");
  const [piece, setPiece] = useState<Piece | null>(null);
  const [modeVocal, setModeVocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(file: File | null) {
    if (!file) return;
    setModeVocal(false);
    setPiece({
      blob: file,
      type: file.type,
      nom: file.name,
      previewUrl: URL.createObjectURL(file),
    });
  }

  function handleVoiceChange(blob: Blob | null) {
    if (!blob) {
      setPiece(null);
      return;
    }
    setPiece({
      blob,
      type: blob.type || "audio/webm",
      nom: "note-vocale.webm",
      previewUrl: URL.createObjectURL(blob),
    });
  }

  function retirerPiece() {
    setPiece(null);
    setModeVocal(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!texte.trim() && !piece) return;
    setError(null);

    startTransition(async () => {
      try {
        let mediaPath: string | null = null;
        if (piece) {
          const supabase = createClient();
          const path = `conversations/${crypto.randomUUID()}-${piece.nom}`;
          const { error: uploadError } = await supabase.storage
            .from("campagnes-media")
            .upload(path, piece.blob, { contentType: piece.type });
          if (uploadError) throw new Error(uploadError.message);
          mediaPath = path;
        }

        const result = await envoyerReponseWhatsApp(
          telephone,
          clientId,
          texte,
          mediaPath,
          piece?.type ?? null
        );
        if ("error" in result) {
          setError(result.error);
          return;
        }
        setTexte("");
        retirerPiece();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inattendue.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-200 p-3">
      {error && (
        <p className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}

      {modeVocal && !piece && (
        <div className="mb-2">
          <VoiceRecorder onChange={handleVoiceChange} />
        </div>
      )}

      {piece && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          {piece.type.startsWith("image/") ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={piece.previewUrl} alt="" className="h-10 w-10 rounded object-cover" />
          ) : piece.type.startsWith("video/") ? (
            <video src={piece.previewUrl} className="h-10 w-10 rounded object-cover" />
          ) : (
            <audio src={piece.previewUrl} controls className="h-9 max-w-[200px]" />
          )}
          <span className="flex-1 truncate text-xs text-slate-600">{piece.nom}</span>
          <button
            type="button"
            onClick={retirerPiece}
            className="shrink-0 text-slate-400 hover:text-red-600"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!!piece}
            title="Joindre une photo ou vidéo"
            className="rounded-md border border-slate-300 p-2.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
          >
            <IconPaperclip size={16} />
          </button>
          {!piece && (
            <button
              type="button"
              onClick={() => setModeVocal((v) => !v)}
              title="Note vocale"
              className={`rounded-md border p-2.5 transition-colors ${
                modeVocal
                  ? "border-navy bg-navy/5 text-navy"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              🎙️
            </button>
          )}
        </div>
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
          disabled={isPending || (!texte.trim() && !piece)}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          <IconSend size={15} />
          {isPending ? "..." : "Envoyer"}
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        Fonctionne librement dans les 24h suivant le dernier message du
        client. Au-delà, utilise une campagne avec un modèle approuvé.
      </p>
    </form>
  );
}
