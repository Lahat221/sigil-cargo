import Link from "next/link";
import { ChargeForm } from "@/components/charges/ChargeForm";

export default function NouvelleChargePage() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Nouvelle charge</h1>
        <Link
          href="/charges-depenses"
          className="text-sm text-white/60 hover:text-white"
        >
          ← Retour à la liste
        </Link>
      </div>

      <ChargeForm />
    </div>
  );
}
