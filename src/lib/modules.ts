// Modules accessibles depuis le menu — slugs utilisés par le middleware et
// la sidebar (profiles.modules_autorises). Un admin a toujours accès à tout.
export const MODULES_DISPONIBLES: { slug: string; label: string }[] = [
  { slug: "tableau-de-bord", label: "Tableau de bord" },
  { slug: "commandes", label: "Colis" },
  { slug: "projets", label: "Projets" },
  { slug: "clients", label: "Clients" },
  { slug: "chat", label: "Chat" },
  { slug: "notifications-whatsapp", label: "Campagne de Communication" },
  { slug: "publicites", label: "Publicités" },
  { slug: "charges-depenses", label: "Charges & Dépenses" },
  { slug: "gestion-douaniere", label: "Gestion Douanière" },
  { slug: "parametres", label: "Paramètres" },
];
