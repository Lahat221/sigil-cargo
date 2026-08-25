"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { chargerLignesFrance } from "@/lib/dedouanement-france/lignesFrance";
import { genererDeclarationFrance, PROMPT_VERSION } from "@/lib/dedouanement-france/generation";
import { genererMailTransitaire } from "@/lib/dedouanement-france/mail";
import { buildFactureCommerciale } from "@/lib/dedouanement-france/excel/facture";
import { buildPackingList } from "@/lib/dedouanement-france/excel/packingList";
import { buildDeclarationDouane } from "@/lib/dedouanement-france/excel/declarationDouane";
import { DeclarationFranceSchema } from "@/lib/dedouanement-france/schema";
import type { DeclarationFranceIA } from "@/lib/dedouanement-france/schema";
import type { InfosExpedition } from "@/lib/dedouanement-france/excel/facture";

export async function enregistrerExpeditionFrance(
  projetId: string,
  champs: {
    mawb: string;
    dateVol: string;
    poidsBrutLtaKg: number | null;
    nombreColis: number;
    dimensions: string;
  }
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase.from("douane_expeditions_france").upsert(
    {
      projet_id: projetId,
      mawb: champs.mawb || null,
      date_vol: champs.dateVol || null,
      poids_brut_lta_kg: champs.poidsBrutLtaKg,
      nombre_colis: champs.nombreColis,
      dimensions: champs.dimensions || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "projet_id" }
  );

  if (error) return { error: error.message };
  revalidatePath("/gestion-douaniere/dedouanement-france");
  return { success: true };
}

export async function toggleExclusionProduit(
  produitId: string,
  exclu: boolean,
  raison: string | null
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("douane_produits")
    .update({ exclu_declaration_france: exclu, raison_exclusion_france: raison })
    .eq("id", produitId);

  if (error) return { error: error.message };
  revalidatePath("/gestion-douaniere/dedouanement-france");
  return { success: true };
}

export type ResultatDocumentsFrance =
  | {
      ok: true;
      recap: {
        valeurTotaleFcfa: number;
        valeurTotaleEur: number;
        poidsTotalKg: number;
        nbLignesRegroupees: number;
        nbLignesBrutes: number;
        economieTransitaireEur: number;
        partRexPct: number;
        droitsTotauxEur: number;
        tvaTotaleEur: number;
        alertes: string[];
      };
      fichiers: {
        facture: { base64: string; filename: string };
        packingList: { base64: string; filename: string };
        declarationDouane: { base64: string; filename: string };
      };
      mail: string;
    }
  | { error: string };

async function construireFichiers(
  data: DeclarationFranceIA,
  infos: InfosExpedition
): Promise<Omit<Extract<ResultatDocumentsFrance, { ok: true }>, "ok">> {
  const [factureBuf, packingBuf, declarationBuf] = await Promise.all([
    buildFactureCommerciale(data, infos),
    buildPackingList(data, infos),
    buildDeclarationDouane(data, infos),
  ]);

  return {
    recap: {
      valeurTotaleFcfa: data.meta.valeur_totale_fcfa,
      valeurTotaleEur: data.meta.valeur_totale_eur,
      poidsTotalKg: data.meta.poids_lta_kg,
      nbLignesRegroupees: data.meta.nb_lignes_regroupees,
      nbLignesBrutes: data.meta.nb_lignes_brutes,
      economieTransitaireEur: data.meta.economie_transitaire_eur,
      partRexPct: data.meta.part_rex_pct,
      droitsTotauxEur: data.meta.droits_totaux_eur,
      tvaTotaleEur: data.meta.tva_totale_eur,
      alertes: data.alertes,
    },
    fichiers: {
      facture: {
        base64: factureBuf.toString("base64"),
        filename: `SIGIL_Facture_Commerciale_${infos.dateVol}.xlsx`,
      },
      packingList: {
        base64: packingBuf.toString("base64"),
        filename: `SIGIL_Packing_List_${infos.dateVol}.xlsx`,
      },
      declarationDouane: {
        base64: declarationBuf.toString("base64"),
        filename: `SIGIL_Declaration_Douane_${infos.dateVol}.xlsx`,
      },
    },
    mail: genererMailTransitaire(data),
  };
}

/**
 * Régénère les 3 fichiers + le mail à partir du dernier JSON déjà validé et
 * persisté, sans rappeler Claude — audit et économie (§ suggestions de la
 * revue métier : "Historique : stocker le JSON pour re-générer sans
 * re-appeler l'IA").
 */
