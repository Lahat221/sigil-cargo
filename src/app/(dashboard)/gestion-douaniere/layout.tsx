import { createClient } from "@/lib/supabase/server";
import { DouaneFiltreDepart } from "@/components/douane/DouaneFiltreDepart";
import { DouaneSousNav } from "@/components/douane/DouaneSousNav";

export default async function GestionDouaniereLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: projets } = await supabase
    .from("projets")
    .select("id, nom")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <DouaneSousNav />
        <DouaneFiltreDepart projets={projets ?? []} />
      </div>
      {children}
    </div>
  );
}
