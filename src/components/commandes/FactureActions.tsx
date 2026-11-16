"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toPng } from "html-to-image";
import { IconDownload } from "@/components/ui/Icons";

/**
 * Boutons de la facture. « Imprimer » (window.print) ne fait rien dans l'appli installée
 * sur l'écran d'accueil d'un iPhone : on propose donc un vrai PDF, partagé via le menu natif
 * du téléphone (WhatsApp, Fichiers, Mail…) ou téléchargé sur ordinateur.
 */
export function FactureActions({ cibleId, nomFichier }: { cibleId: string; nomFichier: string }) {
  const searchParams = useSearchParams();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("print") === "1") window.print();
  }, [searchParams]);

  async function genererPdf(): Promise<File> {
    const noeud = document.getElementById(cibleId);
    if (!noeud) throw new Error("Facture introuvable");
    const dataUrl = await toPng(noeud, { backgroundColor: "#ffffff", pixelRatio: 2 });
    const image = new Image();
    image.src = dataUrl;
    await image.decode();

    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const marge = 10;
    const largeurMax = 210 - marge * 2;
    const hauteurMax = 297 - marge * 2;
    const ratio = image.naturalWidth / image.naturalHeight;
    let largeur = largeurMax;
    let hauteur = largeur / ratio;
    if (hauteur > hauteurMax) {
      hauteur = hauteurMax;
      largeur = hauteur * ratio;
    }
    pdf.addImage(dataUrl, "PNG", (210 - largeur) / 2, marge, largeur, hauteur);
    return new File([pdf.output("blob")], `${nomFichier}.pdf`, { type: "application/pdf" });
  }

  async function telecharger() {
    setErreur(null);
    setEnCours(true);
    let fichier: File;
    try {
      fichier = await genererPdf();
    } catch {
      setErreur("Impossible de générer la facture. Réessayez.");
      setEnCours(false);
      return;
    }

    try {
      const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
      if (nav.share && (!nav.canShare || nav.canShare({ files: [fichier] }))) {
        await nav.share({ files: [fichier], title: nomFichier });
        return;
      }
      enregistrer(fichier);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return; // partage annulé
      try {
        enregistrer(fichier);
      } catch {
        setErreur("Le partage a échoué. Réessayez.");
      }
    } finally {
      setEnCours(false);
    }
  }

  function enregistrer(fichier: File) {
    const url = URL.createObjectURL(fichier);
    const a = document.createElement("a");
    a.href = url;
    a.download = fichier.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <div className="flex flex-col items-end gap-1 print:hidden">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={telecharger}
          disabled={enCours}
          className="flex items-center gap-1.5 rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-navy-2 disabled:opacity-60"
        >
          <IconDownload size={14} />
          {enCours ? "Création du PDF…" : "PDF / Partager"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="hidden rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 md:block"
        >
          Imprimer
        </button>
      </div>
      {erreur && <p className="text-xs text-red-600">{erreur}</p>}
    </div>
  );
}
