import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminCourant } from "@/lib/auth/profil";
import { createClient } from "@/lib/supabase/server";
import { chargerParametresSite } from "@/lib/parametres";
import { SiteForm } from "@/components/parametres/SiteForm";
import { CARTE } from "@/components/parametres/styles";

export const dynamic = "force-dynamic";

export default async function SitePublicPage() {
  if (!(await getAdminCourant())) redirect("/parametres");

  const parametres = await chargerParametresSite(createClient());

  return (
    <div className="grid max-w-3xl gap-5">
      <section className={CARTE}>
        <h2 className="font-semibold text-slate-900">Contact du site public</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          Ces informations s&apos;affichent dans la section « Nous contacter » de la
          page d&apos;accueil. Les affiches, publicités et réseaux sociaux se gèrent dans{" "}
          <Link href="/publicites" className="font-medium text-gold-2 hover:underline">
            Publicités
          </Link>
          .
        </p>
        <SiteForm initial={parametres} />
      </section>
    </div>
  );
}
