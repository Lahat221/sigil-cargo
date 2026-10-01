import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SupprimerPubliciteButton } from "@/components/publicites/SupprimerPubliciteButton";
import { ToggleActifButton } from "@/components/publicites/ToggleActifButton";
import { IconPencil, IconPlus } from "@/components/ui/Icons";
import type { Database } from "@/types/database.types";

export const dynamic = "force-dynamic";

type TypePublicite = Database["public"]["Tables"]["publicites"]["Row"]["type"];
type Publicite = Database["public"]["Tables"]["publicites"]["Row"];

const SECTIONS: { type: TypePublicite; titre: string; description: string }[] = [
  {
    type: "affiche_depart",
    titre: "Affiches de départ",
    description:
      "L'affiche mise en avant sur la page d'accueil publique — la plus récente visible est affichée en gros plan.",
  },
  {
    type: "publicite",
    titre: "Publicités",
    description: "Bannières/promos affichées sur la page d'accueil publique.",
  },
  {
    type: "reseau_social",
    titre: "Réseaux sociaux",
    description: "Liens TikTok, Facebook, Instagram... affichés en bas du site public.",
  },
];

export default async function PublicitesPage() {
  const supabase = createClient();

  const { data: publicites } = await supabase
    .from("publicites")
    .select("*")
    .order("ordre", { ascending: true })
    .order("created_at", { ascending: false });

  const parType = new Map<TypePublicite, Publicite[]>();
  for (const p of publicites ?? []) {
    const liste = parType.get(p.type) ?? [];
    liste.push(p);
    parType.set(p.type, liste);
  }

  const urlsImages = new Map<string, string>();
  for (const p of publicites ?? []) {
    if (p.image_path) {
      const { data } = supabase.storage
        .from("publicites-media")
        .getPublicUrl(p.image_path);
      urlsImages.set(p.id, data.publicUrl);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-ink">Publicités</h1>
          <p className="text-sm text-ink-muted">
            Affiches, publicités et réseaux sociaux — tout ce qui s&apos;affiche sur le site public.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {SECTIONS.map((section) => {
          const items = parType.get(section.type) ?? [];
          return (
            <div
              key={section.type}
              className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-900">{section.titre}</h2>
                  <p className="text-xs text-slate-500">{section.description}</p>
                </div>
                <Link
                  href={`/publicites/nouveau?type=${section.type}`}
                  className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <IconPlus size={14} />
                  Ajouter
                </Link>
              </div>

              {items.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  Aucun élément pour l&apos;instant.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {items.map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center gap-3 py-3"
                    >
                      {p.image_path && urlsImages.get(p.id) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={urlsImages.get(p.id)}
                          alt={p.titre}
                          className="h-14 w-14 rounded-md border border-slate-200 object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900">{p.titre}</p>
                        {p.lien && (
                          <a
                            href={p.lien}
                            target="_blank"
                            rel="noreferrer"
                            className="block max-w-xs truncate text-xs text-gold-2 hover:underline"
                          >
                            {p.lien}
                          </a>
                        )}
                      </div>
                      <ToggleActifButton publiciteId={p.id} actif={p.actif} />
                      <Link
                        href={`/publicites/${p.id}/modifier`}
                        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        <IconPencil size={14} />
                        Modifier
                      </Link>
                      <SupprimerPubliciteButton publiciteId={p.id} titre={p.titre} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
