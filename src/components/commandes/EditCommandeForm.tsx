"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { updateCommande } from "@/app/(dashboard)/commandes/actions";
import { ClientField, type ClientSelection } from "./ClientField";
import type { ClientMatch } from "@/app/(dashboard)/commandes/nouvelle/actions";
import { VoiceRecorder, extensionForMimeType } from "./VoiceRecorder";
import { VideoPreviewList } from "./VideoPreviewList";

const MAX_PHOTOS = 5;
const MAX_VIDEOS = 4;
const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

type Produit = { id: string; nom: string; prix_par_kg: number };
type Projet = { id: string; nom: string };
type ExistingMedia = { path: string; url: string };

export function EditCommandeForm({
  commandeId,
  initialClient,
  initialProjetId,
  initialProduitId,
  initialPoidsKg,
  initialPrixParKg,
  initialEnveloppe,
  initialNombrePaquets,
  initialAdresseLivraison,
  initialDescription,
  initialRemarqueInterne,
  existingPhotos,
  existingVideos,
  existingVoiceNote,
  produits,
  projets,
}: {
  commandeId: string;
  initialClient: ClientMatch;
  initialProjetId: string;
  initialProduitId: string;
  initialPoidsKg: number;
  initialPrixParKg: number;
  initialEnveloppe: boolean;
  initialNombrePaquets: number;
  initialAdresseLivraison: string;
  initialDescription: string;
  initialRemarqueInterne: string;
  existingPhotos: ExistingMedia[];
  existingVideos: ExistingMedia[];
  existingVoiceNote: ExistingMedia | null;
  produits: Produit[];
  projets: Projet[];
}) {
  const router = useRouter();

  const [clientSelection, setClientSelection] = useState<ClientSelection>({
    clientId: initialClient.id,
    nouveauClient: null,
  });
  const [projetId, setProjetId] = useState(initialProjetId);
  const [produitId, setProduitId] = useState(initialProduitId);
  const [prixParKg, setPrixParKg] = useState(initialPrixParKg.toString());
  const [poidsKg, setPoidsKg] = useState(initialPoidsKg.toString());
  const [enveloppe, setEnveloppe] = useState(initialEnveloppe);
  const [nombrePaquets, setNombrePaquets] = useState(initialNombrePaquets);
  const [adresseLivraison, setAdresseLivraison] = useState(
    initialAdresseLivraison
  );
  const [description, setDescription] = useState(initialDescription);
  const [remarqueInterne, setRemarqueInterne] = useState(
    initialRemarqueInterne
  );
  const [keptPhotos, setKeptPhotos] = useState(existingPhotos);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [keptVideos, setKeptVideos] = useState(existingVideos);
  const [newVideos, setNewVideos] = useState<File[]>([]);
  const [keepVoiceNote, setKeepVoiceNote] = useState(existingVoiceNote !== null);
  const [newVoiceNote, setNewVoiceNote] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleProduitChange(id: string) {
    setProduitId(id);
    const p = produits.find((p) => p.id === id);
    if (p) setPrixParKg(p.prix_par_kg.toString());
  }

  const montantEstime = (() => {
    const poids = parseFloat(poidsKg);
    const prix = parseFloat(prixParKg);
    if (Number.isNaN(poids) || Number.isNaN(prix)) return null;
    return poids * prix + (enveloppe ? 15 : 0);
  })();

  function handleNewPhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const remaining = MAX_PHOTOS - keptPhotos.length;
    const files = Array.from(e.target.files ?? []).slice(0, remaining);
    setNewPhotos(files);
  }

  function handleNewVideosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const remaining = MAX_VIDEOS - keptVideos.length;
    const files = Array.from(e.target.files ?? []).slice(0, remaining);
    setNewVideos(files);
  }

  function handleRemoveNewVideo(index: number) {
    setNewVideos((vs) => vs.filter((_, i) => i !== index));
  }

  const clientPret =
    clientSelection.clientId !== null ||
    ((clientSelection.nouveauClient?.nom.trim().length ?? 0) > 0 &&
      (clientSelection.nouveauClient?.telephone.trim().length ?? 0) > 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!clientPret) {
      setError("Le nom et le téléphone du client sont requis.");
      return;
    }
    const poids = parseFloat(poidsKg);
    if (Number.isNaN(poids) || poids <= 0) {
      setError("Indique un poids valide.");
      return;
    }
    const prix = parseFloat(prixParKg);
    if (Number.isNaN(prix) || prix < 0) {
      setError("Indique un prix par kg valide.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    try {
      const photoPaths: string[] = keptPhotos.map((p) => p.path);
      for (let i = 0; i < newPhotos.length; i++) {
        const file = newPhotos[i];
        const path = `${commandeId}/photo-${Date.now()}-${i}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("commandes-media")
          .upload(path, file);
        if (uploadError) throw new Error(uploadError.message);
        photoPaths.push(path);
      }

      const videoPaths: string[] = keptVideos.map((v) => v.path);
      for (let i = 0; i < newVideos.length; i++) {
        const file = newVideos[i];
        const path = `${commandeId}/video-${Date.now()}-${i}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("commandes-media")
          .upload(path, file);
        if (uploadError) throw new Error(uploadError.message);
        videoPaths.push(path);
      }

      let noteVocalePath: string | null =
        keepVoiceNote && existingVoiceNote ? existingVoiceNote.path : null;
      if (newVoiceNote) {
        const contentType = newVoiceNote.type || "audio/webm";
        const path = `${commandeId}/note-vocale-${Date.now()}.${extensionForMimeType(contentType)}`;
        const { error: uploadError } = await supabase.storage
          .from("commandes-media")
          .upload(path, newVoiceNote, { contentType });
        if (uploadError) throw new Error(uploadError.message);
        noteVocalePath = path;
      }

      const result = await updateCommande(commandeId, {
        clientId: clientSelection.clientId,
        nouveauClient: clientSelection.nouveauClient,
        projetId,
        produitId,
        poidsKg: poids,
        prixParKg: prix,
        enveloppe,
        nombrePaquets,
        adresseLivraison,
        description,
        remarqueInterne,
        photoPaths,
        videoPaths,
        noteVocalePath,
      });

      if ("error" in result) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      router.push(`/commandes/${commandeId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-2xl space-y-5 rounded-xl border border-slate-200/70 bg-white shadow-sm p-6"
    >
      <ClientField onChange={setClientSelection} initialSelected={initialClient} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Projet
          </label>
          <select
            value={projetId}
            onChange={(e) => setProjetId(e.target.value)}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
          >
            {projets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Produit (tarif/kg)
          </label>
          <select
            value={produitId}
            onChange={(e) => handleProduitChange(e.target.value)}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
          >
            {produits.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom} — {montantFormatter.format(p.prix_par_kg)}/kg
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Poids (kg)
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            required
            value={poidsKg}
            onChange={(e) => setPoidsKg(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Prix par kg (modifiable)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={prixParKg}
            onChange={(e) => setPrixParKg(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Nombre de paquets
          </label>
          <input
            type="number"
            min="1"
            value={nombrePaquets}
            onChange={(e) => setNombrePaquets(Number(e.target.value))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={enveloppe}
          onChange={(e) => setEnveloppe(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Option enveloppe (+15 €)
      </label>

      <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">
        <span className="text-slate-500">Montant estimé : </span>
        <span className="font-semibold text-slate-900">
          {montantEstime !== null ? montantFormatter.format(montantEstime) : "—"}
        </span>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Adresse de livraison
        </label>
        <input
          type="text"
          value={adresseLivraison}
          onChange={(e) => setAdresseLivraison(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Remarque interne
        </label>
        <textarea
          value={remarqueInterne}
          onChange={(e) => setRemarqueInterne(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Photos ({keptPhotos.length + newPhotos.length}/{MAX_PHOTOS})
          </label>
          {keptPhotos.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {keptPhotos.map((photo) => (
                <div key={photo.path} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt="Photo existante"
                    className="h-16 w-16 rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setKeptPhotos((ps) =>
                        ps.filter((p) => p.path !== photo.path)
                      )
                    }
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {keptPhotos.length < MAX_PHOTOS && (
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleNewPhotosChange}
              className="w-full text-sm"
            />
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Vidéos ({keptVideos.length + newVideos.length}/{MAX_VIDEOS})
          </label>
          {keptVideos.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {keptVideos.map((videoItem) => (
                <div key={videoItem.path} className="relative">
                  <video src={videoItem.url} controls className="h-16 rounded-md" />
                  <button
                    type="button"
                    onClick={() =>
                      setKeptVideos((vs) =>
                        vs.filter((v) => v.path !== videoItem.path)
                      )
                    }
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <VideoPreviewList files={newVideos} onRemove={handleRemoveNewVideo} />
          {keptVideos.length < MAX_VIDEOS && (
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleNewVideosChange}
              className="w-full text-sm"
            />
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Note vocale
        </label>
        <VoiceRecorder
          onChange={setNewVoiceNote}
          existingUrl={keepVoiceNote ? existingVoiceNote?.url ?? null : null}
          onRemoveExisting={() => setKeepVoiceNote(false)}
        />
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
        {submitting ? "Enregistrement..." : "Enregistrer les modifications"}
      </button>
    </form>
  );
}
