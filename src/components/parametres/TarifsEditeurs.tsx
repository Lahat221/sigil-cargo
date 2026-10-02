"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sauvegarderProduit,
  sauvegarderDestination,
  supprimerDestination,
} from "@/app/(dashboard)/parametres/actions";
import { IconTrash } from "@/components/ui/Icons";
import { BOUTON_PRIMAIRE, INPUT_CLASS } from "./styles";

export type ProduitLigne = {
  id: string;
  nom: string;
  prix_par_kg: number;
  actif: boolean;
};

export type DestinationLigne = {
  id: string;
  nom: string;
  tarif_par_kg: number | null;
  ordre: number;
  actif: boolean;
};

function ligneVideProduit(): ProduitLigne {
  return { id: "", nom: "", prix_par_kg: 0, actif: true };
}

function ligneVideDestination(ordre: number): DestinationLigne {
  return { id: "", nom: "", tarif_par_kg: null, ordre, actif: true };
}

function LigneProduit({ produit }: { produit: ProduitLigne }) {
  const router = useRouter();
  const nouveau = produit.id === "";
  const [nom, setNom] = useState(produit.nom);
  const [prix, setPrix] = useState(nouveau ? "" : String(produit.prix_par_kg));
  const [actif, setActif] = useState(produit.actif);
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const modifie =
    nouveau ||
    nom !== produit.nom ||
    prix !== String(produit.prix_par_kg) ||
    actif !== produit.actif;

  function enregistrer() {
    setErreur(null);
    startTransition(async () => {
      const r = await sauvegarderProduit({
        id: nouveau ? undefined : produit.id,
        nom,
        prix: parseFloat(prix),
        actif,
      });
      if ("error" in r) {
        setErreur(r.error);
        return;
      }
      if (nouveau) {
        setNom("");
        setPrix("");
        setActif(true);
      }
      router.refresh();
    });
  }

  return (
    <div className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder={nouveau ? "Nouveau produit" : "Nom"}
          className={`${INPUT_CLASS} min-w-[160px] flex-1`}
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={prix}
          onChange={(e) => setPrix(e.target.value)}
          placeholder="Prix / kg"
          className={`${INPUT_CLASS} w-28`}
        />
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={actif}
            onChange={(e) => setActif(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Actif
        </label>
        <button
          type="button"
          onClick={enregistrer}
          disabled={isPending || !modifie || !nom.trim() || !prix}
          className={BOUTON_PRIMAIRE}
        >
          {isPending ? "..." : nouveau ? "Ajouter" : "Enregistrer"}
        </button>
      </div>
      {erreur && <p className="mt-1.5 text-sm text-red-600">{erreur}</p>}
    </div>
  );
}

export function ProduitsEditeur({ produits }: { produits: ProduitLigne[] }) {
  return (
    <div className="divide-y divide-slate-100">
      {produits.map((p) => (
        <LigneProduit key={`${p.id}-${p.nom}-${p.prix_par_kg}-${p.actif}`} produit={p} />
      ))}
      <LigneProduit produit={ligneVideProduit()} />
    </div>
  );
}

function LigneDestination({ destination }: { destination: DestinationLigne }) {
  const router = useRouter();
  const nouveau = destination.id === "";
  const [nom, setNom] = useState(destination.nom);
  const [tarif, setTarif] = useState(
    destination.tarif_par_kg === null ? "" : String(destination.tarif_par_kg)
  );
  const [ordre, setOrdre] = useState(String(destination.ordre));
  const [actif, setActif] = useState(destination.actif);
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const modifie =
    nouveau ||
    nom !== destination.nom ||
    tarif !== (destination.tarif_par_kg === null ? "" : String(destination.tarif_par_kg)) ||
    ordre !== String(destination.ordre) ||
    actif !== destination.actif;

  function enregistrer() {
    setErreur(null);
    startTransition(async () => {
      const r = await sauvegarderDestination({
        id: nouveau ? undefined : destination.id,
        nom,
        tarif: tarif.trim() === "" ? null : parseFloat(tarif),
        ordre: parseInt(ordre, 10) || 0,
        actif,
      });
      if ("error" in r) {
        setErreur(r.error);
        return;
      }
      if (nouveau) {
        setNom("");
        setTarif("");
        setActif(true);
      }
      router.refresh();
    });
  }

  function supprimer() {
    if (!confirm(`Supprimer la destination "${destination.nom}" ? Les colis déjà enregistrés la conservent.`)) {
      return;
    }
    startTransition(async () => {
      const r = await supprimerDestination(destination.id);
      if ("error" in r) {
        setErreur(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder={nouveau ? "Nouvelle destination" : "Ville"}
          className={`${INPUT_CLASS} min-w-[160px] flex-1`}
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={tarif}
          onChange={(e) => setTarif(e.target.value)}
          placeholder="Tarif / kg"
          className={`${INPUT_CLASS} w-28`}
        />
        <input
          type="number"
          value={ordre}
          onChange={(e) => setOrdre(e.target.value)}
          title="Ordre d'affichage"
          className={`${INPUT_CLASS} w-20`}
        />
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={actif}
            onChange={(e) => setActif(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Active
        </label>
        <button
          type="button"
          onClick={enregistrer}
          disabled={isPending || !modifie || !nom.trim()}
          className={BOUTON_PRIMAIRE}
        >
          {isPending ? "..." : nouveau ? "Ajouter" : "Enregistrer"}
        </button>
        {!nouveau && (
          <button
            type="button"
            onClick={supprimer}
            disabled={isPending}
            aria-label={`Supprimer ${destination.nom}`}
            className="rounded-md p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <IconTrash size={15} />
          </button>
        )}
      </div>
      {erreur && <p className="mt-1.5 text-sm text-red-600">{erreur}</p>}
    </div>
  );
}

export function DestinationsEditeur({
  destinations,
}: {
  destinations: DestinationLigne[];
}) {
  const prochainOrdre =
    destinations.reduce((max, d) => Math.max(max, d.ordre), 0) + 1;

  return (
    <div className="divide-y divide-slate-100">
      {destinations.map((d) => (
        <LigneDestination
          key={`${d.id}-${d.nom}-${d.tarif_par_kg}-${d.ordre}-${d.actif}`}
          destination={d}
        />
      ))}
      <LigneDestination destination={ligneVideDestination(prochainOrdre)} />
    </div>
  );
}
