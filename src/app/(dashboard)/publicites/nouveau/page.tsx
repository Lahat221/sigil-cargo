import Link from "next/link";
import { PubliciteForm } from "@/components/publicites/PubliciteForm";
import type { Database } from "@/types/database.types";

type TypePublicite = Database["public"]["Tables"]["publicites"]["Row"]["type"];

const TYPES_VALIDES: TypePublicite[] = ["affiche_depart", "publicite", "reseau_social"];

export default function NouvellePublicitePage({
  searchParams,
}: {
  searchParams: { type?: string };
}) {
  const typeInitial = TYPES_VALIDES.includes(searchParams.type as TypePublicite)
    ? (searchParams.type as TypePublicite)
    : "affiche_depart";

  return (
    <div>
      <Link
        href="/publicites"
        className="mb-4 inline-block text-sm text-ink-muted hover:text-ink"
      >
        ← Retour
      </Link>
      <h1 className="mb-4 text-xl font-bold text-ink">Nouvel élément</h1>

      <PubliciteForm initialType={typeInitial} />
    </div>
  );
}
