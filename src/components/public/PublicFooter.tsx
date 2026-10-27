import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { IconMapPin, IconWhatsApp } from "@/components/ui/Icons";
import { BRAND } from "@/lib/brand";
import { IconReseau, plateforme, trierReseaux } from "./ReseauxSociaux";

export type Reseau = { id: string; titre: string; lien: string };

export function PublicFooter({
  adresseDakar,
  horairesDepot = "",
  pointsRetrait = [],
  adresse,
  horaires,
  email,
  whatsapp,
  reseaux,
  legalDisponible,
  racine = "",
}: {
  adresseDakar: string;
  horairesDepot?: string;
  pointsRetrait?: { ville: string; adresse: string; horaires: string }[];
  adresse: string;
  horaires: string;
  email: string;
  whatsapp: string | null;
  reseaux: Reseau[];
  legalDisponible: boolean;
  /** "" sur l'accueil ; "/" depuis une autre page pour atteindre les ancres. */
  racine?: string;
}) {
  const annee = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-black/20">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Logo
            size={56}
            tagline
            texteClasse="text-2xl"
            taglineClasse="text-[11px]"
          />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
            Fret {BRAND.routeDescription} : vos colis et marchandises acheminés
            en toute confiance, suivis à chaque étape.
          </p>
          {reseaux.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {trierReseaux(reseaux).map((r) => (
                <a
                  key={r.id}
                  href={r.lien}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${
                    plateforme(r) === "tiktok"
                      ? "border-gold-1/40 bg-gold-1/10 text-gold-1 hover:bg-gold-1/20"
                      : "border-white/15 text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <IconReseau plateforme={plateforme(r)} size={14} />
                  {r.titre}
                </a>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gold-1">
            Navigation
          </p>
          <ul className="space-y-2 text-sm text-white/65">
            <li>
              <a href={`${racine}#suivi`} className="hover:text-white">
                Suivre mon colis
              </a>
            </li>
            <li>
              <a href={`${racine}#departs`} className="hover:text-white">
                Prochains départs
              </a>
            </li>
            <li>
              <a href={`${racine}#services`} className="hover:text-white">
                Nos services
              </a>
            </li>
            <li>
              <a href={`${racine}#contact`} className="hover:text-white">
                Contact
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gold-1">
            Informations
          </p>
          <ul className="space-y-2 text-sm text-white/65">
            {legalDisponible ? (
              <>
                <li>
                  <Link href="/legal/conditions-generales" className="hover:text-white">
                    Conditions générales de vente
                  </Link>
                </li>
                <li>
                  <Link href="/legal/confidentialite" className="hover:text-white">
                    Politique de confidentialité
                  </Link>
                </li>
                <li>
                  <Link href="/legal/mentions-legales" className="hover:text-white">
                    Mentions légales
                  </Link>
                </li>
              </>
            ) : (
              <li className="text-white/40">—</li>
            )}
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gold-1">
            Contact
          </p>
          <ul className="space-y-3 text-sm text-white/65">
            {adresseDakar && (
              <li className="flex items-start gap-2">
                <IconMapPin size={15} className="mt-0.5 shrink-0 text-gold-1" />
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Dépôt à {BRAND.villeDepart}
                  </span>
                  {adresseDakar}
                  {horairesDepot && (
                    <>
                      <br />
                      {horairesDepot}
                    </>
                  )}
                </span>
              </li>
            )}
            {pointsRetrait.map((p) => (
              <li key={p.ville} className="flex items-start gap-2">
                <IconMapPin size={15} className="mt-0.5 shrink-0 text-gold-1" />
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Retrait à {p.ville}
                  </span>
                  {p.adresse}
                  {p.horaires && (
                    <>
                      <br />
                      {p.horaires}
                    </>
                  )}
                </span>
              </li>
            ))}
            {pointsRetrait.length === 0 && (adresse || horaires) && (
              <li className="flex items-start gap-2">
                <IconMapPin size={15} className="mt-0.5 shrink-0 text-gold-1" />
                <span>
                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    {adresseDakar ? "Retrait en France" : "Adresse"}
                  </span>
                  {adresse}
                  {adresse && horaires && <br />}
                  {horaires}
                </span>
              </li>
            )}
            {whatsapp && (
              <li>
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 hover:text-white"
                >
                  <IconWhatsApp size={15} className="text-gold-1" />
                  WhatsApp
                </a>
              </li>
            )}
            {email && (
              <li>
                <a href={`mailto:${email}`} className="hover:text-white">
                  {email}
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/35 sm:px-8">
        © {annee} {BRAND.nom} — {BRAND.tagline}
      </div>
    </footer>
  );
}
