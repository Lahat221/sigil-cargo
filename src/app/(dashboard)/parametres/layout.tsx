import { getProfilCourant } from "@/lib/auth/profil";
import { ParametresSousNav } from "@/components/parametres/ParametresSousNav";

export const dynamic = "force-dynamic";

export default async function ParametresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profil = await getProfilCourant();

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold text-ink">Paramètres</h1>
      <p className="mb-4 text-sm text-ink-muted">
        Compte, accès des utilisateurs, tarifs et informations du site public.
      </p>
      <ParametresSousNav estAdmin={profil?.role === "admin"} />
      {children}
    </div>
  );
}
