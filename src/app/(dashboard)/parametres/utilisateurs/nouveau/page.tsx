import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminCourant } from "@/lib/auth/profil";
import { UtilisateurForm } from "@/components/parametres/UtilisateurForm";

export const dynamic = "force-dynamic";

export default async function NouvelUtilisateurPage() {
  if (!(await getAdminCourant())) redirect("/parametres");

  return (
    <div>
      <Link
        href="/parametres/utilisateurs"
        className="mb-4 inline-block text-sm text-ink-muted hover:text-ink"
      >
        ← Retour aux utilisateurs
      </Link>
      <h2 className="mb-4 text-lg font-bold text-ink">Nouvel utilisateur</h2>
      <UtilisateurForm />
    </div>
  );
}
