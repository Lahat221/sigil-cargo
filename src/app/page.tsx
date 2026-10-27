import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BRAND } from "@/lib/brand";
import { Logo } from "@/components/layout/Logo";
import { chargerDestinations } from "@/lib/commandes/destinations";
import { chargerParametresSite, listeDestinationsBientot,
  listerPointsRetrait, nombreSaisi, reglesPrix } from "@/lib/parametres";
import { PublicNav, type LienNav } from "@/components/public/PublicNav";
import { PublicFooter } from "@/components/public/PublicFooter";
import { HeroCard } from "@/components/public/HeroCard";
import { DepartsCarousel } from "@/components/public/DepartsCarousel";
import { ChiffresCles, type Chiffre } from "@/components/public/ChiffresCles";
import { AnnoncePopup } from "@/components/public/AnnoncePopup";
import { DevisForm } from "@/components/public/DevisForm";
import { BarreReseaux, SectionReseaux } from "@/components/public/ReseauxSociaux";
import {
  Avantages,
  CommentCaMarche,
  Faq,
  SectionTitre,
  Temoignages,
  type Avantage,
  type Etape,
  type QuestionFaq,
} from "@/components/public/Sections";
import {
  IconCheckCircle,
  IconClock,
  IconMapPin,
  IconPackage,
  IconPlane,
  IconShieldCheck,
  IconSparkles,
  IconWhatsApp,
} from "@/components/ui/Icons";

export const dynamic = "force-dynamic";

const jourFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", timeZone: "UTC" });
const moisFormatter = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });

// Somme des poids de tous les colis non annulés, par pages de 1000 lignes
// (limite de l'API) pour rester exacte quand le volume augmente.
async function totalKilos(admin: ReturnType<typeof createAdminClient>): Promise<number> {
  let total = 0;
  for (let debut = 0; ; debut += 1000) {
    const { data } = await admin
      .from("commandes")
      .select("poids_kg")
      .neq("statut", "annulee")
      .order("created_at", { ascending: true })
      .range(debut, debut + 999);
    const lignes = data ?? [];
    total += lignes.reduce((t, l) => t + (l.poids_kg ?? 0), 0);
    if (lignes.length < 1000) return total;
  }
}

