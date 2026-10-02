"use client";

import { useEffect, useState } from "react";

type Format = "feuille" | "rouleau";

const STORAGE_KEY = "etiquette-format";

// Rouleau 58 mm : 2 x 1,5 mm de marge => 55 mm de large utile (= 204 unités
// --u). La longueur de la page est calculée pour correspondre exactement à
// celle de l'étiquette (longueur adaptative, ni blanc inutile ni 2e page).
const LARGEUR_UTILE_MM = 55;
const MARGES_MM = 3;
const SECURITE_MM = 2;
const STYLE_ID = "etiquette-taille-page";

function hauteurPageRouleauMm(): number | null {
  const el = document.querySelector<HTMLElement>(".etiquette");
  if (!el) return null;
  const cs = getComputedStyle(el);
  const u = parseFloat(cs.getPropertyValue("--u"));
  const contenuPx =
    el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  if (!u || !contenuPx) return null;
  const unites = contenuPx / u;
  return Math.ceil(unites * (LARGEUR_UTILE_MM / 204) + MARGES_MM + SECURITE_MM);
}

// Règles d'impression selon le support. Le gabarit de l'étiquette est conçu
// sur 204 unités de large (--u, voir page.tsx) et ~460 de haut.
//  - rouleau : mini imprimante thermique 58 mm. Pas de `size` dans @page :
//    Chrome ignore `58mm auto` (invalide) et garde le papier choisi dans la
//    boîte d'impression ; l'étiquette prend donc toute la largeur utile du
//    papier (marges 1,5 mm), et la longueur de page est ajustée à celle de
//    l'étiquette (voir hauteurPageRouleauMm).
//  - feuille : l'étiquette remplit toute la page (A4, A5, A6, PDF...) avec
//    de petites marges ; --u s'adapte à la largeur ET à la hauteur utiles
//    pour ne jamais déborder sur une 2e page, et le contenu est réparti
//    sur toute la hauteur.
const CSS_PAR_FORMAT: Record<Format, string> = {
  rouleau: `
    @media print {
      @page { margin: 1.5mm; }
      .etiquette {
        --u: calc(100vw / 204);
        box-sizing: border-box;
        width: 100%;
        border: none !important;
        border-radius: 0;
        box-shadow: none;
        padding: 0 !important;
      }
    }
  `,
  feuille: `
    @media print {
      @page { size: auto; margin: 4mm; }
      .etiquette {
        --u: min(calc((100vw - 7mm) / 204), calc((100vh - 7mm) / 460));
        box-sizing: border-box;
        width: 100%;
        height: 99vh;
        padding: 2mm !important;
        border: 1.2mm solid #0f172a !important;
        border-radius: 3mm;
        box-shadow: none;
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
      }
    }
  `,
};

export function EtiquetteFormat() {
  const [format, setFormat] = useState<Format>("rouleau");

  useEffect(() => {
    try {
      const sauve = localStorage.getItem(STORAGE_KEY);
      if (sauve === "rouleau" || sauve === "feuille") setFormat(sauve);
    } catch {
      // stockage indisponible : on garde le format par défaut
    }
  }, []);

  // Écrit @page { size: 58mm <hauteur>mm } de façon synchrone (y compris
  // juste avant l'impression : un état React ne serait pas appliqué à temps).
  useEffect(() => {
    let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    const noeud = style;

    function maj() {
      const h = format === "rouleau" ? hauteurPageRouleauMm() : null;
      noeud.textContent = h
        ? `@media print { @page { size: 58mm ${h}mm; margin: 1.5mm; } }`
        : "";
    }

    maj();
    document.fonts?.ready.then(maj);
    window.addEventListener("beforeprint", maj);
    return () => {
      window.removeEventListener("beforeprint", maj);
      noeud.textContent = "";
    };
  }, [format]);

  function choisir(f: Format) {
    setFormat(f);
    try {
      localStorage.setItem(STORAGE_KEY, f);
    } catch {
      // sans conséquence
    }
  }

  const bouton = (f: Format, label: string) => (
    <button
      type="button"
      onClick={() => choisir(f)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        format === f
          ? "bg-gold-1/15 text-gold-1"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </button>
  );

  return (
    <>
      <style>{CSS_PAR_FORMAT[format]}</style>
      <div className="mb-5 flex flex-wrap items-center gap-2 print:hidden">
        <span className="text-sm text-ink-muted">Impression :</span>
        <div className="flex gap-1 rounded-lg bg-white/5 p-1">
          {bouton("rouleau", "Rouleau 58 mm (longueur adaptée)")}
          {bouton("feuille", "Feuille entière")}
        </div>
      </div>
    </>
  );
}
