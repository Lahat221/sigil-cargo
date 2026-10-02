import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminCourant } from "@/lib/auth/profil";
import { createAdminClient } from "@/lib/supabase/admin";
import { MODULES_DISPONIBLES } from "@/lib/modules";
import { IconPencil, IconPlus } from "@/components/ui/Icons";
import { CARTE } from "@/components/parametres/styles";

export const dynamic = "force-dynamic";

export default async function UtilisateursPage() {
  const adminCourant = await getAdminCourant();
  if (!adminCourant) redirect("/parametres");

  const { data: profils } = await createAdminClient()
    .from("profiles")
    .select("id, nom, email, role, modules_autorises")
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">
          Comptes ayant accès à l&apos;application et modules qu&apos;ils peuvent ouvrir.
        </p>
        <Link
          href="/parametres/utilisateurs/nouveau"
          className="flex items-center gap-1.5 rounded-lg bg-gold-gradient px-4 py-1.5 text-sm font-semibold text-navy shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:brightness-105"
        >
          <IconPlus size={15} />
          Nouvel utilisateur
        </Link>
      </div>

      <div className={`${CARTE} divide-y divide-slate-100 !p-0`}>
        {(profils ?? []).map((p) => {
          const nbModules = (p.modules_autorises ?? []).filter((s) =>
            MODULES_DISPONIBLES.some((m) => m.slug === s)
          ).length;
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">
                  {p.nom || "—"}
                  {p.id === adminCourant.id && (
                    <span className="ml-2 text-xs font-normal text-slate-400">(vous)</span>
                  )}
                </p>
                <p className="truncate text-sm text-slate-500">{p.email}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  p.role === "admin"
                    ? "bg-gold-1/20 text-gold-2"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {p.role === "admin" ? "Administrateur" : `Agent · ${nbModules} module${nbModules > 1 ? "s" : ""}`}
              </span>
              <Link
                href={`/parametres/utilisateurs/${p.id}`}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
              >
                <IconPencil size={14} />
                Modifier
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
