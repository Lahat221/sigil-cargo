"use client";

import { useRef } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/ui/Icons";

// Carrousel horizontal (défilement tactile + flèches) pour les cartes de départ.
export function DepartsCarousel({ children }: { children: React.ReactNode }) {
  const piste = useRef<HTMLDivElement>(null);

  function defiler(sens: 1 | -1) {
    const el = piste.current;
    if (!el) return;
    el.scrollBy({ left: sens * el.clientWidth * 0.8, behavior: "smooth" });
  }

  const flecheClasse =
    "flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/80 transition-colors hover:bg-white/15 hover:text-white";

  return (
    <div>
      <div
        ref={piste}
        className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <div className="mt-5 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => defiler(-1)}
          aria-label="Départs précédents"
          className={flecheClasse}
        >
          <IconChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={() => defiler(1)}
          aria-label="Départs suivants"
          className={flecheClasse}
        >
          <IconChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
