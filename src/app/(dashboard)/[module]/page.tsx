import { notFound } from "next/navigation";
import Link from "next/link";
import { IconArrowRight } from "@/components/ui/Icons";

const MODULES: Record<string, string> = {
  publicites: "Publicités",
  "charges-depenses": "Charges & Dépenses",
  "notifications-whatsapp": "Notifications WhatsApp",
  chat: "Chat",
  parametres: "Paramètres",
};

export default function ModuleBientotPage({
  params,
}: {
  params: { module: string };
}) {
  const label = MODULES[params.module];
  if (!label) notFound();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-xl border border-slate-200/70 bg-white p-8 text-center shadow-sm">
        <span className="mb-3 inline-block rounded-full bg-gold-1/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gold-2">
          Bientôt disponible
        </span>
        <h1 className="mb-2 text-xl font-bold text-navy">{label}</h1>
        <p className="mb-6 text-sm text-slate-500">
          Ce module arrive dans une prochaine étape de la refonte SIGIL
          CARGO — module par module.
        </p>
        <Link
          href="/tableau-de-bord"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-2 hover:underline"
        >
          Retour au tableau de bord
          <IconArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
