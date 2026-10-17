import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { BRAND } from "@/lib/brand";

type Client = SupabaseClient<Database>;

export type StatutEtape = "fait" | "a_faire" | "alerte";

export type EtapeId = "colis" | "dakar" | "lta" | "audit" | "documents";

export type EtapeDepart = {
  id: EtapeId;
  /** Nom court (menu, fil d'étapes). */
  nom: string;
  titre: string;
  detail: string;
  statut: StatutEtape;
  /** Page de l'étape. */
  page: string;
  /** Lien vers l'endroit précis où agir (peut cibler un filtre de la page). */
  href: string;
  action: string;
};

export type EtatDepart = {
  etapes: EtapeDepart[];
  faites: number;
  total: number;
  /** Première étape non terminée ; null quand le départ est prêt. */
  prochaine: EtapeDepart | null;
};

type ColisExtraction = {
  id: string;
  douane_extractions: { id: string; statut: string } | null;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });

function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? "s" : ""}`;
}

/**
 * Où en est le dédouanement d'un départ ? Une liste d'étapes (colis analysés,
 * produits validés, déclaration Dakar, LTA, audit, documents France) avec
 * leur état et un lien vers l'écran où agir — la « prochaine étape » est la
 * première non terminée.
 */
export async function chargerEtatDepart(
  supabase: Client,
  projetId: string
): Promise<EtatDepart> {
  const france = BRAND.moduleFranceActif;
  const q = `?projet=${projetId}`;

  const [{ data: colisData }, { data: expedition }] = await Promise.all([
    supabase
      .from("commandes")
      .select("id, douane_extractions(id, statut)")
      .eq("projet_id", projetId)
      .neq("statut", "annulee")
      .returns<ColisExtraction[]>(),
    supabase
      .from("douane_expeditions_france")
      .select("id, mawb, date_vol, lta_fichier_path, declaration_dakar_validee")
      .eq("projet_id", projetId)
      .maybeSingle(),
  ]);

  const colis = colisData ?? [];
  const statutDe = (c: ColisExtraction) => c.douane_extractions?.statut ?? "non_traite";
  const total = colis.length;
  const nonTraites = colis.filter((c) => statutDe(c) === "non_traite").length;
  const enCours = colis.filter((c) => statutDe(c) === "en_cours").length;
  const erreurs = colis.filter((c) => statutDe(c) === "erreur").length;
  const aVerifier = colis.filter((c) => statutDe(c) === "a_verifier").length;
  const aValider = colis.filter((c) => ["traite", "a_verifier"].includes(statutDe(c))).length;
  const analyses = total - nonTraites - enCours - erreurs;

  const extractionIds = colis
    .map((c) => c.douane_extractions?.id)
    .filter((id): id is string => !!id);
  let hsIncertain = 0;
  if (extractionIds.length > 0) {
    const { count } = await supabase
      .from("douane_produits")
      .select("id", { count: "exact", head: true })
      .in("extraction_id", extractionIds)
      .eq("hs_status", "a_verifier");
    hsIncertain = count ?? 0;
  }

  const etapes: EtapeDepart[] = [];

  // 1. Colis : analyse IA puis vérification/validation des produits et codes HS
  const analyseOk = total > 0 && nonTraites === 0 && enCours === 0 && erreurs === 0;
  const verifOk = analyseOk && aValider === 0 && hsIncertain === 0;
  etapes.push({
    id: "colis",
    nom: "Colis",
    titre: "Analyser et valider les colis",
    detail:
      total === 0
        ? "Aucun colis dans ce départ"
        : erreurs > 0
          ? `${pluriel(erreurs, "colis")} en erreur — à relancer`
          : !analyseOk
            ? `${analyses}/${total} colis analysés`
            : verifOk
              ? `${total}/${total} colis analysés et validés`
              : [
                  aValider > 0 ? `${pluriel(aValider, "colis")} à valider` : null,
                  hsIncertain > 0 ? `${pluriel(hsIncertain, "code")} HS à vérifier` : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
    statut: verifOk ? "fait" : erreurs > 0 || (analyseOk && (hsIncertain > 0 || aVerifier > 0)) ? "alerte" : "a_faire",
    page: `/gestion-douaniere${q}`,
    href: !analyseOk || erreurs > 0 ? `/gestion-douaniere${q}` : `/gestion-douaniere${q}&statut=${aVerifier > 0 ? "a_verifier" : "traite"}`,
    action: erreurs > 0 ? "Voir les erreurs" : !analyseOk ? "Analyser les colis" : "Vérifier les colis",
  });

  // 3. Déclaration Dakar
  const dakarOk = !!expedition?.declaration_dakar_validee;
  etapes.push({
    id: "dakar",
    nom: "Déclaration Dakar",
    titre: "Valider la déclaration Dakar",
    detail: dakarOk ? "Déclaration validée" : "Pas encore validée",
    statut: dakarOk ? "fait" : "a_faire",
    page: `/gestion-douaniere/declaration${q}`,
    href: `/gestion-douaniere/declaration${q}`,
    action: "Ouvrir la déclaration",
  });

  if (france) {
    // 4. LTA (fichier + MAWB + date de vol)
    const manques = [
      expedition?.lta_fichier_path ? null : "fichier LTA",
      expedition?.mawb ? null : "n° MAWB",
      expedition?.date_vol ? null : "date de vol",
    ].filter(Boolean);
    etapes.push({
      id: "lta",
      nom: "LTA",
      titre: "Renseigner la LTA",
      detail: manques.length === 0 ? `MAWB ${expedition?.mawb} · vol du ${expedition?.date_vol}` : `Manque : ${manques.join(", ")}`,
      statut: manques.length === 0 ? "fait" : "a_faire",
      page: `/gestion-douaniere/dedouanement-france${q}`,
      href: `/gestion-douaniere/dedouanement-france${q}`,
      action: "Compléter la LTA",
    });

    // 5. Audit des produits à risque
    let audit: { version: number; critiques: number; autres: number } | null = null;
    let derniereDeclaration: { version: number; created_at: string } | null = null;
    if (expedition) {
      const [{ data: a }, { data: d }] = await Promise.all([
        supabase
          .from("douane_audits_france")
          .select("version, nb_alertes_critiques, nb_alertes_reglementation, nb_alertes_ambigues")
          .eq("expedition_id", expedition.id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("douane_declarations_france")
          .select("version, created_at")
          .eq("expedition_id", expedition.id)
          .eq("statut", "genere")
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (a) {
        audit = {
          version: a.version,
          critiques: a.nb_alertes_critiques,
          autres: a.nb_alertes_reglementation + a.nb_alertes_ambigues,
        };
      }
      derniereDeclaration = d ?? null;
    }
    const auditOk = !!audit && audit.critiques === 0;
    etapes.push({
      id: "audit",
      nom: "Audit",
      titre: "Auditer les produits à risque",
      detail: !audit
        ? "Audit pas encore lancé"
        : audit.critiques > 0
          ? `${pluriel(audit.critiques, "alerte")} critique${audit.critiques > 1 ? "s" : ""} à traiter`
          : audit.autres > 0
            ? `Audit v${audit.version} · ${pluriel(audit.autres, "alerte")} à relire`
            : `Audit v${audit.version} sans alerte`,
      statut: auditOk ? "fait" : audit && audit.critiques > 0 ? "alerte" : "a_faire",
      page: `/gestion-douaniere/audit-france${q}`,
      href: `/gestion-douaniere/audit-france${q}`,
      action: audit ? "Voir l'audit" : "Lancer l'audit",
    });

    // 6. Documents France
    etapes.push({
      id: "documents",
      nom: "Documents",
      titre: "Générer les documents France",
      detail: derniereDeclaration
        ? `v${derniereDeclaration.version} générée le ${dateFormatter.format(new Date(derniereDeclaration.created_at))}`
        : "Pas encore générés",
      statut: derniereDeclaration ? "fait" : "a_faire",
      page: `/gestion-douaniere/documents-france${q}`,
      href: `/gestion-douaniere/documents-france${q}`,
      action: "Générer les documents",
    });
  }

  const faites = etapes.filter((e) => e.statut === "fait").length;
  return {
    etapes,
    faites,
    total: etapes.length,
    prochaine: etapes.find((e) => e.statut !== "fait") ?? null,
  };
}

export type AlertesDouane = {
  colisAVerifier: number;
  colisEnErreur: number;
  hsAVerifier: number;
  auditCritiques: number;
  total: number;
};

/**
 * Points qui demandent une action humaine sur les départs en cours
 * (statut « actif ») : colis à vérifier ou en erreur, codes HS douteux,
 * alertes critiques d'audit. Alimente la pastille du menu et le tableau de bord.
 * Ne lève jamais : en cas de souci, renvoie zéro plutôt que de casser la page.
 */
export async function compterAlertesDouane(supabase: Client): Promise<AlertesDouane> {
  const vide: AlertesDouane = {
    colisAVerifier: 0,
    colisEnErreur: 0,
    hsAVerifier: 0,
    auditCritiques: 0,
    total: 0,
  };
  try {
    const { data: projets } = await supabase.from("projets").select("id").eq("statut", "actif");
    const projetIds = (projets ?? []).map((p) => p.id);
    if (projetIds.length === 0) return vide;

    const { data: colis } = await supabase
      .from("commandes")
      .select("id, douane_extractions(id, statut)")
      .in("projet_id", projetIds)
      .neq("statut", "annulee")
      .returns<ColisExtraction[]>();

    const liste = colis ?? [];
    const statutDe = (c: ColisExtraction) => c.douane_extractions?.statut;
    const colisAVerifier = liste.filter((c) => statutDe(c) === "a_verifier").length;
    const colisEnErreur = liste.filter((c) => statutDe(c) === "erreur").length;

    const extractionIds = liste
      .map((c) => c.douane_extractions?.id)
      .filter((id): id is string => !!id);
    let hsAVerifier = 0;
    if (extractionIds.length > 0) {
      const { count } = await supabase
        .from("douane_produits")
        .select("id", { count: "exact", head: true })
        .in("extraction_id", extractionIds)
        .eq("hs_status", "a_verifier");
      hsAVerifier = count ?? 0;
    }

    let auditCritiques = 0;
    if (BRAND.moduleFranceActif) {
      const { data: expeditions } = await supabase
        .from("douane_expeditions_france")
        .select("id")
        .in("projet_id", projetIds);
      for (const e of expeditions ?? []) {
        const { data: audit } = await supabase
          .from("douane_audits_france")
          .select("nb_alertes_critiques")
          .eq("expedition_id", e.id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();
        auditCritiques += audit?.nb_alertes_critiques ?? 0;
      }
    }

    return {
      colisAVerifier,
      colisEnErreur,
      hsAVerifier,
      auditCritiques,
      total: colisAVerifier + colisEnErreur + hsAVerifier + auditCritiques,
    };
  } catch {
    return vide;
  }
}
