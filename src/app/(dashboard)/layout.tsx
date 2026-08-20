import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { signOut } from "./actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            <Link
              href="/tableau-de-bord"
              className="text-sm font-semibold text-navy md:hidden"
            >
              SIGIL CARGO
            </Link>
            <span className="hidden md:block" />
            <div className="flex items-center gap-4">
              {user && (
                <span className="hidden text-sm text-slate-500 sm:inline">
                  {user.email}
                </span>
              )}
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                >
                  Déconnexion
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
