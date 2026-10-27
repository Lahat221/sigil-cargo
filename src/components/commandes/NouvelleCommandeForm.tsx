"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createCommande } from "@/app/(dashboard)/commandes/nouvelle/actions";
import { ClientField, type ClientSelection } from "./ClientField";
import { VoiceRecorder, extensionForMimeType } from "./VoiceRecorder";
import { VideoPreviewList } from "./VideoPreviewList";
import {
  PaiementSaisie,
  SAISIE_VIDE,
  saisieEnBase,
  saisieVersInput,
  type SaisiePaiement,
} from "./PaiementSaisie";
import { deviseBase } from "@/lib/paiements";
import { montantColis, partAlimentaireKg, tarifsProposes } from "@/lib/prix";
import type { ReglesPrix } from "@/lib/parametres";
import {
  IndicationTarif,
  PartAlimentaire,
  tarifAlimentaireDisponible,
  versDestinationTarif,
} from "./TarifColisInfo";
import { BRAND } from "@/lib/brand";
import type { Destination } from "@/lib/commandes/destinations";

const MAX_PHOTOS = 5;
const MAX_VIDEOS = 4;
const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BRAND.devise,
});

type Produit = { id: string; nom: string; prix_par_kg: number };
type Projet = { id: string; nom: string; mode_fret: "aerien" | "conteneur" };

// Valeur de départ pratique pour le tarif au m³ (groupage conteneur) — le
// tenant peut toujours la modifier, ce n'est qu'un pré-remplissage.
const DEFAULT_PRIX_PAR_M3 = BRAND.slug === "ami-chine-dakar" ? "170000" : "";

