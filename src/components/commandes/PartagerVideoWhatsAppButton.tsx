"use client";

import { IconWhatsApp } from "@/components/ui/Icons";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

export function PartagerVideoWhatsAppButton({
  url,
  numero,
}: {
  url: string;
  numero: number;
}) {
  function partager() {
    const texte = `Voici la vidéo de votre colis #${numero} chez ${BRAND.nom} : ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texte)}`, "_blank");
  }

  return (
    <button
      type="button"
      onClick={partager}
      className="flex items-center gap-1 text-xs text-green-700 hover:underline"
    >
      <IconWhatsApp size={12} />
      WhatsApp
    </button>
  );
}
