import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { chargerDestinations } from "@/lib/commandes/destinations";
import { chargerParametresSite, reglesPrix } from "@/lib/parametres";
import { estimerPrix } from "@/lib/prix";
import { STATUT_LABELS } from "@/components/commandes/StatutBadge";
import { mettreEnPause } from "./reglages";
import { memeTelephone } from "./telephone";

type Admin = SupabaseClient<Database>;

export type ContexteOutils = {
  supabase: Admin;
  /** Numéro de l'expéditeur du message : seule identité que l'agent connaît. */
  telephone: string;
  clientNom: string | null;
  /** Test depuis Paramètres : aucune écriture, aucune alerte. */
  simulation: boolean;
  alerterProprietaire: (texte: string) => Promise<void>;
};

export const OUTILS: Anthropic.Tool[] = [
  {
    name: "suivre_colis",
    description:
      "Donne le statut des colis déposés par la personne qui écrit (identifiée par son numéro WhatsApp). Ne renvoie jamais les colis d'un autre client. Sans numéro de colis, liste ses colis récents.",
    input_schema: {
      type: "object",
      properties: {
        numero: {
          type: "integer",
          description: "Numéro du colis (optionnel), tel que donné par le client.",
        },
      },
    },
  },
  {
    name: "estimer_prix",
    description:
      "Calcule une estimation de prix à partir des tarifs officiels (destination, poids). À utiliser pour toute question de prix.",
    input_schema: {
      type: "object",
      properties: {
        destination: { type: "string", description: "Ville de destination (ex. Lyon)." },
        type: { type: "string", enum: ["colis", "enveloppe"] },
        poids_kg: { type: "number", description: "Poids en kg (inutile pour une enveloppe)." },
      },
      required: ["destination", "type"],
    },
  },
  {
    name: "prochains_departs",
    description:
      "Liste les prochains départs (dates de départ et d'arrivée, destinations et tarifs au kilo).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "enregistrer_demande_devis",
    description:
      "Enregistre une demande de devis (grand colis ou professionnel) pour que l'équipe rappelle le client. À appeler seulement une fois le besoin décrit.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["grand_colis", "professionnel"] },
        nom: { type: "string", description: "Nom du client." },
        entreprise: { type: "string" },
        destination: { type: "string" },
        poids_estime: { type: "string", description: "Poids ou volume estimé, texte libre." },
        description: { type: "string", description: "Nature des marchandises et besoin." },
      },
      required: ["nom", "description"],
    },
  },
  {
    name: "demander_a_l_equipe",
    description:
      "Pour une question simple et non sensible dont tu ne connais pas la réponse (ex. mode de paiement, produit précis, détail pratique) : l'équipe est alertée, MAIS tu restes actif dans la conversation. Dis ensuite au client que l'équipe confirmera et continue de l'aider sur le reste.",
    input_schema: {
      type: "object",
      properties: {
        question: { type: "string", description: "La question du client, reformulée clairement." },
      },
      required: ["question"],
    },
  },
  {
    name: "transferer_a_un_humain",
    description:
      "Passe la conversation à un membre de l'équipe (litige, perte/retard/casse, paiement, mécontentement, douane complexe, négociation, hors cadre, demande explicite d'un humain). L'équipe est alertée et l'IA se met en pause.",
    input_schema: {
      type: "object",
      properties: {
        motif: { type: "string", description: "Résumé court de la demande du client." },
      },
      required: ["motif"],
    },
  },
];

const jourFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