export async function regenererDepuisDernierJson(projetId: string): Promise<ResultatDocumentsFrance> {
  const supabase = createClient();

  const { data: expedition } = await supabase
    .from("douane_expeditions_france")
    .select("id, mawb, date_vol, poids_brut_lta_kg, nombre_colis, dimensions")
    .eq("projet_id", projetId)
    .maybeSingle();

  if (!expedition?.mawb || !expedition.date_vol) {
    return { error: "Aucune expédition renseignée pour ce départ." };
  }

  const { data: derniere } = await supabase
    .from("douane_declarations_france")
    .select("reponse_json")
    .eq("expedition_id", expedition.id)
    .eq("statut", "genere")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!derniere?.reponse_json) {
    return { error: "Aucune génération précédente à ré-utiliser pour ce départ." };
  }

  const parsed = DeclarationFranceSchema.safeParse(derniere.reponse_json);
  if (!parsed.success) {
    return { error: "Le JSON précédemment enregistré est corrompu — relance une génération complète." };
  }

  const infos: InfosExpedition = {
    mawb: expedition.mawb,
    dateVol: expedition.date_vol,
    nombreColis: expedition.nombre_colis,
    dimensions: expedition.dimensions ?? "",
    poidsBrutLtaKg: expedition.poids_brut_lta_kg ?? parsed.data.meta.poids_lta_kg,
  };

  const resultat = await construireFichiers(parsed.data, infos);
  return { ok: true, ...resultat };
}

export async function genererDocumentsFrance(projetId: string): Promise<ResultatDocumentsFrance> {
  const supabase = createClient();

  const { data: expedition } = await supabase
    .from("douane_expeditions_france")
    .select("id, mawb, date_vol, poids_brut_lta_kg, nombre_colis, dimensions")
    .eq("projet_id", projetId)
    .maybeSingle();

  if (!expedition?.mawb || !expedition.date_vol) {
    return { error: "Renseigne au moins le MAWB et la date de vol avant de générer les documents." };
  }

  const toutesLesLignes = await chargerLignesFrance(supabase, projetId);
  const lignesIncluses = toutesLesLignes.filter((l) => !l.exclu);
  if (lignesIncluses.length === 0) {
    return { error: "Aucune ligne produit à déclarer (tout est exclu, ou aucun colis traité)." };
  }

  const { data: valeursRows } = await supabase
    .from("douane_declaration_valeurs")
    .select("section, montant_fcfa")
    .eq("projet_id", projetId);

  const valeurs = new Map((valeursRows ?? []).map((v) => [v.section, v.montant_fcfa]));

  const resultat = await genererDeclarationFrance({
    mawb: expedition.mawb,
    dateVol: expedition.date_vol,
    poidsBrutLtaKg: expedition.poids_brut_lta_kg,
    lignes: lignesIncluses,
    sousTotauxFcfa: {
      agro: valeurs.get("alimentaire") ?? null,
      vetements: valeurs.get("vetements") ?? null,
      divers: valeurs.get("divers") ?? null,
    },
  });

  if (!resultat.ok) {
    await supabase.from("douane_declarations_france").insert({
      expedition_id: expedition.id,
      statut: "erreur",
      prompt_version: PROMPT_VERSION,
      erreur: resultat.erreur,
    });
    return { error: `Échec de la génération IA : ${resultat.erreur}` };
  }

  const { data: derniere } = await supabase
    .from("douane_declarations_france")
    .select("version")
    .eq("expedition_id", expedition.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("douane_declarations_france").insert({
    expedition_id: expedition.id,
    version: (derniere?.version ?? 0) + 1,
    statut: "genere",
    reponse_json: JSON.parse(JSON.stringify(resultat.data)),
    modele: resultat.modele,
    prompt_version: PROMPT_VERSION,
    tokens_entree: resultat.tokensEntree,
    tokens_sortie: resultat.tokensSortie,
    cout_estime_usd: resultat.coutEstimeUsd,
  });

  const infos: InfosExpedition = {
    mawb: expedition.mawb,
    dateVol: expedition.date_vol,
    nombreColis: expedition.nombre_colis,
    dimensions: expedition.dimensions ?? "",
    poidsBrutLtaKg: expedition.poids_brut_lta_kg ?? resultat.data.meta.poids_lta_kg,
  };

  const fichiersEtRecap = await construireFichiers(resultat.data, infos);

  revalidatePath("/gestion-douaniere/dedouanement-france");

  return { ok: true, ...fichiersEtRecap };
}
