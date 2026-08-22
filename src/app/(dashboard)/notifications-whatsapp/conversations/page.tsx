import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { IconWhatsApp } from "@/components/ui/Icons";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function ConversationsPage() {
  const supabase = createClient();

  const { data: messages } = await supabase
    .from("whatsapp_messages")
    .select("telephone, body, direction, created_at, clients(nom)")
    .order("created_at", { ascending: false })
    .limit(500);

  const conversations = new Map<
    string,
    {
      telephone: string;
      nom: string | null;
      dernierMessage: string | null;
      direction: "in" | "out";
      date: string;
    }
  >();

  for (const m of messages ?? []) {
    if (conversations.has(m.telephone)) continue;
    conversations.set(m.telephone, {
      telephone: m.telephone,
      nom: (m.clients as unknown as { nom: string } | null)?.nom ?? null,
      dernierMessage: m.body,
      direction: m.direction,
      date: m.created_at,
    });
  }

  const liste = Array.from(conversations.values());

  return (
    <div>
      <Link
        href="/notifications-whatsapp"
        className="mb-4 inline-block text-sm text-white/60 hover:text-white"
      >
        ← Retour aux campagnes
      </Link>

      <h1 className="mb-4 text-xl font-bold text-white">Conversations</h1>

      <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        {liste.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
            <IconWhatsApp size={28} />
            <p className="text-sm">Aucune conversation pour l&apos;instant.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {liste.map((c) => (
              <Link
                key={c.telephone}
                href={`/notifications-whatsapp/conversations/${encodeURIComponent(
                  c.telephone
                )}`}
                className="block py-3 hover:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">
                    {c.nom ?? c.telephone}
                  </p>
                  <p className="text-xs text-slate-400">
                    {dateFormatter.format(new Date(c.date))}
                  </p>
                </div>
                <p className="truncate text-sm text-slate-500">
                  {c.direction === "out" ? "Vous : " : ""}
                  {c.dernierMessage ?? "(média)"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