export default async function HomePage() {
  // Page vitrine publique — accessible aussi à un agent déjà connecté
  // (lien "Voir le site public" dans la sidebar) : on adapte juste le bouton
  // d'en-tête plutôt que de rediriger.
  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const estConnecte = !!auth.user;

  const admin = createAdminClient();
  const aujourdhui = new Date().toISOString().slice(0, 10);

  const [
    { data: projetsActifs },
    { data: commandesActives },
    { data: publicitesActives },
    destinations,
    site,
    { count: nbColis },
    { count: nbClients },
    { count: nbDeparts },
    kilos,
  ] = await Promise.all([
    admin
      .from("projets")
      .select("id, nom, date_depart, date_arrivee, mode_fret")
      .eq("statut", "actif")
      .order("date_depart", { ascending: true, nullsFirst: false }),
    admin.from("commandes").select("projet_id, destination").neq("statut", "annulee"),
    admin
      .from("publicites")
      .select("*")
      .eq("actif", true)
      .order("ordre", { ascending: true })
      .order("created_at", { ascending: false }),
    chargerDestinations(admin),
    chargerParametresSite(admin),
    admin.from("commandes").select("id", { count: "exact", head: true }).neq("statut", "annulee"),
    admin.from("clients").select("id", { count: "exact", head: true }),
    admin.from("projets").select("id", { count: "exact", head: true }).neq("statut", "annule"),
    totalKilos(admin),
  ]);

  // Départs à venir uniquement (un départ déjà passé n'a plus d'intérêt
  // pour un visiteur) ; sans date : "à venir".
  const departs = (projetsActifs ?? []).filter(
    (p) => !p.date_depart || p.date_depart.slice(0, 10) >= aujourdhui
  );

  function urlImage(path: string) {
    return admin.storage.from("publicites-media").getPublicUrl(path).data.publicUrl;
  }

  const publicites = publicitesActives ?? [];
  const affiche = publicites.find((p) => p.type === "affiche_depart" && p.image_path);
  const bannieres = publicites.filter((p) => p.type === "publicite" && p.image_path);
  const reseaux = publicites
    .filter((p) => p.type === "reseau_social" && p.lien)
    .map((p) => ({ id: p.id, titre: p.titre, lien: p.lien! }));
  const avis = publicites
    .filter((p) => p.type === "temoignage" && p.texte)
    .map((p) => ({ id: p.id, nom: p.titre, texte: p.texte! }));

  const destinationsParProjet = new Map<string, Set<string>>();
  for (const c of commandesActives ?? []) {
    if (!c.destination) continue;
    const s = destinationsParProjet.get(c.projet_id) ?? new Set<string>();
    s.add(c.destination);
    destinationsParProjet.set(c.projet_id, s);
  }

  const chiffresWhatsapp = site.whatsapp.replace(/\D/g, "");
  const whatsapp = chiffresWhatsapp.length >= 6 ? chiffresWhatsapp : null;
  const regles = reglesPrix(site);
  const villesBientot = listeDestinationsBientot(site);
  const pointsRetrait = listerPointsRetrait(site.pointsRetrait);
  const devise = new Intl.NumberFormat("fr-FR", { style: "currency", currency: BRAND.devise });

  const sigil = BRAND.moduleFranceActif;
  const legalDisponible = !BRAND.identite.destinataireNom.includes("RENSEIGNER");
  const calculateurActif = destinations.length > 0;
  const tarifs = destinations
    .flatMap((d) => [d.tarif_par_kg, d.tarif_alimentaire_par_kg])
    .filter((t): t is number => t !== null);
  const tarifMin = tarifs.length > 0 ? Math.min(...tarifs) : null;
  const arrivee =
    destinations.length > 0 ? destinations.map((d) => d.nom).join(" · ") : BRAND.villeArriveeDefaut;

  const liens: LienNav[] = [
    ...(departs.length > 0 || affiche ? [{ href: "#departs", label: "Départs" }] : []),
    ...(sigil ? [{ href: "#comment", label: "Comment ça marche" }] : []),
    { href: "#services", label: "Services" },
    { href: "#devis", label: "Devis" },
    ...(avis.length > 0 ? [{ href: "#avis", label: "Avis" }] : []),
    ...(reseaux.length > 0 ? [{ href: "#reseaux", label: "Réseaux" }] : []),
    ...(sigil ? [{ href: "#faq", label: "FAQ" }] : []),
    { href: "#contact", label: "Contact" },
  ];

  const garanties = sigil
    ? ["Livraison express 48 h", "Suivi en temps réel", "Formalités douanières gérées", "Sécurité garantie"]
    : ["Suivi en temps réel", "Service fiable"];

  // Compte en direct sur la base, ou le cumul saisi dans Paramètres (activité
  // d'avant l'application) quand il est plus élevé — marqué d'un « + ».
  const kgAffiches = Math.max(kilos, nombreSaisi(site.chiffresKg));
  const cumul = (direct: number, saisi: string, label: string): Chiffre => {
    const s = nombreSaisi(saisi);
    return s > direct
      ? { valeur: Math.floor(s), suffixe: "+", label }
      : { valeur: direct, suffixe: "", label };
  };
  const chiffres: Chiffre[] = [
    kgAffiches >= 2000
      ? { valeur: Math.floor(kgAffiches / 1000), suffixe: "+", label: "Tonnes acheminées" }
      : { valeur: Math.round(kgAffiches), suffixe: " kg", label: "Acheminés" },
    cumul(nbClients ?? 0, site.chiffresClients, "Clients"),
    cumul(nbDeparts ?? 0, site.chiffresDeparts, "Départs organisés"),
    ...(destinations.length > 0
      ? [{ valeur: destinations.length, suffixe: "", label: "Villes desservies" }]
      : []),
  ];
  const afficherChiffres =
    (nbColis ?? 0) >= 20 ||
    nombreSaisi(site.chiffresKg) > 0 ||
    nombreSaisi(site.chiffresClients) > 0;

  const etapes: Etape[] = [
    {
      titre: "Déposez votre colis",
      description: `À ${BRAND.villeDepart}, auprès de notre équipe : valise, carton, enveloppe ou marchandises commerciales. Un accusé de réception vous est remis.`,
    },
    {
      titre: "Nous l'enregistrons",
      description:
        "Pesée, photos et vidéo du contenu, étiquette avec QR code : votre colis est identifié et tracé dès le dépôt.",
    },
    {
      titre: "Envol et dédouanement",
      description:
        "Votre colis part sur le prochain vol, et les formalités douanières sont prises en charge par nos soins.",
    },
    {
      titre: "Retrait ou livraison",
      description: `Retrait à notre point de retrait. ${
        BRAND.retrait?.livraisonDomicile ? `${BRAND.retrait.livraisonDomicile}. ` : ""
      }Suivi en temps réel à chaque étape.`,
    },
  ];

  const avantages: Avantage[] = [
    {
      icone: <IconPlane size={22} />,
      titre: "Fret aérien",
      description: `Envoi de colis ${BRAND.routeDescription}, tarifé au poids, avec des départs réguliers.`,
    },
    ...(BRAND.modeGroupageConteneurActif
      ? [
          {
            icone: <IconPackage size={22} />,
            titre: "Groupage conteneur",
            description: "Envoi de gros volumes par conteneur, tarifé au m³.",
          },
        ]
      : []),
    ...(sigil
      ? [
          {
            icone: <IconShieldCheck size={22} />,
            titre: "Dédouanement France",
            description: "Formalités douanières prises en charge de bout en bout.",
          },
        ]
      : []),
    {
      icone: <IconClock size={22} />,
      titre: "Suivi en temps réel",
      description: "Statut du colis consultable à tout moment, du dépôt jusqu'à la livraison.",
    },
    ...(sigil
      ? [
          {
            icone: <IconCheckCircle size={22} />,
            titre: "Colis vérifié",
            description:
              "Photos et vidéo du contenu à la réception, accessibles en scannant le QR code de l'étiquette.",
          },
        ]
      : []),
  ];

  const tarifsTexte =
    destinations.filter((d) => d.tarif_par_kg !== null).length > 0
      ? destinations
          .filter((d) => d.tarif_par_kg !== null)
          .map((d) =>
            d.tarif_alimentaire_par_kg !== null
              ? `${d.nom} : ${devise.format(d.tarif_alimentaire_par_kg)}/kg produits alimentaires, ${devise.format(d.tarif_par_kg!)}/kg autres produits`
              : `${d.nom} : ${devise.format(d.tarif_par_kg!)}/kg`
          )
          .join(" · ")
      : null;

  const questions: QuestionFaq[] = [
    {
      question: "Quels sont vos tarifs ?",
      reponse: (
        <>
          {tarifsTexte ? <p>{tarifsTexte}.</p> : <p>Contactez-nous pour connaître le tarif de votre destination.</p>}
          <p className="mt-2">
            Les colis de moins de {regles.seuilPetitColisKg} kg sont facturés{" "}
            {devise.format(regles.petitColisParKg)}/kg ; les enveloppes (documents) au forfait de{" "}
            {devise.format(regles.forfaitEnveloppe)}. Utilisez le calculateur en haut de page pour une
            estimation.
          </p>
        </>
      ),
    },
    {
      question: "Quel est le délai de livraison ?",
      reponse:
        "Notre service express vise une livraison en 48 h. Ce délai est indicatif : il peut varier selon les compagnies aériennes et les contrôles douaniers.",
    },
    {
      question: "Que puis-je envoyer ?",
      reponse:
        "Valises (jusqu'à 23 kg), cartons, enveloppes et marchandises commerciales. Chaque colis est pesé, photographié et enregistré à la réception.",
    },
    {
      question: "Quels produits sont interdits ?",
      reponse:
        "Certains produits sont interdits ou réglementés à l'import en France : produits d'origine animale (viande, poisson, produits laitiers), contrefaçons, espèces protégées, produits illicites, cosmétiques non conformes. En cas de doute, contactez-nous avant le dépôt.",
    },
    ...(site.adresseDakar
      ? [
          {
            question: `Où déposer mon colis à ${BRAND.villeDepart} ?`,
            reponse: `Le dépôt se fait à l'adresse suivante : ${site.adresseDakar}${site.horairesDepot ? ` (${site.horairesDepot})` : ""}. Contactez-nous sur WhatsApp pour convenir du moment de votre passage.`,
          },
        ]
      : []),
    {
      question: "Comment suivre mon colis ?",
      reponse:
        "Avec le numéro de colis et le téléphone donnés lors du dépôt, depuis la rubrique « Suivre mon colis » en haut de page, ou en scannant le QR code de l'étiquette.",
    },
    {
      question: "Comment récupérer mon colis ?",
      reponse: pointsRetrait.length > 0
        ? `Retrait dans l'un de nos points : ${pointsRetrait
            .map((p) => `${p.ville} — ${p.adresse}${p.horaires ? ` (${p.horaires})` : ""}`)
            .join(" ; ")}.`
        : BRAND.retrait
        ? `Retrait au ${BRAND.retrait.adresse} (${BRAND.retrait.horaires}). ${BRAND.retrait.livraisonDomicile}.`
        : "Notre équipe vous contacte dès l'arrivée de votre colis pour convenir de la remise.",
    },
  ];

  return (
    <div className="min-h-screen overflow-x-clip bg-navy-gradient text-white">
      <PublicNav liens={liens} estConnecte={estConnecte} ctaHref="#suivi" />

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pb-12 pt-14 sm:px-8 sm:pb-16 sm:pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-[10%] h-96 w-96 rounded-full bg-gold-1/15 blur-[120px]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-40 h-80 w-80 rounded-full bg-navy-3/60 blur-[110px]"
        />

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-9">
              <Logo
                size={84}
                tagline
                texteClasse="text-3xl sm:text-4xl"
                taglineClasse="text-[11px] sm:text-sm"
              />
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-1/30 bg-gold-1/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-gold-1">
              <IconSparkles size={13} />
              Votre partenaire fret aérien
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              Fret aérien express
              <span className="mt-2 block bg-gold-gradient bg-clip-text text-transparent">
                {BRAND.villeDepart} → {arrivee}
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
              {BRAND.tagline} — vos colis, valises et marchandises acheminés en toute confiance,
              suivis à chaque étape.
            </p>

            {tarifMin !== null && (
              <p className="mt-6 inline-flex items-baseline gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5">
                <span className="text-sm text-white/55">À partir de</span>
                <span className="text-2xl font-extrabold text-gold-1">
                  {devise.format(tarifMin)}
                </span>
                <span className="text-sm text-white/55">/ kg</span>
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {calculateurActif && (
                <a
                  href="#estimer"
                  className="rounded-xl bg-gold-gradient px-6 py-3.5 text-sm font-semibold text-navy shadow-lg shadow-gold-2/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Estimer mon envoi
                </a>
              )}
              <a
                href="#suivi"
                className="rounded-xl border border-white/20 px-6 py-3.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
              >
                Suivre mon colis
              </a>
            </div>

            <BarreReseaux reseaux={reseaux} />

            <ul className="mt-8 grid max-w-xl gap-x-6 gap-y-3 sm:grid-cols-2">
              {garanties.map((g) => (
                <li key={g} className="flex items-center gap-2.5 text-sm text-white/70">
                  <IconCheckCircle size={18} className="shrink-0 text-gold-1" />
                  {g}
                </li>
              ))}
            </ul>
          </div>

          <HeroCard
            destinations={destinations.map((d) => ({
              nom: d.nom,
              tarif: d.tarif_par_kg,
              tarifAlimentaire: d.tarif_alimentaire_par_kg,
            }))}
            regles={regles}
            whatsapp={whatsapp}
            devise={BRAND.devise}
          />
        </div>
      </section>

      {/* Prochains départs */}
      {(departs.length > 0 || affiche) && (
        <section id="departs" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionTitre
              eyebrow="Calendrier"
              titre="Prochains départs"
              description="Dates de départ, d'arrivée et tarifs au kilo de nos prochains vols."
            />

            <div
              className={
                affiche ? "grid items-center gap-10 lg:grid-cols-[minmax(0,380px)_1fr]" : ""
              }
            >
              {affiche && (
                <div className="mx-auto w-full max-w-sm">
                  <div className="rounded-[26px] bg-gold-gradient p-[3px] shadow-2xl shadow-black/40">
                    <div className="overflow-hidden rounded-[23px] bg-navy">
                      {affiche.lien ? (
                        <a href={affiche.lien} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={urlImage(affiche.image_path!)} alt={affiche.titre} className="w-full" />
                        </a>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={urlImage(affiche.image_path!)} alt={affiche.titre} className="w-full" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {departs.length > 0 && (
                <div className="min-w-0">
                  <DepartsCarousel>
                    {departs.map((p) => {
                      const villes = Array.from(destinationsParProjet.get(p.id) ?? []);
                      const pastilles =
                        villes.length > 0
                          ? villes.map((v) => ({
                              nom: v,
                              tarif: destinations.find((d) => d.nom === v)?.tarif_par_kg ?? null,
                              tarifAlim:
                                destinations.find((d) => d.nom === v)?.tarif_alimentaire_par_kg ?? null,
                            }))
                          : destinations.map((d) => ({
                              nom: d.nom,
                              tarif: d.tarif_par_kg,
                              tarifAlim: d.tarif_alimentaire_par_kg,
                            }));
                      const dateDepart = p.date_depart ? new Date(p.date_depart) : null;
                      const dateArrivee = p.date_arrivee ? new Date(p.date_arrivee) : null;
                      return (
                        <article
                          key={p.id}
                          className="relative w-[290px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/12 bg-white/[0.05] p-5 transition-colors hover:bg-white/[0.08] sm:w-[320px]"
                        >
                          <span className="absolute inset-x-0 top-0 h-1 bg-gold-gradient" />
                          <p className="truncate text-sm font-semibold text-white/80">{p.nom}</p>

                          <div className="mt-4 flex items-center gap-3">
                            <div className="rounded-xl bg-white/[0.08] px-3.5 py-2 text-center">
                              <p className="text-[10px] uppercase tracking-wider text-white/50">Départ</p>
                              {dateDepart ? (
                                <p className="text-lg font-extrabold leading-tight text-white">
                                  {jourFormatter.format(dateDepart)}
                                  <span className="block text-xs font-semibold uppercase text-gold-1">
                                    {moisFormatter.format(dateDepart)}
                                  </span>
                                </p>
                              ) : (
                                <p className="py-1 text-xs font-semibold text-white/70">À venir</p>
                              )}
                            </div>

                            <div className="flex flex-1 items-center gap-1.5 text-gold-1">
                              <span className="h-px flex-1 border-t border-dashed border-gold-1/50" />
                              <IconPlane size={16} />
                              <span className="h-px flex-1 border-t border-dashed border-gold-1/50" />
                            </div>

                            <div className="rounded-xl bg-white/[0.08] px-3.5 py-2 text-center">
                              <p className="text-[10px] uppercase tracking-wider text-white/50">Arrivée</p>
                              {dateArrivee ? (
                                <p className="text-lg font-extrabold leading-tight text-white">
                                  {jourFormatter.format(dateArrivee)}
                                  <span className="block text-xs font-semibold uppercase text-gold-1">
                                    {moisFormatter.format(dateArrivee)}
                                  </span>
                                </p>
                              ) : (
                                <p className="py-1 text-xs font-semibold text-white/70">À préciser</p>
                              )}
                            </div>
                          </div>

                          <p className="mt-5 flex items-center gap-1.5 text-sm font-medium text-white">
                            <IconMapPin size={14} className="text-gold-1" />
                            {BRAND.villeDepart}
                            <span className="text-white/40">→</span>
                            {pastilles.length > 0
                              ? pastilles.map((x) => x.nom).join(" · ")
                              : BRAND.villeArriveeDefaut}
                          </p>

                          {pastilles.some((x) => x.tarif !== null) && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {pastilles
                                .filter((x) => x.tarif !== null)
                                .map((x) => (
                                  <span
                                    key={x.nom}
                                    className="rounded-full bg-gold-1/12 px-2.5 py-1 text-xs font-semibold text-gold-1"
                                  >
                                    {x.nom} ·{" "}
                                    {x.tarifAlim !== null
                                      ? `${devise.format(x.tarifAlim)} alim. · ${devise.format(x.tarif!)} autres /kg`
                                      : `${devise.format(x.tarif!)}/kg`}
                                  </span>
                                ))}
                            </div>
                          )}

                          <p className="mt-4 border-t border-white/10 pt-3 text-xs text-white/50">
                            {p.mode_fret === "conteneur" ? "Groupage conteneur" : "Fret aérien"}
                          </p>
                        </article>
                      );
                    })}
                  </DepartsCarousel>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Offres du moment */}
      {bannieres.length > 0 && (
        <section className="px-5 pb-16 sm:px-8 sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <SectionTitre eyebrow="À la une" titre="Offres du moment" />
            <div className="grid gap-5 sm:grid-cols-2">
              {bannieres.map((p) => {
                const img = (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={urlImage(p.image_path!)}
                    alt={p.titre}
                    className="w-full rounded-2xl shadow-xl transition-transform duration-300 hover:scale-[1.02]"
                  />
                );
                return (
                  <div key={p.id} className="overflow-hidden rounded-2xl">
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
          </div>
        </section>
      )}

      {/* Réseaux sociaux (TikTok en avant) */}
      <SectionReseaux reseaux={reseaux} />

      {/* Prochaines destinations */}
      {villesBientot.length > 0 && (
        <section id="bientot" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionTitre
              eyebrow="Nous grandissons"
              titre="Prochaines destinations"
              description="De nouvelles villes ouvrent bientôt. Soyez prévenu dès l'ouverture."
            />
            <div className="flex flex-wrap justify-center gap-3">
              {villesBientot.map((ville) => (
                <div
                  key={ville}
                  className="flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.05] py-3 pl-5 pr-3 transition-colors hover:border-gold-1/30 hover:bg-white/[0.08]"
                >
                  <IconMapPin size={16} className="text-gold-1" />
                  <span className="font-semibold text-white">{ville}</span>
                  <span className="rounded-full bg-gold-1/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-1">
                    Bientôt
                  </span>
                </div>
              ))}
            </div>
            {whatsapp && (
              <div className="mt-8 text-center">
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                    `Bonjour, je souhaite être prévenu de l'ouverture de nouvelles destinations (${villesBientot.join(", ")}).`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-gold-1/40 px-6 py-3 text-sm font-semibold text-gold-1 transition-colors hover:bg-gold-1/10"
                >
                  <IconWhatsApp size={16} />
                  Être prévenu de l&apos;ouverture
                </a>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Comment ça marche */}
      {sigil && (
        <section id="comment" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionTitre
              eyebrow="En 4 étapes"
              titre="Comment ça marche"
              description="De votre dépôt à la remise de votre colis, tout est suivi et simple."
            />
            <CommentCaMarche etapes={etapes} />
          </div>
        </section>
      )}

      {/* Services */}
      <section id="services" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionTitre eyebrow="Pourquoi nous choisir" titre="Nos services" />
          <Avantages avantages={avantages} />
        </div>
      </section>

      {/* Devis grands colis / professionnels */}
      <section id="devis" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="lg:sticky lg:top-28">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-1">
              Sur mesure
            </p>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Devis pour grands colis et professionnels
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/60">
              Palettes, gros volumes, marchandises commerciales : décrivez votre besoin et nous
              revenons vers vous avec une offre adaptée.
            </p>
            <ul className="mt-7 space-y-3.5">
              {[
                "Une réponse personnalisée à votre demande",
                ...(sigil ? ["Formalités douanières prises en charge"] : []),
                "Suivi de vos colis en temps réel",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-white/75">
                  <IconCheckCircle size={19} className="mt-0.5 shrink-0 text-gold-1" />
                  {point}
                </li>
              ))}
            </ul>
            {whatsapp && (
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                  "Bonjour, je souhaite un devis pour un grand colis / un envoi professionnel."
                )}`}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-gold-1 hover:underline"
              >
                <IconWhatsApp size={16} />
                Ou écrivez-nous directement sur WhatsApp
              </a>
            )}
          </div>

          <DevisForm
            destinations={destinations.map((d) => d.nom)}
            legalDisponible={legalDisponible}
          />
        </div>
      </section>

      {/* Chiffres clés */}
      {afficherChiffres && (
        <section className="border-y border-white/10 bg-black/15 px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <ChiffresCles chiffres={chiffres} />
          </div>
        </section>
      )}

      {/* Témoignages */}
      {avis.length > 0 && (
        <section id="avis" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionTitre
              eyebrow="Témoignages"
              titre="Ce que disent nos clients"
              description="Des clients qui nous confient leurs colis, de départ en départ."
            />
            <Temoignages avis={avis} />
          </div>
        </section>
      )}

      {/* FAQ */}
      {sigil && (
        <section id="faq" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionTitre
              eyebrow="Questions fréquentes"
              titre="Tout savoir avant d'envoyer"
              description="Tarifs, délais, produits acceptés : les réponses aux questions les plus posées."
            />
            <Faq questions={questions} />
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" className="scroll-mt-20 px-5 pb-20 pt-8 sm:px-8 sm:pb-28">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-3xl border border-white/12 bg-white/[0.05] px-6 py-12 text-center shadow-2xl sm:px-12 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 h-56 w-[28rem] -translate-x-1/2 rounded-full bg-gold-1/15 blur-[90px]"
            />
            <div className="relative">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-1">
                Contact
              </p>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Une question ? Parlons de votre envoi
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-white/60">
                Notre équipe vous répond rapidement pour vous conseiller et préparer votre prochain
                colis.
              </p>

              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-8 inline-flex items-center gap-2.5 rounded-xl bg-gold-gradient px-7 py-4 text-sm font-semibold text-navy shadow-lg shadow-gold-2/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <IconWhatsApp size={18} />
                  Contacter sur WhatsApp
                </a>
              )}

              <div className="mx-auto mt-10 grid max-w-3xl gap-4 text-left sm:grid-cols-2">
                {site.adresseDakar && (
                  <AdresseCarte
                    titre={`Dépôt à ${BRAND.villeDepart}`}
                    adresse={site.adresseDakar}
                    detail={site.horairesDepot || undefined}
                  />
                )}
                {pointsRetrait.map((p) => (
                  <AdresseCarte
                    key={p.ville}
                    titre={`Retrait à ${p.ville}`}
                    adresse={p.adresse}
                    detail={p.horaires || undefined}
                  />
                ))}
                {pointsRetrait.length === 0 && (site.adresse || site.horaires) && (
                  <AdresseCarte
                    titre={site.adresseDakar ? "Retrait en France" : "Adresse"}
                    adresse={site.adresse}
                    detail={site.horaires}
                  />
                )}
              </div>
              {site.email && (
                <p className="mt-6 text-sm text-white/65">
                  <a href={`mailto:${site.email}`} className="hover:text-white hover:underline">
                    {site.email}
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <PublicFooter
        adresseDakar={site.adresseDakar}
        horairesDepot={site.horairesDepot}
        pointsRetrait={pointsRetrait}
        adresse={site.adresse}
        horaires={site.horaires}
        email={site.email}
        whatsapp={whatsapp}
        reseaux={reseaux}
        legalDisponible={legalDisponible}
      />

      {/* Bouton WhatsApp flottant */}
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noreferrer"
          aria-label="Nous écrire sur WhatsApp"
          className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl shadow-black/40 transition-transform hover:scale-110"
        >
          <IconWhatsApp size={28} />
        </a>
      )}

      {affiche && (
        <AnnoncePopup
          imageUrl={urlImage(affiche.image_path!)}
          titre={affiche.titre}
          lien={affiche.lien}
        />
      )}
    </div>
  );
}

function AdresseCarte({
  titre,
  adresse,
  detail,
}: {
  titre: string;
  adresse: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-5">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold-1">
        <IconMapPin size={14} />
        {titre}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-white/80">{adresse}</p>
      {detail && <p className="mt-1 text-sm text-white/55">{detail}</p>}
      {adresse && (
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs font-semibold text-gold-1 hover:underline"
        >
          Voir sur la carte →
        </a>
      )}
    </div>
  );
}
