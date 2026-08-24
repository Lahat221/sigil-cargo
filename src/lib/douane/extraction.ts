import { zodTextFormat } from "openai/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getOpenAIClient, douaneModel } from "./openai";
import { buildSystemPrompt, buildUserPrompt, PROMPT_VERSION } from "./prompt";
import { ExtractionDouaneSchema, type ProduitExtrait } from "./schema";
import { rechercherReferentiel } from "./referentiel";
import { statutExtractionPour } from "./confiance";
import { estimerCoutUsd } from "./cout";

type ColisAAnalyser = {
  commandeId: string;
  rawDescription: string;
  poidsKg: number;
  clientNom: string | null;
  clientTelephone: string | null;
};

export type ResultatExtraction =
  | { ok: true; statut: "traite" | "a_verifier" }
  | { ok: false; erreur: string };

async function ecrireLog(
  supabase: SupabaseClient<Database>,
  params: {
    extractionId: string | null;
    commandeId: string;
    dureeMs: number;
    statut: "succes" | "erreur";
    erreur?: string;
    tokensEntree?: number | null;
    tokensSortie?: number | null;
  }
) {
  await supabase.from("douane_logs").insert({
    extraction_id: params.extractionId,
    commande_id: params.commandeId,
    modele: douaneModel(),
    prompt_version: PROMPT_VERSION,
    duree_ms: params.dureeMs,
    statut: params.statut,
    erreur: params.erreur ?? null,
    tokens_entree: params.tokensEntree ?? null,
    tokens_sortie: params.tokensSortie ?? null,
    cout_estime_usd: estimerCoutUsd(douaneModel(), params.tokensEntree, params.tokensSortie),
  });
}

function hsCodeSourcePour(
  produit: ProduitExtrait,
  referentielMatches: { description_douane: string; hs_code: string | null }[]
): "referentiel" | "ia" {
  const match = referentielMatches.find(
    (r) =>
      r.hs_code &&
      r.hs_code === produit.hs_code &&
      r.description_douane.toLowerCase() === produit.description_douane.toLowerCase()
  );
  return match ? "referentiel" : "ia";
}

/**
 * Traite un seul colis : appelle OpenAI, valide la réponse (Structured
 * Output + Zod), puis écrit le résultat en base. L'IA ne touche jamais la
 * base directement — cette fonction est le seul point d'écriture.
 *
 * Idempotence : si une extraction 'valide' existe déjà pour ce colis et que
 * `force` n'est pas passé, on ne retraite rien (règle section 29).
 */
