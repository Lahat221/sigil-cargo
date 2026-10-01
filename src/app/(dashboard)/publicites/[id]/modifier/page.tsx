import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PubliciteForm } from "@/components/publicites/PubliciteForm";

export const dynamic = "force-dynamic";

export default async function ModifierPublicitePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: publicite } = await supabase
    .from("publicites")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!publicite) notFound();

  const imageUrl = publicite.image_path
    ? supabase.storage.from("publicites-media").getPublicUrl(publicite.image_path).data.publicUrl
    : null;

  return (
    <div>
      <Link
        href="/publicites"
        className="mb-4 inline-block text-sm text-ink-muted hover:text-ink"
      >
        ← Retour
      </Link>
      <h1 className="mb-4 text-xl font-bold text-ink">Modifier l&apos;élément</h1>

      <PubliciteForm
        publiciteId={publicite.id}
        initialType={publicite.type}
        initialTitre={publicite.titre}
        initialLien={publicite.lien ?? ""}
        initialImagePath={publicite.image_path}
        initialImageUrl={imageUrl}
        initialActif={publicite.actif}
        initialOrdre={publicite.ordre}
      />
    </div>
  );
}
