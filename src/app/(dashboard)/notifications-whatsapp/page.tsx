import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconPlus, IconSend } from "@/components/ui/Icons";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function NotificationsWhatsAppPage() {
  const supabase = createClient();

  const [{ data: campagnes, error }, { data: destinataires }] = await Promise.all([
    supabase
      .from("campagnes_whatsapp")
      .select("id, nom, message, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("campagnes_whatsapp_destinataires")
      .select("campagne_id, envoyee"),
  ]);

  const statsParCampagne = new Map<string, { total: number; envoyes: number }>();
  for (const d of destinataires ?? []) {
    const s = statsParCampagne.get(d.campagne_id) ?? { total: 0, envoyes: 0 };
    s.total += 1;
    if (d.envoyee) s.envoyes += 1;
    statsParCampagne.set(d.campagne_id, s);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink">
          Campagne de Communication
        </h1>
        <Link
          href="/notifications-whatsapp/nouvelle"
          className="flex items-center gap-1.5 rounded-lg bg-gold-gradient px-4 py-1.5 text-sm font-semibold text-navy shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:brightness-105"
        >
          <IconPlus size={15} />
          Nouvelle campagne
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Erreur : {error.message}
          </p>
        ) : !campagnes || campagnes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
            <IconSend size={28} />
            <p className="text-sm">Aucune campagne créée.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {campagnes.map((c) => {
              const s = statsParCampagne.get(c.id) ?? { total: 0, envoyes: 0 };
              const pct = s.total > 0 ? Math.round((s.envoyes / s.total) * 100) : 0;
              return (
                <Link
                  key={c.id}
                  href={`/notifications-whatsapp/${c.id}`}
                  className="block py-3 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{c.nom}</p>
                    <p className="text-sm text-slate-500">
                      {s.envoyes}/{s.total} envoyé(s)
                    </p>
                  </div>
                  <p className="mb-2 truncate text-sm text-slate-500">
                    {c.message}
                  </p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-green-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {dateFormatter.format(new Date(c.created_at))}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
