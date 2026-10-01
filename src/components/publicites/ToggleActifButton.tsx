"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleActifPublicite } from "@/app/(dashboard)/publicites/actions";

export function ToggleActifButton({
  publiciteId,
  actif,
}: {
  publiciteId: string;
  actif: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await toggleActifPublicite(publiciteId, !actif);
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
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        actif
          ? "bg-green-100 text-green-800 hover:bg-green-200"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
    >
      {isPending ? "..." : actif ? "Visible" : "Masqué"}
    </button>
  );
}
