import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BRAND } from "@/lib/brand";
import { chargerParametresSite, listerPointsRetrait, reglesPrix } from "@/lib/parametres";
import { MISE_A_JOUR, SLUGS_LEGAUX, contenuLegal, type SlugLegal } from "@/lib/legal";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFooter } from "@/components/public/PublicFooter";

export const dynamic = "force-dynamic";

export default async function PageLegale({ params }: { params: { page: string } }) {
  const slug = params.page as SlugLegal;
  const legalDisponible = !BRAND.identite.destinataireNom.includes("RENSEIGNER");
  if (!legalDisponible || !SLUGS_LEGAUX.includes(slug)) notFound();

  const { data: auth } = await createClient().auth.getUser();
  const admin = createAdminClient();
  const site = await chargerParametresSite(admin);
  const page = contenuLegal(slug, site, reglesPrix(site));

  const chiffres = site.whatsapp.replace(/\D/g, "");
  const whatsapp = chiffres.length >= 6 ? chiffres : null;

  const { data: reseauxBruts } = await admin
    .from("publicites")
    .select("id, titre, lien")
    .eq("type", "reseau_social")
    .eq("actif", true)
    .order("ordre", { ascending: true });
  const reseaux = (reseauxBruts ?? [])
    .filter((r) => r.lien)
    .map((r) => ({ id: r.id, titre: r.titre, lien: r.lien! }));

  return (
    <div className="min-h-screen bg-navy-gradient text-white">
      <PublicNav
        liens={[
          { href: "/#services", label: "Services" },
          { href: "/#contact", label: "Contact" },
        ]}
        estConnecte={!!auth.user}
        ctaHref="/#suivi"
      />

      <main className="px-5 py-14 sm:px-8 sm:py-20">
        <article className="mx-auto max-w-3xl">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-1">
            {BRAND.nom}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{page.titre}</h1>
          <p className="mt-2 text-sm text-white/45">Dernière mise à jour : {MISE_A_JOUR}</p>

          {page.intro && (
            <p className="mt-6 text-base leading-relaxed text-white/70">{page.intro}</p>
          )}

          <div className="mt-10 space-y-8">
            {page.sections.map((s) => (
              <section key={s.titre} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                <h2 className="mb-3 text-lg font-semibold text-gold-1">{s.titre}</h2>
                <div className="space-y-3 text-sm leading-relaxed text-white/70">
                  {s.paragraphes.map((p) => (
                    <p key={p}>{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>

      <PublicFooter
        adresseDakar={site.adresseDakar}
        horairesDepot={site.horairesDepot}
        pointsRetrait={listerPointsRetrait(site.pointsRetrait)}
        adresse={site.adresse}
        horaires={site.horaires}
        email={site.email}
        whatsapp={whatsapp}
        reseaux={reseaux}
        legalDisponible={legalDisponible}
        racine="/"
      />
    </div>
  );
}
