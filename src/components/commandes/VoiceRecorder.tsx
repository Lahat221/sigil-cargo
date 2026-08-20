"use client";

import { useRef, useState } from "react";
import { IconMic } from "@/components/ui/Icons";

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
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        setPreviewUrl(URL.createObjectURL(blob));
        onChange(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("Impossible d'accéder au micro.");
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
