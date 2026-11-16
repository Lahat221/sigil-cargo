"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toPng } from "html-to-image";
import { IconDownload, IconWhatsApp } from "@/components/ui/Icons";

function formatNumeroWhatsApp(telephone: string, telephonePays: string | null): string {
  const chiffres = telephone.replace(/\D/g, "");
  const indicatif = (telephonePays ?? "+33").replace(/\D/g, "");
  return chiffres.startsWith(indicatif) ? chiffres : indicatif + chiffres;
}

type NavigateurPartage = Navigator & { canShare?: (data: { files: File[] }) => boolean };

function peutPartager(fichier: File): boolean {
  const nav = navigator as NavigateurPartage;
  return Boolean(nav.share) && (!nav.canShare || nav.canShare({ files: [fichier] }));
}

function telecharger(fichier: File) {
  const url = URL.createObjectURL(fichier);
  const a = document.createElement("a");
  a.href = url;
  a.download = fichier.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Boutons de la facture. « Imprimer » (window.print) ne fait rien dans l'appli installée sur
 * l'écran d'accueil d'un iPhone : on propose donc un vrai PDF, à enregistrer ou à envoyer au
 * client par WhatsApp. Le PDF est préparé dès l'ouverture de la page : le menu de partage du
 * téléphone n'accepte de s'ouvrir que juste après un appui, pas après plusieurs secondes de calcul.
 */
export function FactureActions({
  cibleId,
  nomFichier,
  clientNom,
  clientTelephone,
  clientTelephonePays,
  numeroFacture,
}: {
  cibleId: string;
  nomFichier: string;
  clientNom: string | null;
  clientTelephone: string | null;
  clientTelephonePays: string | null;
  numeroFacture: string;
}) {
  const searchParams = useSearchParams();
  const pdf = useRef<File | null>(null);
  const [pret, setPret] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("print") === "1") window.print();
  }, [searchParams]);

  useEffect(() => {
    let annule = false;
    async function preparer() {
      try {
        // Laisse le logo et le cachet finir de se charger avant de photographier la facture.
        await new Promise((r) => setTimeout(r, 600));
        const noeud = document.getElementById(cibleId);
        if (!noeud) throw new Error("Facture introuvable");
        const dataUrl = await toPng(noeud, { backgroundColor: "#ffffff", pixelRatio: 2 });
        const image = new Image();
        image.src = dataUrl;
        await image.decode();

        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
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
        doc.addImage(dataUrl, "PNG", (210 - largeur) / 2, marge, largeur, hauteur);
        if (annule) return;
        pdf.current = new File([doc.output("blob")], `${nomFichier}.pdf`, { type: "application/pdf" });
        setPret(true);
      } catch {
        if (!annule) setErreur("Impossible de préparer le PDF. Rechargez la page.");
      }
    }
    void preparer();
    return () => {
      annule = true;
    };
  }, [cibleId, nomFichier]);

  /** Menu de partage du téléphone (WhatsApp, Fichiers, Mail…), ou téléchargement à défaut. */
  async function partager(): Promise<boolean> {
    const fichier = pdf.current;
    if (!fichier) return false;
    setErreur(null);
    try {
      if (peutPartager(fichier)) {
        await (navigator as NavigateurPartage).share({ files: [fichier], title: nomFichier });
      } else {
        telecharger(fichier);
      }
      return true;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return false; // partage annulé
      telecharger(fichier);
      return true;
    }
  }

  async function enregistrer() {
    setInfo(null);
    const fichier = pdf.current;
    if (!fichier) return;
    // Sur téléphone, le menu de partage propose « Enregistrer dans Fichiers » ; sur ordinateur, téléchargement direct.
    const tactile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    if (tactile && peutPartager(fichier)) {
      await partager();
    } else {
      telecharger(fichier);
    }
  }

  async function envoyerAuClient() {
    setInfo(null);
    const fichier = pdf.current;
    if (!fichier) return;
    if (peutPartager(fichier)) {
      await partager();
      return;
    }
    // Pas de partage de fichier (ordinateur) : le PDF est téléchargé et la discussion du client s'ouvre
    // avec un message prêt ; il reste à y joindre le fichier.
    telecharger(fichier);
    if (clientTelephone) {
      const numero = formatNumeroWhatsApp(clientTelephone, clientTelephonePays);
      const message = `Bonjour ${clientNom ?? ""}, voici votre facture n° ${numeroFacture}. Merci pour votre confiance !`;
      window.open(`https://wa.me/${numero}?text=${encodeURIComponent(message)}`, "_blank");
      setInfo("Le PDF est téléchargé : joignez-le dans la discussion WhatsApp qui vient de s'ouvrir.");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5 print:hidden">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={envoyerAuClient}
          disabled={!pret}
          className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          <IconWhatsApp size={14} />
          {pret ? "Envoyer au client" : "Préparation…"}
        </button>
        <button
          type="button"
          onClick={enregistrer}
          disabled={!pret}
          className="flex items-center gap-1.5 rounded-md bg-navy px-3 py-2 text-sm font-medium text-white hover:bg-navy-2 disabled:opacity-60"
        >
          <IconDownload size={14} />
          Enregistrer
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="hidden rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 md:block"
        >
          Imprimer
        </button>
      </div>
      {pret && (
        <p className="max-w-xs text-right text-xs text-slate-500">
          Dans le menu : choisissez <b>WhatsApp</b> puis le client, ou <b>Enregistrer dans Fichiers</b>.
        </p>
      )}
      {info && <p className="max-w-xs text-right text-xs text-emerald-700">{info}</p>}
      {erreur && <p className="text-xs text-red-600">{erreur}</p>}
    </div>
  );
}