export function NouvelleCommandeForm({
  produits,
  projets,
  destinations,
  regles,
}: {
  produits: Produit[];
  projets: Projet[];
  destinations: Destination[];
  regles: ReglesPrix;
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
  const [volumeM3, setVolumeM3] = useState("");
  const [prixParM3, setPrixParM3] = useState(DEFAULT_PRIX_PAR_M3);
  const [enveloppe, setEnveloppe] = useState(false);
  // Part alimentaire du colis (kg) et son prix : un même colis peut mélanger alimentaire et autres produits.
  const [poidsAlimentaire, setPoidsAlimentaire] = useState("");
  const [prixAlimentaire, setPrixAlimentaire] = useState("");
  // Tant qu'un prix n'est pas modifié à la main, il suit la destination et le poids.
  const [prixManuel, setPrixManuel] = useState(false);
  const [prixAlimManuel, setPrixAlimManuel] = useState(false);
  const [nombrePaquets, setNombrePaquets] = useState(1);
  const [adresseLivraison, setAdresseLivraison] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [remarqueInterne, setRemarqueInterne] = useState("");
  const [deposantEstClient, setDeposantEstClient] = useState(true);
  const [livreurNom, setLivreurNom] = useState("");
  const [livreurTelephone, setLivreurTelephone] = useState("");
  const [contenuVerifie, setContenuVerifie] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [voiceNote, setVoiceNote] = useState<Blob | null>(null);
  const [saisiePaiement, setSaisiePaiement] = useState<SaisiePaiement>(SAISIE_VIDE);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modeFret = useMemo(
    () => projets.find((p) => p.id === projetId)?.mode_fret ?? "aerien",
    [projets, projetId]
  );
  const enModeConteneur = BRAND.modeGroupageConteneurActif && modeFret === "conteneur";

  const montantEstime = useMemo(() => {
    if (enModeConteneur) {
      const volume = parseFloat(volumeM3);
      const prix = parseFloat(prixParM3);
      if (Number.isNaN(volume) || Number.isNaN(prix)) return null;
      return volume * prix + (enveloppe ? 15 : 0);
    }
    const poids = parseFloat(poidsKg);
    const prix = parseFloat(prixParKg);
    if (Number.isNaN(poids) || Number.isNaN(prix)) return null;
    const part = partAlimentaireKg(poids, parseFloat(poidsAlimentaire));
    const prixAlim = parseFloat(prixAlimentaire);
    return montantColis(poids, part, prix, Number.isNaN(prixAlim) ? prix : prixAlim) + (enveloppe ? 15 : 0);
  }, [enModeConteneur, volumeM3, prixParM3, poidsKg, prixParKg, poidsAlimentaire, prixAlimentaire, enveloppe]);

  // Tarifs au kilo proposés (autres produits et part alimentaire) d'après la
  // destination et le tarif « petit colis » sous le seuil de poids.
  // Modifiables ensuite à la main.
  function proposer(dest: string, poidsTexte: string) {
    const poids = parseFloat(poidsTexte);
    return tarifsProposes(
      versDestinationTarif(destinations, dest),
      Number.isNaN(poids) ? null : poids,
      regles
    );
  }

  function appliquerProposition(dest: string, poidsTexte: string, respecterManuel = false) {
    if (enModeConteneur) return;
    const t = proposer(dest, poidsTexte);
    if (t.autres && !(respecterManuel && prixManuel)) {
      setPrixParKg(t.autres.tarif.toString());
      setPrixManuel(false);
    }
    if (t.alimentaire && !(respecterManuel && prixAlimManuel)) {
      setPrixAlimentaire(t.alimentaire.tarif.toString());
      setPrixAlimManuel(false);
    }
  }

  function handleProduitChange(id: string) {
    setProduitId(id);
    const p = produits.find((p) => p.id === id);
    if (p) {
      const tarif = destination ? proposer(destination, poidsKg).autres?.tarif : undefined;
      setPrixParKg((tarif ?? p.prix_par_kg).toString());
      setPrixManuel(false);
    }
  }

  function handleDestinationChange(value: string) {
    setDestination(value);
    appliquerProposition(value, poidsKg);
  }

  function handlePoidsChange(value: string) {
    setPoidsKg(value);
    appliquerProposition(destination, value, true);
  }

  function handlePhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS);
    setPhotos(files);
  }

  function handleVideosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_VIDEOS);
    setVideos(files);
  }

  function handleRemoveVideo(index: number) {
    setVideos((vs) => vs.filter((_, i) => i !== index));
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
    // Poids optionnel dans tous les cas — souvent pas le temps de peser au
    // moment du dépôt (rempli plus tard via la fiche colis). En groupage
    // conteneur c'est de toute façon le volume qui fixe le prix.
    let poids: number | null = null;
    if (poidsKg.trim()) {
      poids = parseFloat(poidsKg);
      if (Number.isNaN(poids) || poids <= 0) {
        setError("Indique un poids valide.");
        return;
      }
    }
    // Part alimentaire du colis (même colis, deux tarifs).
    let poidsAlim: number | null = null;
    let prixAlim: number | null = null;
    if (!enModeConteneur && poidsAlimentaire.trim()) {
      const saisi = parseFloat(poidsAlimentaire);
      if (Number.isNaN(saisi) || saisi < 0) {
        setError("Indique un poids alimentaire valide.");
        return;
      }
      if (saisi > 0) {
        if (poids === null) {
          setError("Indique le poids total du colis pour répartir la part alimentaire.");
          return;
        }
        if (saisi > poids) {
          setError("La part alimentaire ne peut pas dépasser le poids total du colis.");
          return;
        }
        prixAlim = parseFloat(prixAlimentaire);
        if (Number.isNaN(prixAlim) || prixAlim < 0) {
          setError("Indique un prix alimentaire par kg valide.");
          return;
        }
        poidsAlim = saisi;
      }
    }
    let prix: number | null = null;
    let volume: number | null = null;
    let prixM3: number | null = null;
    if (enModeConteneur) {
      volume = parseFloat(volumeM3);
      if (Number.isNaN(volume) || volume <= 0) {
        setError("Indique un volume (m³) valide.");
        return;
      }
      prixM3 = parseFloat(prixParM3);
      if (Number.isNaN(prixM3) || prixM3 < 0) {
        setError("Indique un prix par m³ valide.");
        return;
      }
    } else {
      prix = parseFloat(prixParKg);
      if (Number.isNaN(prix) || prix < 0) {
        setError("Indique un prix par kg valide.");
        return;
      }
    }

    const paiement = saisieVersInput(saisiePaiement);
    if (paiement) {
      const verse = saisieEnBase(saisiePaiement);
      if (!Number.isFinite(verse) || verse <= 0) {
        setError("Indique un montant d'avance valide.");
        return;
      }
      // Le poids peut changer plus tard : on ne bloque que si l'estimation est connue.
      if (montantEstime !== null && verse > montantEstime * 1.001 + 0.02) {
        setError("L'avance dépasse le montant estimé du colis.");
        return;
      }
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

      const videoPaths: string[] = [];
      for (let i = 0; i < videos.length; i++) {
        const file = videos[i];
        const path = `${commandeId}/video-${i}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("commandes-media")
          .upload(path, file);
        if (uploadError) throw new Error(uploadError.message);
        videoPaths.push(path);
      }

      let noteVocalePath: string | null = null;
      if (voiceNote) {
        const contentType = voiceNote.type || "audio/webm";
        const path = `${commandeId}/note-vocale-${Date.now()}.${extensionForMimeType(contentType)}`;
        const { error: uploadError } = await supabase.storage
          .from("commandes-media")
          .upload(path, voiceNote, { contentType });
        if (uploadError) throw new Error(uploadError.message);
        noteVocalePath = path;
      }

      const result = await createCommande({
        commandeId,
        clientId: clientSelection.clientId,
        nouveauClient: clientSelection.nouveauClient,
        projetId,
        produitId,
        poidsKg: poids,
        prixParKg: prix,
        modeFret,
        volumeM3: volume,
        prixParM3: prixM3,
        enveloppe,
        poidsAlimentaireKg: poidsAlim,
        prixAlimentaireParKg: prixAlim,
        nombrePaquets,
        adresseLivraison,
        destination,
        description,
        remarqueInterne,
        livreurNom: deposantEstClient ? "" : livreurNom,
        livreurTelephone: deposantEstClient ? "" : livreurTelephone,
        contenuVerifie,
        photoPaths,
        videoPaths,
        noteVocalePath,
        paiement,
      });

      if ("error" in result) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      // Direction l'accusé de réception (prêt à imprimer/signer) plutôt que
      // la liste — les infos du colis qu'on vient de saisir y sont reprises
      // automatiquement, pas besoin de les retaper.
      router.push(`/commandes/${commandeId}/accuse-reception?print=1`);
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
            {enModeConteneur ? "Produit" : "Produit (tarif/kg)"}
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
                {p.nom}
                {!enModeConteneur && ` — ${montantFormatter.format(p.prix_par_kg)}/kg`}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Poids (kg) (optionnel)
          </label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={poidsKg}
            onChange={(e) => handlePoidsChange(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
          />
        </div>

        {enModeConteneur ? (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Volume (m³)
              </label>
              <input
                type="number"
                step="0.001"
                min="0"
                required
                value={volumeM3}
                onChange={(e) => setVolumeM3(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Prix par m³ (modifiable)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={prixParM3}
                onChange={(e) => setPrixParM3(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
              />
            </div>
          </>
        ) : (
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
              onChange={(e) => {
                setPrixParKg(e.target.value);
                setPrixManuel(true);
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
            />
            <IndicationTarif
              destinations={destinations}
              regles={regles}
              destination={destination}
              poidsKg={poidsKg}
              part="autres"
              prixSaisi={prixParKg}
            />
          </div>
        )}

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
        Option enveloppe (+{montantFormatter.format(15)})
      </label>

      {tarifAlimentaireDisponible(destinations) && !enModeConteneur && (
        <PartAlimentaire
          destinations={destinations}
          regles={regles}
          destination={destination}
          poidsKg={poidsKg}
          poidsAlimentaire={poidsAlimentaire}
          onPoidsAlimentaire={setPoidsAlimentaire}
          prixAlimentaire={prixAlimentaire}
          onPrixAlimentaire={(v) => {
            setPrixAlimentaire(v);
            setPrixAlimManuel(true);
          }}
        />
      )}

      <div className="rounded-md bg-slate-50 px-3 py-2 text-sm">
        <span className="text-slate-500">Montant estimé : </span>
        <span className="font-semibold text-slate-900">
          {montantEstime !== null ? montantFormatter.format(montantEstime) : "—"}
        </span>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 p-3">
        <div>
          <p className="text-sm font-medium text-slate-700">
            Avance versée à l&apos;enregistrement (optionnel)
          </p>
          <p className="text-xs text-slate-500">
            Acompte ou paiement complet, en {deviseBase() === "EUR" ? "euros ou en FCFA" : "FCFA ou en euros"}.
            Le reste se règle au retrait du colis. Laisser vide si rien n&apos;est payé maintenant.
          </p>
        </div>
        <PaiementSaisie
          valeur={saisiePaiement}
          onChange={setSaisiePaiement}
          cible={montantEstime}
        />
      </div>

      {destinations.length > 0 && (
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Destination
          </label>
          <select
            value={destination}
            onChange={(e) => handleDestinationChange(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
          >
            <option value="">— Non précisée —</option>
            {destinations.map((d) => (
              <option key={d.nom} value={d.nom}>
                {d.nom}
                {d.tarif_par_kg !== null &&
                  ` — ${montantFormatter.format(d.tarif_par_kg)}/kg`}
              </option>
            ))}
          </select>
        </div>
      )}

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

      <div className="rounded-md border border-slate-200 p-3">
        <p className="mb-2 text-sm font-medium text-slate-700">
          Déposé par (pour l&apos;accusé de réception)
        </p>
        <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={deposantEstClient}
            onChange={(e) => setDeposantEstClient(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Le client dépose lui-même son colis
        </label>
        {!deposantEstClient && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Nom du livreur
              </label>
              <input
                type="text"
                value={livreurNom}
                onChange={(e) => setLivreurNom(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Téléphone du livreur
              </label>
              <input
                type="text"
                value={livreurTelephone}
                onChange={(e) => setLivreurTelephone(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:ring-1 focus:ring-navy/20 focus:outline-none"
              />
            </div>
          </div>
        )}
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={contenuVerifie}
            onChange={(e) => setContenuVerifie(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Contenu vérifié maintenant
        </label>
        <p className="mt-1 text-xs text-slate-400">
          Laisse décoché si pas le temps — l&apos;accusé l&apos;indiquera, et tu
          pourras marquer le contenu comme vérifié plus tard.
        </p>
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
            Vidéos ({videos.length}/{MAX_VIDEOS})
          </label>
          <VideoPreviewList files={videos} onRemove={handleRemoveVideo} />
          <input
            type="file"
            accept="video/*"
            multiple
            onChange={handleVideosChange}
            className="w-full text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Note vocale
        </label>
        <VoiceRecorder onChange={setVoiceNote} />
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
        {submitting ? "Création en cours..." : "Créer le colis"}
      </button>
    </form>
  );
}
