"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { traiterColis } from "@/lib/douane/extraction";
import { chargerVueEnsemble } from "@/lib/douane/vueEnsemble";
import { genererDeclarationBuffer } from "@/lib/douane/declarationXlsx";
import type { HsCodeSource, HsStatus } from "@/types/database.types";

type ColisMinimal = {
  id: string;
  poids_kg: number;
  description: string | null;
  clients: { nom: string; telephone: string | null; telephone_pays: string | null } | null;
};

async function chargerColis(
  supabase: ReturnType<typeof createClient>,
  commandeId: string
): Promise<ColisMinimal | null> {
  const { data } = await supabase
    .from("commandes")
    .select("id, poids_kg, description, clients(nom, telephone, telephone_pays)")
    .eq("id", commandeId)
    .maybeSingle<ColisMinimal>();
  return data;
}

/**
 * Traite un lot de colis (appelé en boucle par le composant client, un petit
 * lot à la fois pour rester dans le temps d'exécution d'une Server Action —
 * voir le plan : pas de nouvelle queue, boucle pilotée côté client).
 */
export async function traiterLot(
  commandeIds: string[]
): Promise<{ traites: number; erreurs: { commandeId: string; erreur: string }[] }> {
  const supabase = createClient();
  const erreurs: { commandeId: string; erreur: string }[] = [];
  let traites = 0;

  for (const commandeId of commandeIds) {
    const colis = await chargerColis(supabase, commandeId);
    if (!colis) {
      erreurs.push({ commandeId, erreur: "Colis introuvable." });
      continue;
    }
    const resultat = await traiterColis(supabase, {
      commandeId: colis.id,
      rawDescription: colis.description ?? "",
      poidsKg: colis.poids_kg,
      clientNom: colis.clients?.nom ?? null,
      clientTelephone: colis.clients?.telephone ?? null,
    });
    if (resultat.ok) {
      traites += 1;
    } else {
      erreurs.push({ commandeId, erreur: resultat.erreur });
    }
  }

  revalidatePath("/gestion-douaniere");
  return { traites, erreurs };
}

export async function reanalyserColis(
  commandeId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const colis = await chargerColis(supabase, commandeId);
  if (!colis) return { error: "Colis introuvable." };

  const resultat = await traiterColis(
    supabase,
    {
      commandeId: colis.id,
      rawDescription: colis.description ?? "",
      poidsKg: colis.poids_kg,
      clientNom: colis.clients?.nom ?? null,
      clientTelephone: colis.clients?.telephone ?? null,
    },
    { force: true, utilisateurId: user?.id ?? null }
  );

  revalidatePath("/gestion-douaniere");
  revalidatePath(`/gestion-douaniere/${commandeId}`);
  if (!resultat.ok) return { error: resultat.erreur };
  return { success: true };
}

export async function validerExtraction(
  commandeId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("douane_extractions")
    .update({
      statut: "valide",
      valide_par: user?.id ?? null,
      valide_at: new Date().toISOString(),
    })
    .eq("commande_id", commandeId);

  if (error) return { error: error.message };

  revalidatePath("/gestion-douaniere");
  revalidatePath(`/gestion-douaniere/${commandeId}`);
  return { success: true };
}

export async function genererDeclarationXlsx(
  projetId: string
): Promise<{ error: string } | { base64: string; filename: string }> {
  const supabase = createClient();

  const { data: projet } = await supabase
    .from("projets")
    .select("nom, date_depart")
    .eq("id", projetId)
    .maybeSingle();

  if (!projet) return { error: "Départ introuvable." };

  const lignes = await chargerVueEnsemble(supabase, projetId);
  if (lignes.every((l) => l.typeProduit === null)) {
    return { error: "Aucun produit traité pour ce départ — traitez d'abord les colis." };
  }

  const { data: valeursRows } = await supabase
    .from("douane_declaration_valeurs")
    .select("section, montant_fcfa")
    .eq("projet_id", projetId);

  const valeursParSection: Record<string, number | null> = {};
  for (const v of valeursRows ?? []) {
    valeursParSection[v.section] = v.montant_fcfa;
  }

  const buffer = await genererDeclarationBuffer(lignes, projet.date_depart, valeursParSection);
  const date = projet.date_depart ?? new Date().toISOString().slice(0, 10);

  return {
    base64: buffer.toString("base64"),
    filename: `declaration-${date}.xlsx`,
  };
}

export async function enregistrerValeurSection(
  projetId: string,
  section: string,
  montant: number | null
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase.from("douane_declaration_valeurs").upsert(
    {
      projet_id: projetId,
      section,
      montant_fcfa: montant,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "projet_id,section" }
  );

  if (error) return { error: error.message };
  revalidatePath("/gestion-douaniere/declaration");
  return { success: true };
}

type ChampsProduit = {
  type_produit?: string;
  description_douane?: string;
  hs_code?: string | null;
  description_produit?: string;
  quantite?: number;
  unite?: string;
};

export async function mettreAJourProduit(
  produitId: string,
  champs: ChampsProduit
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: avant } = await supabase
    .from("douane_produits")
    .select("extraction_id, type_produit, description_douane, hs_code, description_produit, quantite, unite")
    .eq("id", produitId)
    .maybeSingle();

  if (!avant) return { error: "Produit introuvable." };

  const misAJour: ChampsProduit & { hs_status?: HsStatus; hs_code_source?: HsCodeSource } = {
    ...champs,
  };
  if (champs.hs_code !== undefined) {
    misAJour.hs_status = champs.hs_code ? "confirme" : "a_verifier";
    misAJour.hs_code_source = "utilisateur";
  }

  const { error } = await supabase.from("douane_produits").update(misAJour).eq("id", produitId);
  if (error) return { error: error.message };

  const historiqueEntries = (Object.keys(champs) as (keyof ChampsProduit)[])
    .filter((champ) => String(avant[champ] ?? "") !== String(champs[champ] ?? ""))
    .map((champ) => ({
      produit_id: produitId,
      extraction_id: avant.extraction_id,
      champ,
      ancienne_valeur: avant[champ] !== null && avant[champ] !== undefined ? String(avant[champ]) : null,
      nouvelle_valeur: champs[champ] !== null && champs[champ] !== undefined ? String(champs[champ]) : null,
      modifie_par: user?.id ?? null,
    }));

  if (historiqueEntries.length > 0) {
    await supabase.from("douane_historique").insert(historiqueEntries);
  }

  revalidatePath("/gestion-douaniere");
  return { success: true };
}
