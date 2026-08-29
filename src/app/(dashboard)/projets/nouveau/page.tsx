import Link from "next/link";
import { ProjetForm } from "@/components/projets/ProjetForm";

export default function NouveauProjetPage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Nouveau projet</h1>
        <Link href="/projets" className="text-sm text-ink-muted hover:text-ink">
          ← Retour à la liste
        </Link>
      </div>

      <ProjetForm />
    </div>
  );
}
