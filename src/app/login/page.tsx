import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { EmailSignInForm } from "@/components/auth/EmailSignInForm";
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
          <Logo size={56} tagline />
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

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-line" />
          <span className="text-xs uppercase tracking-wide text-muted2">ou</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        <EmailSignInForm next={searchParams.next ?? "/tableau-de-bord"} />
      </div>
    </div>
  );
}
