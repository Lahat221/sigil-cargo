import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReplyForm } from "@/components/whatsapp/ReplyForm";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function ConversationPage({
  params,
}: {
  params: { telephone: string };
}) {
  const telephone = decodeURIComponent(params.telephone);
  const supabase = createClient();

  const { data: messages } = await supabase
    .from("whatsapp_messages")
    .select("id, body, direction, created_at, client_id, clients(nom)")
    .eq("telephone", telephone)
    .order("created_at", { ascending: true });

  if (!messages || messages.length === 0) notFound();

  const avecClient = messages.find((m) => m.client_id);
  const clientId = avecClient?.client_id ?? null;
  const nom =
    (avecClient?.clients as unknown as { nom: string } | null)?.nom ?? null;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <Link
        href="/notifications-whatsapp/conversations"
        className="mb-4 inline-block text-sm text-white/60 hover:text-white"
      >
        ← Retour aux conversations
      </Link>

      <h1 className="mb-4 text-xl font-bold text-white">
        {nom ?? telephone}
      </h1>

      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${
                m.direction === "out" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  m.direction === "out"
                    ? "bg-green-600 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body ?? "(média)"}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    m.direction === "out" ? "text-white/70" : "text-slate-400"
                  }`}
                >
                  {dateFormatter.format(new Date(m.created_at))}
                </p>
              </div>
            </div>
          ))}
        </div>

        <ReplyForm telephone={telephone} clientId={clientId} />
      </div>
    </div>
  );
}
