import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjetForm } from "@/components/projets/ProjetForm";

export const dynamic = "force-dynamic";

export default async function ModifierProjetPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: projet } = await supabase
    .from("projets")
    .select("id, nom, statut, date_depart, date_arrivee")
    .eq("id", params.id)
    .maybeSingle();

  if (!projet) notFound();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Modifier le projet</h1>
        <Link href="/projets" className="text-sm text-white/60 hover:text-white">
          ← Retour à la liste
        </Link>
      </div>

      <ProjetForm
        projetId={projet.id}
        initialNom={projet.nom}
        initialDateDepart={projet.date_depart ?? ""}
        initialDateArrivee={projet.date_arrivee ?? ""}
        initialStatut={projet.statut}
      />
    </div>
  );
}