export async function executerOutil(
  nom: string,
  entree: Record<string, unknown>,
  ctx: ContexteOutils
): Promise<string> {
  try {
    switch (nom) {
      case "suivre_colis":
        return JSON.stringify(await suivreColis(entree, ctx));
      case "estimer_prix":
        return JSON.stringify(await estimer(entree, ctx));
      case "prochains_departs":
        return JSON.stringify(await prochainsDeparts(ctx));
      case "enregistrer_demande_devis":
        return JSON.stringify(await enregistrerDevis(entree, ctx));
      case "demander_a_l_equipe":
        return JSON.stringify(await demanderAEquipe(entree, ctx));
      case "transferer_a_un_humain":
        return JSON.stringify(await transferer(entree, ctx));
      default:
        return JSON.stringify({ erreur: `Outil inconnu : ${nom}` });
    }
  } catch (e) {
    return JSON.stringify({ erreur: e instanceof Error ? e.message : "Erreur inconnue." });
  }
}

async function suivreColis(entree: Record<string, unknown>, ctx: ContexteOutils) {
  const { data: clients } = await ctx.supabase
    .from("clients")
    .select("id, nom, telephone");
  const ids = (clients ?? [])
    .filter((c) => c.telephone && memeTelephone(c.telephone, ctx.telephone))
    .map((c) => c.id);

  if (ids.length === 0) {
    return {
      trouve: false,
      message:
        "Aucun colis n'est associé à ce numéro WhatsApp. Demande au client le téléphone donné lors du dépôt, ou transfère à un humain.",
    };
  }

  let requete = ctx.supabase
    .from("commandes")
    .select(
      "numero, statut, destination, poids_kg, created_at, date_livraison_reelle, projets(nom, date_depart, date_arrivee)"
    )
    .in("client_id", ids)
    .order("created_at", { ascending: false })
    .limit(8);
  const numero = Number(entree.numero);
  if (Number.isInteger(numero) && numero > 0) requete = requete.eq("numero", numero);

  const { data: colis } = await requete;
  if (!colis || colis.length === 0) {
    return {
      trouve: false,
      message:
        "Aucun colis de ce client ne correspond à cette demande (le numéro n'est peut-être pas le sien).",
    };
  }

  return {
    trouve: true,
    colis: colis.map((c) => {
      const projet = c.projets as unknown as {
        nom: string;
        date_depart: string | null;
        date_arrivee: string | null;
      } | null;
      return {
        numero: c.numero,
        statut: STATUT_LABELS[c.statut],
        destination: c.destination,
        poids_kg: c.poids_kg,
        depose_le: jourFormat.format(new Date(c.created_at)),
        depart_prevu: projet?.date_depart ? jourFormat.format(new Date(projet.date_depart)) : null,
        arrivee_prevue: projet?.date_arrivee ? jourFormat.format(new Date(projet.date_arrivee)) : null,
        livre_le: c.date_livraison_reelle
          ? jourFormat.format(new Date(c.date_livraison_reelle))
          : null,
      };
    }),
  };
}

async function estimer(entree: Record<string, unknown>, ctx: ContexteOutils) {
  const destinations = await chargerDestinations(ctx.supabase);
  const demandee = String(entree.destination ?? "").trim().toLowerCase();
  const dest = destinations.find((d) => d.nom.toLowerCase() === demandee);
  if (!dest) {
    return {
      erreur: `Destination non desservie ou inconnue. Destinations disponibles : ${
        destinations.map((d) => d.nom).join(", ") || "aucune"
      }.`,
    };
  }
  const regles = reglesPrix(await chargerParametresSite(ctx.supabase));
  const type = entree.type === "enveloppe" ? "enveloppe" : "colis";
  const poids = typeof entree.poids_kg === "number" ? entree.poids_kg : null;
  const r = estimerPrix({ nom: dest.nom, tarif: dest.tarif_par_kg }, type, poids, regles);
  if (!r) return { erreur: "Poids manquant ou invalide : demande le poids au client." };
  return {
    destination: dest.nom,
    total_euros: r.total === null ? null : Math.round(r.total * 100) / 100,
    tarif_par_kg: r.tarifParKg,
    petit_colis: r.petitColis,
    enveloppe: r.enveloppe,
    note: "Estimation indicative : le montant définitif est confirmé au dépôt.",
  };
}

