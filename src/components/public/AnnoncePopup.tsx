"use client";

import { useEffect, useState } from "react";
import { IconX } from "@/components/ui/Icons";

const CLE = "annonce-vue";

// Annonce d'accueil (affiche du prochain départ) : s'ouvre une fois par
// session de navigation, se ferme au clic, sur Échap ou en dehors.
export function AnnoncePopup({
  imageUrl,
  titre,
  lien,
}: {
  imageUrl: string;
  titre: string;
  lien: string | null;
}) {
  const [ouverte, setOuverte] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(CLE)) return;
    } catch {
      // stockage indisponible : on affiche quand même
    }
    const t = setTimeout(() => setOuverte(true), 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!ouverte) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [ouverte]);

  function fermer() {
    setOuverte(false);
    try {
      sessionStorage.setItem(CLE, "1");
    } catch {
      // sans conséquence
    }
  }

  if (!ouverte) return null;

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={imageUrl} alt={titre} className="max-h-[78vh] w-auto rounded-xl" />
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titre}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={fermer}
    >
      <div
        className="relative max-w-md animate-page-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={fermer}
          aria-label="Fermer"
          className="absolute -right-2 -top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg transition-transform hover:scale-105"
        >
          <IconX size={16} />
        </button>
        <div className="rounded-2xl bg-gold-gradient p-[3px] shadow-2xl">
          <div className="overflow-hidden rounded-[14px] bg-navy">
            {lien ? (
              <a href={lien} target="_blank" rel="noreferrer">
                {image}
              </a>
            ) : (
              image
            )}
          </div>
        </div>
        <a
          href="#departs"
          onClick={fermer}
          className="mt-3 block rounded-lg bg-white/95 px-4 py-2.5 text-center text-sm font-semibold text-navy shadow-lg transition-colors hover:bg-white"
        >
          Voir les prochains départs
        </a>
      </div>
    </div>
  );
}
