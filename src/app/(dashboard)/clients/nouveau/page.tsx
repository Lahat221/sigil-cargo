import Link from "next/link";
import { ClientForm } from "@/components/clients/ClientForm";

export default function NouveauClientPage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Nouveau client</h1>
        <Link href="/clients" className="text-sm text-ink-muted hover:text-ink">
          ← Retour à la liste
        </Link>
      </div>

      <ClientForm />
    </div>
  );
}
