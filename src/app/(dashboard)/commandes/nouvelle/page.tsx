import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NouvelleCommandeForm } from "@/components/commandes/NouvelleCommandeForm";

export const dynamic = "force-dynamic";

export default async function NouvelleCommandePage() {
  const supabase = createClient();

  const [{ data: produits }, { data: projets }] = await Promise.all([
    supabase
      .from("produits")
      .select("id, nom, prix_par_kg")
      .eq("actif", true)
      .order("nom"),
    supabase
      .from("projets")
      .select("id, nom")
      .eq("statut", "actif")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">
          Nouveau colis
        </h1>
        <Link
          href="/commandes"
          className="text-sm text-ink-muted hover:text-ink"
        >
          ← Retour à la liste
        </Link>
      </div>

      {(!produits || produits.length === 0 || !projets || projets.length === 0) && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Il faut au moins un produit actif et un projet actif pour créer un
          colis.
        </p>
      )}

      <NouvelleCommandeForm produits={produits ?? []} projets={projets ?? []} />
    </div>
  );
}
