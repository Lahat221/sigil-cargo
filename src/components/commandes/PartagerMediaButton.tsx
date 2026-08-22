"use client";

import { IconWhatsApp } from "@/components/ui/Icons";

function formatNumeroWhatsApp(
  telephone: string,
  telephonePays: string | null
): string {
  const chiffres = telephone.replace(/\D/g, "");
  const indicatif = (telephonePays ?? "+33").replace(/\D/g, "");
  return chiffres.startsWith(indicatif) ? chiffres : indicatif + chiffres;
}

export function PartagerWhatsAppButton({
  label,
  texte,
  clientTelephone,
  clientTelephonePays,
}: {
  label: string;
  texte: string;
  clientTelephone: string | null;
  clientTelephonePays: string | null;
}) {
  if (!clientTelephone) return null;

  function partager() {
    const numeroWa = formatNumeroWhatsApp(clientTelephone!, clientTelephonePays);
    window.open(
      `https://wa.me/${numeroWa}?text=${encodeURIComponent(texte)}`,
      "_blank"
    );
  }

  return (
    <button
      type="button"
      onClick={partager}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-50"
    >
      <IconWhatsApp size={14} />
      {label}
    </button>
  );
}
