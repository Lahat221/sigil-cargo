import { redirect } from "next/navigation";
import { getProfilCourant } from "@/lib/auth/profil";
import { MODULES_DISPONIBLES } from "@/lib/modules";
import { NomForm, MotDePasseForm } from "@/components/parametres/MonCompteForms";
import { CARTE } from "@/components/parametres/styles";

export const dynamic = "force-dynamic";

export default async function MonComptePage() {
  const profil = await getProfilCourant();
  if (!profil) redirect("/login");

  const estAdmin = profil.role === "admin";
  const modules = MODULES_DISPONIBLES.filter((m) => profil.modules.includes(m.slug));

  return (
    <div className="grid max-w-3xl gap-5">
      <section className={CARTE}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Mon profil</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              estAdmin ? "bg-gold-1/20 text-gold-2" : "bg-slate-100 text-slate-600"
            }`}
          >
            {estAdmin ? "Administrateur" : "Agent"}
          </span>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          Connecté en tant que <span className="font-medium">{profil.email}</span>
        </p>
        <NomForm nomInitial={profil.nom ?? ""} />
        {!estAdmin && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Modules accessibles</p>
            <div className="flex flex-wrap gap-1.5">
              {modules.length === 0 ? (
                <span className="text-sm text-slate-400">Aucun module attribué.</span>
              ) : (
                modules.map((m) => (
                  <span
                    key={m.slug}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                  >
                    {m.label}
                  </span>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      <section className={CARTE}>
        <h2 className="mb-4 font-semibold text-slate-900">Mot de passe</h2>
        <MotDePasseForm />
      </section>
    </div>
  );
}
