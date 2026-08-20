import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Logo } from "@/components/layout/Logo";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-gradient px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-navy-2/60 p-8 shadow-xl backdrop-blur">
        <div className="mb-6 flex justify-center">
          <Logo size={44} tagline />
        </div>
        <p className="mb-6 text-center text-sm text-muted2">
          Connexion à la gestion des commandes
        </p>

        {searchParams.error && (
          <p className="mb-4 text-sm text-red-400" role="alert">
            La connexion a échoué. Réessaie.
          </p>
        )}

        <GoogleSignInButton next={searchParams.next ?? "/tableau-de-bord"} />
      </div>
    </div>
  );
}
