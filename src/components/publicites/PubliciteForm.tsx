"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  createPublicite,
  updatePublicite,
} from "@/app/(dashboard)/publicites/actions";
import type { Database } from "@/types/database.types";

type TypePublicite = Database["public"]["Tables"]["publicites"]["Row"]["type"];

const TYPE_LABELS: Record<TypePublicite, string> = {
  affiche_depart: "Affiche de départ",
  publicite: "Publicité",
  reseau_social: "Réseau social",
};

export function PubliciteForm({
  publiciteId,
  initialType = "affiche_depart",
  initialTitre = "",
  initialLien = "",
  initialImagePath = null,
  initialImageUrl = null,
  initialActif = true,
  initialOrdre = 0,
}: {
  publiciteId?: string;
  initialType?: TypePublicite;
  initialTitre?: string;
  initialLien?: string;
  initialImagePath?: string | null;
  initialImageUrl?: string | null;
  initialActif?: boolean;
  initialOrdre?: number;
}) {
  const router = useRouter();

  const [type, setType] = useState<TypePublicite>(initialType);
  const [titre, setTitre] = useState(initialTitre);
  const [lien, setLien] = useState(initialLien);
  const [imagePath, setImagePath] = useState(initialImagePath);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(initialImageUrl);
  const [nouvelleImage, setNouvelleImage] = useState<File | null>(null);
  const [actif, setActif] = useState(initialActif);
  const [ordre, setOrdre] = useState(initialOrdre);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageUtile = type !== "reseau_social";

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNouvelleImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function handleRemoveImage() {
    setNouvelleImage(null);
    setImagePreviewUrl(null);
    setImagePath(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!titre.trim()) {
      setError("Le titre est requis.");
      return;
    }
    if (type === "reseau_social" && !lien.trim()) {
      setError("Le lien du profil est requis pour un réseau social.");
      return;
    }
    if (imageUtile && !imagePath && !nouvelleImage) {
      setError("Une image est requise pour ce type.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();
      let cheminImage = imagePath;

      if (nouvelleImage) {
        const chemin = `${type}/${Date.now()}-${nouvelleImage.name}`;
        const { error: uploadError } = await supabase.storage
          .from("publicites-media")
          .upload(chemin, nouvelleImage);
        if (uploadError) throw new Error(uploadError.message);
        cheminImage = chemin;
      }

      const input = {
        type,
        titre,
        lien,
        imagePath: imageUtile ? cheminImage : null,
        actif,
        ordre,
      };

      const result = publiciteId
        ? await updatePublicite(publiciteId, input)
        : await createPublicite(input);

      if ("error" in result) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      router.push("/publicites");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-lg space-y-5 rounded-xl border border-slate-200/70 bg-white shadow-sm p-6"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as TypePublicite)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
        >
          {Object.entries(TYPE_LABELS).map(([valeur, label]) => (
            <option key={valeur} value={valeur}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Titre
        </label>
        <input
          type="text"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder={
            type === "reseau_social" ? "Ex. TikTok" : "Ex. Départ 05/10/2026"
          }
          required
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          {type === "reseau_social"
            ? "Lien du profil"
            : "Lien (optionnel — au clic sur l'image)"}
        </label>
        <input
          type="url"
          value={lien}
          onChange={(e) => setLien(e.target.value)}
          placeholder="https://..."
          required={type === "reseau_social"}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
        />
      </div>

      {imageUtile && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Image
          </label>
          {imagePreviewUrl && (
            <div className="mb-2 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreviewUrl}
                alt="Aperçu"
                className="h-24 w-24 rounded-md border border-slate-200 object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-sm text-red-600 hover:underline"
              >
                Retirer
              </button>
            </div>
          )}
          {!imagePreviewUrl && (
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-sm"
            />
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Ordre d&apos;affichage
          </label>
          <input
            type="number"
            value={ordre}
            onChange={(e) => setOrdre(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={actif}
            onChange={(e) => setActif(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Visible sur le site
        </label>
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
        {submitting ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
