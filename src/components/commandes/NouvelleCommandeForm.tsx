"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createCommande } from "@/app/(dashboard)/commandes/nouvelle/actions";
import { ClientField, type ClientSelection } from "./ClientField";

const MAX_PHOTOS = 5;
const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

type Produit = { id: string; nom: string; prix_par_kg: number };
type Projet = { id: string; nom: string };

export function NouvelleCommandeForm({
  produits,
  projets,
}: {
  produits: Produit[];
  projets: Projet[];
}) {
  const router = useRouter();

  const [clientSelection, setClientSelection] = useState<ClientSelection>({
    clientId: null,
    nouveauClient: null,
  });
  const [projetId, setProjetId] = useState(projets[0]?.id ?? "");
  const [produitId, setProduitId] = useState(produits[0]?.id ?? "");
  const [prixParKg, setPrixParKg] = useState(
    produits[0]?.prix_par_kg.toString() ?? ""
  );
  const [poidsKg, setPoidsKg] = useState("");
  const [enveloppe, setEnveloppe] = useState(false);
  const [nombrePaquets, setNombrePaquets] = useState(1);
  const [adresseLivraison, setAdresseLivraison] = useState("");
  const [description, setDescription] = useState("");
  const [remarqueInterne, setRemarqueInterne] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montantEstime = useMemo(() => {
    const poids = parseFloat(poidsKg);
    const prix = parseFloat(prixParKg);
    if (Number.isNaN(poids) || Number.isNaN(prix)) return null;
    return poids * prix + (enveloppe ? 15 : 0);
  }, [poidsKg, prixParKg, enveloppe]);

  function handleProduitChange(id: string) {
    setProduitId(id);
    const p = produits.find((p) => p.id === id);
    if (p) setPrixParKg(p.prix_par_kg.toString());
  }

  function handlePhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS);
    setPhotos(files);
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
    if (!projetId) {
      setError("Sélectionne un projet.");
      return;
    }
    if (!produitId) {
      setError("Sélectionne un produit.");
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
    const commandeId = crypto.randomUUID();
    const supabase = createClient();

    try {
      const photoPaths: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const file = photos[i];
        const path = `${commandeId}/photo-${i}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("commandes-media")
          .upload(path, file);
        if (uploadError) throw new Error(uploadError.message);
        photoPaths.push(path);
      }

      let videoPath: string | null = null;
      if (video) {
        const path = `${commandeId}/video-${video.name}`;
        const { error: uploadError } = await supabase.storage
          .from("commandes-media")
          .upload(path, video);
        if (uploadError) throw new Error(uploadError.message);
        videoPath = path;
      }

      const result = await createCommande({
        commandeId,
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
        videoPath,
      });

      if ("error" in result) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      router.push("/commandes");
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
      <ClientField onChange={setClientSelection} />

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
            {projets.length === 0 && <option value="">Aucun projet actif</option>}
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
            {produits.length === 0 && <option value="">Aucun produit actif</option>}
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
            step="0.1"
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
            Photos ({photos.length}/{MAX_PHOTOS})
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotosChange}
            className="w-full text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Vidéo (max 1)
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </div>
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
        {submitting ? "Création en cours..." : "Créer la commande"}
      </button>
    </form>
  );
}