export async function traiterColis(
  supabase: SupabaseClient<Database>,
  colis: ColisAAnalyser,
  options: { force?: boolean; utilisateurId?: string | null } = {}
): Promise<ResultatExtraction> {
  const { data: existante } = await supabase
    .from("douane_extractions")
    .select("id, statut, version")
    .eq("commande_id", colis.commandeId)
    .maybeSingle();

  if (existante?.statut === "valide" && !options.force) {
    return { ok: true, statut: "traite" };
  }

  const rawDescription = colis.rawDescription.trim();
  const nouvelleVersion = options.force ? (existante?.version ?? 0) + 1 : existante?.version ?? 1;

  if (existante && options.force) {
    await supabase.from("douane_historique").insert({
      extraction_id: existante.id,
      champ: "reanalyse",
      ancienne_valeur: `version ${existante.version} (statut: ${existante.statut})`,
      nouvelle_valeur: `version ${nouvelleVersion} demandée`,
      modifie_par: options.utilisateurId ?? null,
    });
  }

  if (!rawDescription) {
    const { data: extraction } = await supabase
      .from("douane_extractions")
      .upsert(
        {
          id: existante?.id,
          commande_id: colis.commandeId,
          statut: "a_verifier",
          version: nouvelleVersion,
          raw_description: "",
          poids_total: colis.poidsKg,
          client_nom: colis.clientNom,
          client_telephone: colis.clientTelephone,
          anomalies: ["Aucune description fournie pour ce colis."],
          modele: null,
          prompt_version: PROMPT_VERSION,
          erreur: null,
        },
        { onConflict: "commande_id" }
      )
      .select("id")
      .single();
    if (extraction) {
      await supabase.from("douane_produits").delete().eq("extraction_id", extraction.id);
    }
    return { ok: true, statut: "a_verifier" };
  }

  await supabase.from("douane_extractions").upsert(
    {
      id: existante?.id,
      commande_id: colis.commandeId,
      statut: "en_cours",
      version: nouvelleVersion,
      raw_description: rawDescription,
      poids_total: colis.poidsKg,
      client_nom: colis.clientNom,
      client_telephone: colis.clientTelephone,
    },
    { onConflict: "commande_id" }
  );

  const referentielMatches = await rechercherReferentiel(supabase, rawDescription);

  const debut = Date.now();
  try {
    const client = getOpenAIClient();
    const response = await client.responses.parse({
      model: douaneModel(),
      input: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content: buildUserPrompt({
            rawDescription,
            poidsKg: colis.poidsKg,
            referentielMatches,
          }),
        },
      ],
      text: { format: zodTextFormat(ExtractionDouaneSchema, "extraction_douane") },
    });

    const dureeMs = Date.now() - debut;
    const resultat = response.output_parsed;

    if (!resultat) {
      throw new Error("Réponse IA vide ou hors-schéma.");
    }

    const { data: extraction, error: upsertError } = await supabase
      .from("douane_extractions")
      .upsert(
        {
          commande_id: colis.commandeId,
          statut: statutExtractionPour(resultat.produits),
          version: nouvelleVersion,
          raw_description: rawDescription,
          poids_total: colis.poidsKg,
          client_nom: colis.clientNom,
          client_telephone: colis.clientTelephone,
          anomalies: resultat.anomalies,
          modele: douaneModel(),
          prompt_version: PROMPT_VERSION,
          erreur: null,
        },
        { onConflict: "commande_id" }
      )
      .select("id, statut")
      .single();

    if (upsertError || !extraction) {
      throw new Error(upsertError?.message ?? "Échec de l'écriture de l'extraction.");
    }

    await supabase.from("douane_produits").delete().eq("extraction_id", extraction.id);
    if (resultat.produits.length > 0) {
      await supabase.from("douane_produits").insert(
        resultat.produits.map((p, i) => ({
          extraction_id: extraction.id,
          type_produit: p.type_produit,
          description_douane: p.description_douane,
          hs_code: p.hs_code,
          hs_status: p.hs_code ? "propose" : "a_verifier",
          hs_code_source: hsCodeSourcePour(p, referentielMatches),
          description_produit: p.description_produit,
          quantite: p.quantite,
          unite: p.unite,
          confiance: p.confiance,
          statut: "a_valider",
          ordre: i,
        }))
      );
    }

    await supabase.from("douane_produits_retires").delete().eq("extraction_id", extraction.id);
    if (resultat.produits_retires.length > 0) {
      await supabase.from("douane_produits_retires").insert(
        resultat.produits_retires.map((p) => ({
          extraction_id: extraction.id,
          description: p.description,
        }))
      );
    }

    await ecrireLog(supabase, {
      extractionId: extraction.id,
      commandeId: colis.commandeId,
      dureeMs,
      statut: "succes",
      tokensEntree: response.usage?.input_tokens ?? null,
      tokensSortie: response.usage?.output_tokens ?? null,
    });

    return { ok: true, statut: extraction.statut === "a_verifier" ? "a_verifier" : "traite" };
  } catch (err) {
    const dureeMs = Date.now() - debut;
    const message = err instanceof Error ? err.message : "Erreur inconnue lors de l'appel IA.";

    await supabase
      .from("douane_extractions")
      .update({ statut: "erreur", erreur: message })
      .eq("commande_id", colis.commandeId);

    await ecrireLog(supabase, {
      extractionId: existante?.id ?? null,
      commandeId: colis.commandeId,
      dureeMs,
      statut: "erreur",
      erreur: message,
    });

    return { ok: false, erreur: message };
  }
}
