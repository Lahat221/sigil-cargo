import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminCourant } from "@/lib/auth/profil";
import { createAdminClient } from "@/lib/supabase/admin";
import { UtilisateurForm } from "@/components/parametres/UtilisateurForm";

export const dynamic = "force-dynamic";

export default async function ModifierUtilisateurPage({
  params,
}: {
  params: { id: string };
}) {
  const adminCourant = await getAdminCourant();
  if (!adminCourant) redirect("/parametres");

  const { data: profil } = await createAdminClient()
    .from("profiles")
    .select("id, nom, email, role, modules_autorises")
    .eq("id", params.id)
    .maybeSingle();

  if (!profil) notFound();

  return (
    <div>
      <Link
        href="/parametres/utilisateurs"
        className="mb-4 inline-block text-sm text-ink-muted hover:text-ink"
      >
        ← Retour aux utilisateurs
      </Link>
      <h2 className="mb-4 text-lg font-bold text-ink">
        Modifier {profil.nom || profil.email}
      </h2>
      <UtilisateurForm
        utilisateurId={profil.id}
        estSoiMeme={profil.id === adminCourant.id}
        initial={{
          nom: profil.nom ?? "",
          email: profil.email,
          role: profil.role,
          modules: profil.modules_autorises ?? [],
        }}
      />
    </div>
  );
}
