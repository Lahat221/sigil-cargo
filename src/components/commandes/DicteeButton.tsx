"use client";

import { useEffect, useRef, useState } from "react";
import { transcrireDescription } from "@/app/(dashboard)/commandes/dictee/actions";
import { IconMic } from "@/components/ui/Icons";
import { extensionForMimeType, pickSupportedMimeType } from "./VoiceRecorder";

/** Durée maximale d'une dictée : au-delà l'enregistrement s'arrête tout seul. */
const DUREE_MAX_S = 120;

/** Ajoute le texte dicté à ce qui est déjà écrit (virgule si la phrase précédente n'est pas terminée). */
export function ajouterTexteDicte(existant: string, ajout: string): string {
  const base = existant.trim();
  if (!base) return ajout;
  return /[.!?,;:]$/.test(base) ? `${base} ${ajout}` : `${base}, ${ajout}`;
}

/**
 * Dicter une description : l'agent parle, l'enregistrement est transcrit en texte
 * (IA, avec les mots wolof courants) et ajouté au champ — modifiable ensuite.
 * Gagne du temps par rapport à la saisie au clavier. L'audio est transmis à
 * `onAudio` : conservé avec le colis, il permet de réécouter pour corriger le texte.
 */
export function DicteeButton({
  onTexte,
  onAudio,
}: {
  onTexte: (texte: string) => void;
  /** Reçoit l'enregistrement (même si la transcription échoue) pour le garder avec le colis. */
  onAudio?: (audio: Blob) => void;
}) {
  const [etat, setEtat] = useState<"repos" | "enregistre" | "transcrit">("repos");
  const [secondes, setSecondes] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const morceauxRef = useRef<Blob[]>([]);
  const annuleRef = useRef(false);

  // Chronomètre + arrêt automatique.
  useEffect(() => {
    if (etat !== "enregistre") return;
    const minuteur = setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => clearInterval(minuteur);
  }, [etat]);
  useEffect(() => {
    if (etat === "enregistre" && secondes >= DUREE_MAX_S) arreter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondes, etat]);

  async function demarrer() {
    setErreur(null);
    annuleRef.current = false;
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(flux, { mimeType }) : new MediaRecorder(flux);
      morceauxRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) morceauxRef.current.push(e.data);
      };
      recorder.onerror = () => {
        setErreur("Erreur pendant l'enregistrement. Réessaie.");
        setEtat("repos");
        flux.getTracks().forEach((t) => t.stop());
      };
      recorder.onstop = () => {
        flux.getTracks().forEach((t) => t.stop());
        if (annuleRef.current) {
          setEtat("repos");
          return;
        }
        const type = recorder.mimeType || mimeType || "audio/webm";
        void transcrire(new Blob(morceauxRef.current, { type }), type);
      };
      recorder.start();
      recorderRef.current = recorder;
      setSecondes(0);
      setEtat("enregistre");
    } catch (err) {
      setErreur(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Accès au micro refusé. Autorise le micro dans les réglages du navigateur."
          : "Impossible d'accéder au micro."
      );
    }
  }

  function arreter() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function annuler() {
    annuleRef.current = true;
    arreter();
  }

  async function transcrire(blob: Blob, type: string) {
    if (blob.size === 0) {
      setErreur("Aucun son n'a été capté. Réessaie.");
      setEtat("repos");
      return;
    }
    onAudio?.(blob);
    setEtat("transcrit");
    const formData = new FormData();
    formData.append("audio", new File([blob], `dictee.${extensionForMimeType(type)}`, { type }));
    try {
      const resultat = await transcrireDescription(formData);
      if ("error" in resultat) setErreur(resultat.error);
      else onTexte(resultat.texte);
    } catch {
      setErreur("Transcription impossible (connexion ?). Réessaie.");
    }
    setEtat("repos");
  }

  const minutes = String(Math.floor(secondes / 60)).padStart(2, "0");
  const reste = String(secondes % 60).padStart(2, "0");

  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2">
      {erreur && <span className="text-xs text-red-600">{erreur}</span>}
      {etat === "enregistre" && (
        <button
          type="button"
          onClick={annuler}
          className="text-xs text-slate-500 hover:underline"
        >
          Annuler
        </button>
      )}
      <button
        type="button"
        onClick={etat === "enregistre" ? arreter : demarrer}
        disabled={etat === "transcrit"}
        title="Dicter la description à voix haute : elle est transcrite en texte"
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60 ${
          etat === "enregistre"
            ? "animate-pulse border-red-300 bg-red-50 text-red-700"
            : "border-slate-300 text-slate-700 hover:bg-slate-50"
        }`}
      >
        <IconMic size={14} />
        {etat === "enregistre"
          ? `Arrêter et transcrire (${minutes}:${reste})`
          : etat === "transcrit"
            ? "Transcription..."
            : "Dicter"}
      </button>
    </span>
  );
}
