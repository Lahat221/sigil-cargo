"use client";

import { useEffect, useRef, useState } from "react";

export type Chiffre = { valeur: number; suffixe: string; label: string };

function Compteur({ valeur, suffixe }: { valeur: number; suffixe: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [affiche, setAffiche] = useState(valeur);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setAffiche(0);
    let rafId = 0;
    const observer = new IntersectionObserver(
      ([entree]) => {
        if (!entree.isIntersecting) return;
        observer.disconnect();
        const debut = performance.now();
        const duree = 1400;
        const pas = (t: number) => {
          const progression = Math.min(1, (t - debut) / duree);
          const adouci = 1 - Math.pow(1 - progression, 3);
          setAffiche(Math.round(valeur * adouci));
          if (progression < 1) rafId = requestAnimationFrame(pas);
        };
        rafId = requestAnimationFrame(pas);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, [valeur]);

  return (
    <span ref={ref}>
      {affiche.toLocaleString("fr-FR")}
      {suffixe}
    </span>
  );
}

export function ChiffresCles({ chiffres }: { chiffres: Chiffre[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 text-center sm:grid-cols-4">
      {chiffres.map((c) => (
        <div key={c.label}>
          <p className="whitespace-nowrap text-4xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            <Compteur valeur={c.valeur} suffixe={c.suffixe} />
          </p>
          <p className="mt-1.5 text-xs font-medium uppercase tracking-wider text-gold-1 sm:text-sm">
            {c.label}
          </p>
        </div>
      ))}
    </div>
  );
}
