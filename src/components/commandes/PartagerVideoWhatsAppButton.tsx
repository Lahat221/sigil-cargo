"use client";

import { IconWhatsApp } from "@/components/ui/Icons";

export function PartagerVideoWhatsAppButton({
  url,
  numero,
}: {
  url: string;
  numero: number;
}) {
  function partager() {
    const texte = `Voici la vidéo de votre colis #${numero} chez SIGIL CARGO : ${url}`;
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
