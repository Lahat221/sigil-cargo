"use client";

import { useRef, useState } from "react";
import { IconMic } from "@/components/ui/Icons";

// Safari/iOS ne supporte pas audio/webm : on négocie un format que le
// navigateur sait vraiment encoder plutôt que de laisser le défaut
// implicite (qui peut être vide sur certains WebView Android/iOS).
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/aac",
  "audio/mpeg",
];

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  return MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

export function extensionForMimeType(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("aac")) return "aac";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export function VoiceRecorder({
  onChange,
  existingUrl,
  onRemoveExisting,
}: {
  onChange: (blob: Blob | null) => void;
  existingUrl?: string | null;
  onRemoveExisting?: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedMimeType();
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = () => {
        setError("Erreur pendant l'enregistrement. Réessaie.");
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.onstop = () => {
        if (chunksRef.current.length === 0) {
          setError("Aucun son n'a été capté. Réessaie.");
          return;
        }
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || mimeType || "audio/webm",
        });
        setPreviewUrl(URL.createObjectURL(blob));
        onChange(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Accès au micro refusé. Autorise le micro dans les réglages de ton navigateur."
          : "Impossible d'accéder au micro."
      );
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function supprimer() {
    setPreviewUrl(null);
    onChange(null);
    onRemoveExisting?.();
  }

  const noteActuelle = previewUrl ?? existingUrl ?? null;

  return (
    <div>
      {noteActuelle ? (
        <div className="flex items-center gap-2">
          <audio src={noteActuelle} controls className="h-9 max-w-[220px]" />
          <button
            type="button"
            onClick={supprimer}
            className="text-xs font-medium text-red-600 hover:underline"
          >
            Supprimer
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            recording
              ? "animate-pulse border-red-300 bg-red-50 text-red-700"
              : "border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <IconMic size={16} />
          {recording ? "Arrêter l'enregistrement" : "Enregistrer une note vocale"}
        </button>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
