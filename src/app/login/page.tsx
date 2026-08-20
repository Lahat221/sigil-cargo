import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">
          SIGIL CARGO
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          Connexion à la gestion des commandes
        </p>

        {searchParams.error && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            La connexion a échoué. Réessaie.
          </p>
        )}

        <GoogleSignInButton next={searchParams.next ?? "/commandes"} />
      </div>
    </div>
  );
}
