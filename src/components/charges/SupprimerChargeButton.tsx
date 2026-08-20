"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { supprimerCharge } from "@/app/(dashboard)/charges-depenses/actions";
import { IconTrash } from "@/components/ui/Icons";

export function SupprimerChargeButton({
  chargeId,
  libelle,
}: {
  chargeId: string;
  libelle: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Supprimer définitivement la charge "${libelle}" ?`)) return;
    startTransition(async () => {
      const result = await supprimerCharge(chargeId);
      if ("error" in result) {
        alert("Erreur : " + result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
    >
      <IconTrash size={14} />
      {isPending ? "..." : "Supprimer"}
    </button>
  );
}
