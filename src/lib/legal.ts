import { BRAND } from "@/lib/brand";
import type { ParametresSite, ReglesPrix } from "@/lib/parametres";

export type SectionLegale = { titre: string; paragraphes: string[] };
export type PageLegale = { titre: string; intro?: string; sections: SectionLegale[] };

export const SLUGS_LEGAUX = [
  "mentions-legales",
  "conditions-generales",
  "confidentialite",
] as const;
export type SlugLegal = (typeof SLUGS_LEGAUX)[number];

export const MISE_A_JOUR = "octobre 2026";

const euro = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: BRAND.devise }).format(n);

function coordonnees(site: ParametresSite): string {
  const { destinataireTel } = BRAND.identite;
  return [
    destinataireTel && !destinataireTel.includes("RENSEIGNER") ? `téléphone : ${destinataireTel}` : null,
    site.email ? `email : ${site.email}` : null,
    site.whatsapp ? `WhatsApp : ${site.whatsapp}` : null,
  ]
    .filter(Boolean)
    .join(" ; ");
}

export function contenuLegal(
  slug: SlugLegal,
  site: ParametresSite,
  regles: ReglesPrix
): PageLegale {
  const id = BRAND.identite;
  const editeur = `${id.destinataireNom} — SIRET ${id.destinataireSiret} — ${id.destinataireAdresse}`;
  const contact = coordonnees(site);

  if (slug === "mentions-legales") {
    return {
      titre: "Mentions légales",
      sections: [
        {
          titre: "Éditeur du site",
          paragraphes: [
            `Le site ${BRAND.nom} est édité par : ${editeur}.`,
            contact ? `Contact : ${contact}.` : "",
          ].filter(Boolean),
        },
        {
          titre: "Directeur de la publication",
          paragraphes: [`${id.destinataireNom}.`],
        },
        {
          titre: "Hébergement",
          paragraphes: [
            "Le site est hébergé par Vercel Inc. (États-Unis) — https://vercel.com. Les données de l'application sont stockées sur l'infrastructure cloud de Supabase.",
          ],
        },
        {
          titre: "Propriété intellectuelle",
          paragraphes: [
            `L'ensemble des contenus du site (textes, logos, visuels, affiches) est la propriété de ${BRAND.nom}. Toute reproduction sans autorisation écrite préalable est interdite.`,
          ],
        },
        {
          titre: "Responsabilité",
          paragraphes: [
            "Les informations publiées (tarifs, dates de départ, délais) sont données à titre indicatif et peuvent évoluer. Elles sont confirmées lors du dépôt du colis. Le site peut contenir des liens vers des sites tiers dont nous ne maîtrisons pas le contenu.",
          ],
        },
        {
          titre: "Données personnelles",
          paragraphes: [
            "Le traitement des données personnelles est détaillé dans notre politique de confidentialité.",
          ],
        },
      ],
    };
  }

  if (slug === "conditions-generales") {
    return {
      titre: "Conditions générales de vente",
      intro: `Les présentes conditions régissent les prestations de transport de colis et de marchandises proposées par ${BRAND.nom} (${editeur}).`,
      sections: [
        {
          titre: "1. Prestations",
          paragraphes: [
            `${BRAND.nom} propose un service de fret aérien ${BRAND.routeDescription} : dépôt du colis à ${BRAND.villeDepart}, enregistrement et pesée, transport aérien, prise en charge des formalités douanières, puis remise du colis (retrait ou livraison selon disponibilité).`,
          ],
        },
        {
          titre: "2. Tarifs",
          paragraphes: [
            `Les tarifs sont exprimés en euros, au kilogramme et selon la destination ; ils sont indiqués sur ce site et sur nos affiches de départ. Les colis de moins de ${regles.seuilPetitColisKg} kg sont facturés ${euro(regles.petitColisParKg)} par kilogramme ; les enveloppes (documents) sont facturées au forfait de ${euro(regles.forfaitEnveloppe)}.`,
            "Le calculateur du site fournit une estimation indicative. Le montant définitif est établi d'après le poids constaté lors du dépôt du colis.",
          ],
        },
        {
          titre: "3. Marchandises acceptées et interdites",
          paragraphes: [
            "Sont acceptés les valises, cartons, enveloppes et marchandises commerciales, dans le respect de la réglementation. Certains produits sont interdits ou réglementés à l'import (notamment les produits d'origine animale, les contrefaçons, les espèces protégées, les produits illicites).",
            `Le client déclare de façon exacte le contenu de ses colis. ${BRAND.nom} peut refuser ou retenir tout colis dont le contenu est non conforme, interdit ou non déclaré, sans que cela ouvre droit à indemnisation.`,
          ],
        },
        {
          titre: "4. Dépôt et vérification",
          paragraphes: [
            "Un accusé de réception est remis au client lors du dépôt. Le contenu peut être vérifié, photographié ou filmé à la réception ; ces éléments, avec le poids constaté, font foi en cas de désaccord.",
          ],
        },
        {
          titre: "5. Délais",
          paragraphes: [
            "Les délais annoncés (par exemple une livraison express en 48 h) sont indicatifs et non contractuels : ils dépendent notamment des compagnies aériennes, des contrôles douaniers et des cas de force majeure.",
          ],
        },
        {
          titre: "6. Suivi",
          paragraphes: [
            "L'avancement d'un colis peut être consulté sur le site à l'aide du numéro de colis et du téléphone communiqués lors du dépôt.",
          ],
        },
        {
          titre: "7. Paiement",
          paragraphes: ["Les modalités de paiement sont communiquées au client lors du dépôt de son colis."],
        },
        {
          titre: "8. Responsabilité et réclamations",
          paragraphes: [
            `${BRAND.nom} met en œuvre tous les moyens nécessaires au bon acheminement des colis. En cas de perte, de retard ou de dommage, le client doit le signaler dans les meilleurs délais en conservant son accusé de réception ; la réclamation est examinée sur la base des éléments enregistrés à la réception (photos, vidéo, poids).`,
            "Sa responsabilité ne peut être engagée en cas de contenu non déclaré ou non conforme, d'emballage inadapté fourni par le client, de décision des autorités douanières ou de force majeure.",
          ],
        },
        {
          titre: "9. Données personnelles",
          paragraphes: ["Les données du client sont traitées conformément à notre politique de confidentialité."],
        },
        {
          titre: "10. Droit applicable",
          paragraphes: [
            "Les présentes conditions sont soumises au droit français. En cas de litige, les parties recherchent d'abord une solution amiable.",
          ],
        },
      ],
    };
  }

  return {
    titre: "Politique de confidentialité",
    intro: `${BRAND.nom} accorde une grande importance à la protection de vos données personnelles. Cette page explique quelles données nous traitons et pourquoi.`,
    sections: [
      {
        titre: "Responsable du traitement",
        paragraphes: [`${editeur}.`, contact ? `Contact : ${contact}.` : ""].filter(Boolean),
      },
      {
        titre: "Données collectées",
        paragraphes: [
          "Identité et coordonnées (nom, téléphone, adresse), informations sur le colis (contenu déclaré, poids, photos et vidéos prises à la réception), identité de la personne qui dépose le colis le cas échéant, et historique de suivi.",
          "Sur la page de suivi, le numéro de colis et le téléphone saisis servent uniquement à retrouver votre colis.",
        ],
      },
      {
        titre: "Finalités",
        paragraphes: [
          "Gestion des envois et du suivi, information du client sur l'état de son colis (y compris par WhatsApp), facturation, accomplissement des formalités douanières et respect de nos obligations légales.",
        ],
      },
      {
        titre: "Bases légales",
        paragraphes: [
          "Exécution du contrat de transport, respect d'obligations légales (douanières, comptables) et intérêt légitime (sécurité des colis, preuve en cas de litige).",
        ],
      },
      {
        titre: "Destinataires",
        paragraphes: [
          `Vos données sont accessibles à l'équipe de ${BRAND.nom}, aux autorités et transitaires pour les formalités douanières, et à nos prestataires techniques (hébergement, base de données, messagerie). Nous ne vendons pas vos données.`,
        ],
      },
      {
        titre: "Durée de conservation",
        paragraphes: [
          "Vos données sont conservées le temps nécessaire à la gestion de l'envoi, puis pendant les durées légales applicables (obligations comptables et douanières).",
        ],
      },
      {
        titre: "Vos droits",
        paragraphes: [
          `Vous disposez d'un droit d'accès, de rectification, d'effacement, d'opposition, de limitation et de portabilité de vos données. Pour l'exercer, contactez-nous${contact ? ` (${contact})` : ""}. Vous pouvez aussi introduire une réclamation auprès de la CNIL (www.cnil.fr).`,
        ],
      },
      {
        titre: "Cookies",
        paragraphes: [
          "Ce site n'utilise ni cookie publicitaire ni outil de mesure d'audience. Seuls des éléments techniques strictement nécessaires sont utilisés (par exemple la session de connexion de l'équipe).",
        ],
      },
      {
        titre: "Sécurité",
        paragraphes: [
          "Les échanges sont chiffrés (HTTPS), l'accès à l'application est protégé par authentification et réservé aux personnes autorisées.",
        ],
      },
    ],
  };
}
