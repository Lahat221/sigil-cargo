import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageTransition } from "@/components/layout/PageTransition";
import { IconLogout } from "@/components/ui/Icons";
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

  let modulesAutorises: string[] | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, modules_autorises")
      .eq("id", user.id)
      .maybeSingle();
    if (profile && profile.role !== "admin") {
      modulesAutorises = profile.modules_autorises;
    }
  }

  return (
    <div className="flex min-h-screen bg-navy-gradient">
      <div className="print:hidden">
        <Sidebar modulesAutorises={modulesAutorises} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line print:hidden">
          <div className="flex items-center justify-end px-4 py-3 sm:px-6">
            <div className="flex items-center gap-4">
              {user && (
                <span className="hidden text-sm text-white/60 sm:inline">
                  {user.email}
                </span>
              )}
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10"
                >
                  <IconLogout size={14} />
                  Déconnexion
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-6 print:bg-white">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}
