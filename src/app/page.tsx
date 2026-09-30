import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/layout/Logo";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

function premierNumero(tel: string): string | null {
  const premier = tel.split(/[-/]/)[0]?.trim();
  const digits = premier?.replace(/[^\d+]/g, "");
  return digits && digits.length >= 6 ? digits : null;
}

export default async function HomePage() {
  // Page vitrine publique — un agent déjà connecté n'a rien à faire ici,
  // direction le tableau de bord comme avant (seul un visiteur anonyme
  // atterrit sur cette page, cf. le cas spécial "/" dans middleware.ts).
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) redirect("/tableau-de-bord");

  const admin = createAdminClient();
  const { data: projets } = await admin
    .from("projets")
    .select("id, nom, date_depart, mode_fret")
    .eq("statut", "actif")
    .order("date_depart", { ascending: true, nullsFirst: false });

  const { data: commandesActives } = await admin
    .from("commandes")
    .select("projet_id, destination")
    .neq("statut", "annulee");

  const destinationsParProjet = new Map<string, Map<string, number>>();
  for (const c of commandesActives ?? []) {
    if (!c.destination) continue;
    let m = destinationsParProjet.get(c.projet_id);
    if (!m) {
      m = new Map();
      destinationsParProjet.set(c.projet_id, m);
    }
    m.set(c.destination, (m.get(c.destination) ?? 0) + 1);
  }

  const contactTel = BRAND.identite.expediteurTel.includes("RENSEIGNER")
    ? null
    : premierNumero(BRAND.identite.expediteurTel);

  return (
    <div className="min-h-screen bg-navy-gradient text-white">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Logo size={40} tagline />
        <Link
          href="/login"
          className="rounded-md border border-white/20 px-4 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
        >
          Connexion
        </Link>
      </header>

      <main className="px-6 pb-16 sm:px-10">
        {/* Hero */}
        <section className="mx-auto max-w-3xl pt-10 text-center sm:pt-16">
          <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl">
            {BRAND.nom}
          </h1>
          <p className="mt-2 text-base text-white/70 sm:text-lg">
            Fret {BRAND.routeDescription} — {BRAND.tagline}
          </p>

          <div className="mx-auto mt-8 max-w-md rounded-xl border border-white/15 bg-white/5 p-5 text-left backdrop-blur-sm">
            <h2 className="mb-3 text-center text-sm font-semibold uppercase tracking-wide text-gold-1">
              Suivre mon colis
            </h2>
            <form action="/suivi" className="space-y-2.5">
              <input
                type="text"
                name="numero"
                placeholder="N° de colis"
                required
                className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-gold-1 focus:outline-none"
              />
              <input
                type="tel"
                name="telephone"
                placeholder="Numéro de téléphone (au dépôt)"
                required
                className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-gold-1 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-gold-gradient px-4 py-2 text-sm font-semibold text-navy shadow-sm transition-all hover:brightness-105"
              >
                Suivre en temps réel
              </button>
            </form>
          </div>
        </section>

        {/* Prochains départs */}
        {projets && projets.length > 0 && (
          <section className="mx-auto mt-16 max-w-3xl">
            <h2 className="mb-4 text-center text-xl font-bold">
              Prochains départs
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {projets.map((p) => {
                const destinations = Array.from(
                  destinationsParProjet.get(p.id)?.entries() ?? []
                ).sort((a, b) => b[1] - a[1]);
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-white/15 bg-white/5 p-4"
                  >
                    <p className="font-semibold text-white">{p.nom}</p>
                    <p className="mt-1 text-sm text-white/60">
                      {p.date_depart
                        ? `Départ : ${dateFormatter.format(new Date(p.date_depart))}`
                        : "Date de départ à venir"}
                    </p>
                    {destinations.length > 0 && (
                      <p className="mt-2 text-xs text-white/50">
                        {destinations
                          .map(([ville, nb]) => `${ville} (${nb} colis)`)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Nos services */}
        <section className="mx-auto mt-16 max-w-3xl">
          <h2 className="mb-4 text-center text-xl font-bold">Nos services</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <ServiceCard
              titre="Fret aérien"
              description={`Envoi de colis ${BRAND.routeDescription}, tarifé au poids.`}
            />
            {BRAND.modeGroupageConteneurActif && (
              <ServiceCard
                titre="Groupage conteneur"
                description="Envoi de gros volumes par conteneur, tarifé au m³."
              />
            )}
            {BRAND.moduleFranceActif && (
              <ServiceCard
                titre="Dédouanement France"
                description="Formalités douanières prises en charge de bout en bout."
              />
            )}
            <ServiceCard
              titre="Suivi en temps réel"
              description="Statut du colis consultable à tout moment, du dépôt à la livraison."
            />
          </div>
        </section>

        {/* Contact */}
        <section className="mx-auto mt-16 max-w-3xl text-center">
          <h2 className="mb-3 text-xl font-bold">Nous contacter</h2>
          {BRAND.retrait && (
            <p className="text-sm text-white/70">
              {BRAND.retrait.adresse} · {BRAND.retrait.horaires}
            </p>
          )}
          {contactTel && (
            <a
              href={`https://wa.me/${contactTel.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gold-gradient px-5 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all hover:brightness-105"
            >
              Contacter sur WhatsApp
            </a>
          )}
        </section>
      </main>
    </div>
  );
}

function ServiceCard({
  titre,
  description,
}: {
  titre: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-4">
      <p className="font-semibold text-gold-1">{titre}</p>
      <p className="mt-1 text-sm text-white/70">{description}</p>
    </div>
  );
}
