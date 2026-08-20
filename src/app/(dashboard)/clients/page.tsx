import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SupprimerClientButton } from "@/components/clients/SupprimerClientButton";
import { IconPencil, IconPlus, IconUsers } from "@/components/ui/Icons";

export const dynamic = "force-dynamic";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const supabase = createClient();

  let query = supabase
    .from("clients")
    .select("id, nom, telephone, telephone_pays, adresse")
    .order("nom");

  const q = searchParams.q?.trim();
  if (q) {
    query = query.or(`nom.ilike.%${q}%,telephone.ilike.%${q}%`);
  }

  const { data: clients, error } = await query;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-white">Clients</h1>
        <Link
          href="/clients/nouveau"
          className="flex items-center gap-1.5 rounded-lg bg-gold-gradient px-4 py-1.5 text-sm font-semibold text-navy shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:brightness-105"
        >
          <IconPlus size={15} />
          Nouveau client
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <form className="mb-4">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Rechercher par nom ou téléphone..."
            className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy/20"
          />
        </form>

        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Erreur : {error.message}
          </p>
        ) : !clients || clients.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-slate-400">
            <IconUsers size={28} />
            <p className="text-sm">Aucun client trouvé.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Nom</th>
                  <th className="px-3 py-2 font-medium">Téléphone</th>
                  <th className="px-3 py-2 font-medium">Adresse</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-900">
                      {c.nom}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {c.telephone
                        ? `${c.telephone_pays ?? ""} ${c.telephone}`
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {c.adresse ?? "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/clients/${c.id}/modifier`}
                          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
                        >
                          <IconPencil size={14} />
                          Modifier
                        </Link>
                        <SupprimerClientButton clientId={c.id} nom={c.nom} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