async function prochainsDeparts(ctx: ContexteOutils) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const [{ data: projets }, destinations] = await Promise.all([
    ctx.supabase
      .from("projets")
      .select("nom, date_depart, date_arrivee")
      .eq("statut", "actif")
      .order("date_depart", { ascending: true, nullsFirst: false }),
    chargerDestinations(ctx.supabase),
  ]);
  const departs = (projets ?? []).filter(
    (p) => !p.date_depart || p.date_depart.slice(0, 10) >= aujourdhui
  );
  return {
    departs: departs.map((p) => ({
      nom: p.nom,
      depart: p.date_depart ? jourFormat.format(new Date(p.date_depart)) : "date à venir",
      arrivee: p.date_arrivee ? jourFormat.format(new Date(p.date_arrivee)) : null,
    })),
    destinations: destinations.map((d) => ({ nom: d.nom, tarif_par_kg: d.tarif_par_kg })),
  };
}

async function enregistrerDevis(entree: Record<string, unknown>, ctx: ContexteOutils) {
  const texte = (cle: string, max: number) =>
    String(entree[cle] ?? "").trim().slice(0, max);
  const nom = texte("nom", 100);
  const description = texte("description", 2000);
  if (!nom || description.length < 5) {
    return { erreur: "Nom et description du besoin requis : pose la question au client." };
  }
  if (ctx.simulation) {
    return { ok: true, note: "SIMULATION : la demande n'a pas été enregistrée." };
  }

  const ilYaUneDemiHeure = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { count } = await ctx.supabase
    .from("demandes_devis")
    .select("id", { count: "exact", head: true })
    .eq("telephone", ctx.telephone)
    .gte("created_at", ilYaUneDemiHeure);
  if ((count ?? 0) >= 1) {
    return { ok: true, note: "Une demande vient déjà d'être enregistrée pour ce numéro." };
  }

  const { error } = await ctx.supabase.from("demandes_devis").insert({
    type: entree.type === "professionnel" ? "professionnel" : "grand_colis",
    nom,
    entreprise: texte("entreprise", 120) || null,
    telephone: ctx.telephone,
    destination: texte("destination", 80) || null,
    poids_estime: texte("poids_estime", 80) || null,
    description,
  });
  if (error) return { erreur: "Enregistrement impossible, transfère à un humain." };

  await ctx.alerterProprietaire(
    `📝 Nouvelle demande de devis (via l'agent IA)\n${nom} — ${ctx.telephone}\n${description}`
  );
  return { ok: true };
}

async function demanderAEquipe(entree: Record<string, unknown>, ctx: ContexteOutils) {
  const question = String(entree.question ?? "").trim().slice(0, 500);
  if (!question) return { erreur: "Question manquante." };
  if (ctx.simulation) {
    return { ok: true, note: "SIMULATION : l'équipe n'a pas été alertée." };
  }
  await ctx.alerterProprietaire(
    `❓ Question sans réponse (l'IA reste active)\n${ctx.clientNom ?? ctx.telephone} (${ctx.telephone})\n${question}\n\nRépondez directement au client si besoin : l'IA se taira alors 12 h.`
  );
  return { ok: true };
}

async function transferer(entree: Record<string, unknown>, ctx: ContexteOutils) {
  const motif = String(entree.motif ?? "").trim().slice(0, 500) || "Demande à traiter";
  if (ctx.simulation) {
    return { ok: true, note: "SIMULATION : l'équipe n'a pas été alertée." };
  }
  // L'IA se tait 24 h (ou jusqu'à ce qu'un humain réponde, ce qui prolonge/renouvelle la pause).
  await mettreEnPause(ctx.supabase, ctx.telephone, 24, `transfert : ${motif}`);
  await ctx.alerterProprietaire(
    `⚠️ Transfert demandé par l'agent IA\n${ctx.clientNom ?? ctx.telephone} (${ctx.telephone})\nMotif : ${motif}`
  );
  return { ok: true };
}
