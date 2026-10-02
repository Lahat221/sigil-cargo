import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/layout/Logo";
import {
  IconPlane,
  IconPackage,
  IconShieldCheck,
  IconClock,
  IconMapPin,
  IconTruck,
  IconGlobe,
  IconSparkles,
} from "@/components/ui/Icons";
import { BRAND } from "@/lib/brand";
import { chargerParametresSite } from "@/lib/parametres";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

export default async function HomePage() {
  // Page vitrine publique — accessible aussi à un agent déjà connecté
  // (lien "Voir le site public" dans la sidebar, cf. Sidebar.tsx) : on
  // adapte juste le bouton d'en-tête ("Tableau de bord" au lieu de
  // "Connexion") plutôt que de rediriger, sinon ce lien ne mènerait jamais
  // à la page pour un agent connecté.
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const estConnecte = !!auth.user;

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

  // Module Publicités (cf. /publicites) : affiche de départ, publicités et
  // réseaux sociaux gérés depuis l'appli, affichés automatiquement ici.
  const { data: publicitesActives } = await admin
    .from("publicites")
    .select("*")
    .eq("actif", true)
    .order("ordre", { ascending: true })
    .order("created_at", { ascending: false });

  function urlImage(path: string) {
    return admin.storage.from("publicites-media").getPublicUrl(path).data.publicUrl;
  }

  const affiche = (publicitesActives ?? []).find(
    (p) => p.type === "affiche_depart" && p.image_path
  );
  const publicitesBannieres = (publicitesActives ?? []).filter(
    (p) => p.type === "publicite" && p.image_path
  );
  const reseauxSociaux = (publicitesActives ?? []).filter(
    (p) => p.type === "reseau_social" && p.lien
  );

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

  // Infos de contact modifiables depuis Paramètres → Site public.
  const site = await chargerParametresSite(admin);
  const chiffresWhatsapp = site.whatsapp.replace(/\D/g, "");
  const contactTel = chiffresWhatsapp.length >= 6 ? chiffresWhatsapp : null;

  const anneeCourante = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-navy-gradient text-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-navy/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          <Logo size={36} />
          <nav className="hidden items-center gap-8 text-sm font-medium text-white/70 sm:flex">
            {projets && projets.length > 0 && (
              <a href="#departs" className="transition-colors hover:text-white">
                Départs
              </a>
            )}
            <a href="#services" className="transition-colors hover:text-white">
              Services
            </a>
            <a href="#contact" className="transition-colors hover:text-white">
              Contact
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="#suivi"
              className="hidden rounded-md bg-gold-gradient px-4 py-1.5 text-sm font-semibold text-navy shadow-sm transition-all hover:brightness-105 sm:inline-block"
            >
              Suivre un colis
            </a>
            <Link
              href={estConnecte ? "/tableau-de-bord" : "/login"}
              className="rounded-md border border-white/20 px-4 py-1.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10"
            >
              {estConnecte ? "Tableau de bord" : "Connexion"}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-16 pb-10 sm:px-10 sm:pt-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-gold-1/20 blur-[100px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-32 h-64 w-64 rounded-full bg-gold-2/15 blur-[90px]"
        />

        <div className="relative mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-1/30 bg-gold-1/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-gold-1">
            <IconSparkles size={13} />
            Partenaire fret {BRAND.routeDescription}
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            {BRAND.nom}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base text-white/70 sm:text-lg">
            {BRAND.tagline} — vos colis et marchandises acheminés en toute
            confiance, suivis à chaque étape.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a
              href="#suivi"
              className="rounded-lg bg-gold-gradient px-6 py-3 text-sm font-semibold text-navy shadow-lg shadow-gold-2/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              Suivre mon colis
            </a>
            <a
              href="#contact"
              className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
            >
              Nous contacter
            </a>
          </div>
        </div>
      </section>

      <main className="px-6 pb-20 sm:px-10">
        {/* Affiche du prochain départ — gérée depuis le module Publicités
            (/publicites), aucun code à toucher pour la mettre à jour. */}
        {affiche && (
          <section className="mx-auto mt-6 max-w-md sm:mt-10">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-gold-1">
              ✦ Prochain départ ✦
            </p>
            <div className="rounded-[26px] bg-gold-gradient p-[3px] shadow-2xl shadow-black/40">
              <div className="overflow-hidden rounded-[23px] bg-navy">
                {affiche.lien ? (
                  <a href={affiche.lien} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urlImage(affiche.image_path!)}
                      alt={affiche.titre}
                      className="w-full"
                    />
                  </a>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlImage(affiche.image_path!)}
                    alt={affiche.titre}
                    className="w-full"
                  />
                )}
              </div>
            </div>
          </section>
        )}

        {/* Suivre mon colis */}
        <section id="suivi" className="mx-auto mt-20 max-w-md scroll-mt-24">
          <div className="rounded-2xl border border-white/15 bg-white/[0.06] p-6 shadow-xl backdrop-blur-sm sm:p-8">
            <div className="mb-5 flex items-center justify-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-1/15 text-gold-1">
                <IconTruck size={19} />
              </span>
              <h2 className="text-lg font-bold">Suivre mon colis</h2>
            </div>
            <form action="/suivi" className="space-y-3">
              <input
                type="text"
                name="numero"
                placeholder="N° de colis"
                required
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-gold-1 focus:outline-none"
              />
              <input
                type="tel"
                name="telephone"
                placeholder="Numéro de téléphone (au dépôt)"
                required
                className="w-full rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-gold-1 focus:outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-lg bg-gold-gradient px-4 py-2.5 text-sm font-semibold text-navy shadow-sm transition-all hover:brightness-105"
              >
                Suivre en temps réel
              </button>
            </form>
          </div>
        </section>

        {/* Prochains départs */}
        {projets && projets.length > 0 && (
          <section id="departs" className="mx-auto mt-20 max-w-4xl scroll-mt-24">
            <SectionHeading eyebrow="Calendrier" titre="Prochains départs" />
            <div className="grid gap-4 sm:grid-cols-2">
              {projets.map((p) => {
                const destinations = Array.from(
                  destinationsParProjet.get(p.id)?.entries() ?? []
                ).sort((a, b) => b[1] - a[1]);
                return (
                  <div
                    key={p.id}
                    className="relative overflow-hidden rounded-xl border border-white/15 bg-white/5 p-5 pl-6 transition-colors hover:bg-white/[0.08]"
                  >
                    <span className="absolute inset-y-0 left-0 w-1 bg-gold-gradient" />
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-1/15 text-gold-1">
                        <IconPlane size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-white">{p.nom}</p>
                        <p className="mt-0.5 text-sm text-white/60">
                          {p.date_depart
                            ? dateFormatter.format(new Date(p.date_depart))
                            : "Date de départ à venir"}
                        </p>
                        {destinations.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {destinations.map(([ville, nb]) => (
                              <span
                                key={ville}
                                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70"
                              >
                                <IconMapPin size={11} />
                                {ville}
                                <span className="text-white/40">· {nb}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Publicités — bannières gérées depuis /publicites */}
        {publicitesBannieres.length > 0 && (
          <section className="mx-auto mt-20 max-w-4xl">
            <SectionHeading eyebrow="À la une" titre="Offres du moment" />
            <div className="grid gap-4 sm:grid-cols-2">
              {publicitesBannieres.map((p) => {
                const img = (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlImage(p.image_path!)}
                    alt={p.titre}
                    className="w-full rounded-xl shadow-lg transition-transform hover:scale-[1.02]"
                  />
                );
                return (
                  <div key={p.id} className="overflow-hidden rounded-xl">
                    {p.lien ? (
                      <a href={p.lien} target="_blank" rel="noreferrer">
                        {img}
                      </a>
                    ) : (
                      img
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Nos services */}
        <section id="services" className="mx-auto mt-20 max-w-4xl scroll-mt-24">
          <SectionHeading eyebrow="Pourquoi nous choisir" titre="Nos services" />
          <div className="grid gap-4 sm:grid-cols-2">
            <ServiceCard
              icon={<IconPlane size={19} />}
              titre="Fret aérien"
              description={`Envoi de colis ${BRAND.routeDescription}, tarifé au poids.`}
            />
            {BRAND.modeGroupageConteneurActif && (
              <ServiceCard
                icon={<IconPackage size={19} />}
                titre="Groupage conteneur"
                description="Envoi de gros volumes par conteneur, tarifé au m³."
              />
            )}
            {BRAND.moduleFranceActif && (
              <ServiceCard
                icon={<IconShieldCheck size={19} />}
                titre="Dédouanement France"
                description="Formalités douanières prises en charge de bout en bout."
              />
            )}
            <ServiceCard
              icon={<IconClock size={19} />}
              titre="Suivi en temps réel"
              description="Statut du colis consultable à tout moment, du dépôt à la livraison."
            />
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="mx-auto mt-20 max-w-4xl scroll-mt-24">
          <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.06] shadow-xl">
            <div className="grid sm:grid-cols-2">
              <div className="p-8 sm:p-10">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gold-1">
                  Contact
                </p>
                <h2 className="text-2xl font-bold">Nous contacter</h2>
                {(site.adresse || site.horaires) && (
                  <div className="mt-4 flex items-start gap-2 text-sm text-white/70">
                    <IconMapPin size={16} className="mt-0.5 shrink-0 text-gold-1" />
                    <span>
                      {site.adresse}
                      {site.adresse && site.horaires && <br />}
                      {site.horaires}
                    </span>
                  </div>
                )}
                {site.email && (
                  <a
                    href={`mailto:${site.email}`}
                    className="mt-3 inline-block text-sm text-white/70 underline-offset-2 hover:text-white hover:underline"
                  >
                    {site.email}
                  </a>
                )}
              </div>
              <div className="flex flex-col items-center justify-center gap-3 border-t border-white/10 bg-black/10 p-8 sm:border-t-0 sm:border-l sm:p-10">
                {contactTel ? (
                  <a
                    href={`https://wa.me/${contactTel}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-gold-gradient px-6 py-3 text-sm font-semibold text-navy shadow-lg shadow-gold-2/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    Contacter sur WhatsApp
                  </a>
                ) : (
                  <p className="text-sm text-white/50">Contact à venir</p>
                )}

                {reseauxSociaux.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {reseauxSociaux.map((r) => (
                      <a
                        key={r.id}
                        href={r.lien!}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
                      >
                        <IconGlobe size={12} />
                        {r.titre}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 text-center sm:px-10">
        <Logo size={26} />
        <p className="mt-3 text-xs text-white/40">
          © {anneeCourante} {BRAND.nom} — {BRAND.tagline}
        </p>
      </footer>
    </div>
  );
}

function SectionHeading({ eyebrow, titre }: { eyebrow: string; titre: string }) {
  return (
    <div className="mb-6 text-center">
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gold-1">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-bold">{titre}</h2>
    </div>
  );
}

function ServiceCard({
  icon,
  titre,
  description,
}: {
  icon: React.ReactNode;
  titre: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.08]">
      <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-gold-1/15 text-gold-1">
        {icon}
      </span>
      <p className="font-semibold text-white">{titre}</p>
      <p className="mt-1 text-sm text-white/65">{description}</p>
    </div>
  );
}
