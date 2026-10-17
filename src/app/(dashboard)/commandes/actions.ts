"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveClientId } from "@/lib/commandes/resolveClient";
import { getTwilioClient, whatsappAddress } from "@/lib/twilio/client";
import type { StatutCommande } from "@/types/database.types";
import { BRAND } from "@/lib/brand";
import {
  SUIVI_FRET_FRANCE,
  exigeVerification,
  libelleStatut,
  rangStatut,
  statutSuivant,
} from "@/lib/commandes/statuts";

/**
 * Résout à la demande l'URL signée d'un fichier commandes-media — utilisé
 * par NotifRetraitButton sur la LISTE de colis (contrairement à la fiche
 * colis, la liste ne pré-génère pas d'URL signée par ligne pour chaque
 * vidéo : trop coûteux si beaucoup de colis en ont une).
 */
export async function signerUrlMedia(
  path: string
): Promise<{ error: string } | { url: string }> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("commandes-media")
    .createSignedUrl(path, 3600);

  if (error || !data) return { error: error?.message ?? "URL introuvable." };
  return { url: data.signedUrl };
}

/**
 * Marque le contenu comme vérifié directement depuis l'accusé de
 * réception — évite de rouvrir le formulaire d'édition complet juste pour
 * ça quand l'agent revient vérifier un colis plus tard (souvent pas le
 * temps de le faire au moment du dépôt).
 */
export async function marquerContenuVerifie(
  commandeId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const { error } = await supabase
    .from("commandes")
    .update({ contenu_verifie: true })
    .eq("id", commandeId);

  if (error) return { error: error.message };

  revalidatePath(`/commandes/${commandeId}`);
  revalidatePath(`/commandes/${commandeId}/accuse-reception`);
  return { success: true };
}

export type ResultatStatut =
  | { success: true }
  | {
      error: string;
      /** true : l'utilisateur peut passer outre après confirmation (renvoyer avec forcer). */
      confirmable?: boolean;
    };

type ColisPourStatut = {
  id: string;
  statut: StatutCommande;
  destination: string | null;
  contenu_verifie: boolean;
  poids_kg: number | null;
};

/** Ce qui manque à un colis pour franchir cette étape (vide = rien). */
function problemesAvant(colis: ColisPourStatut, vers: StatutCommande): string[] {
  const problemes: string[] = [];
  if (exigeVerification(vers) && !colis.contenu_verifie) {
    problemes.push("non vérifié à Dakar");
  }
  if (rangStatut(vers) >= rangStatut("expediee") && colis.poids_kg === null) {
    problemes.push("poids non saisi");
  }
  return problemes;
}

export async function changerStatut(
  commandeId: string,
  nouveauStatut: StatutCommande,
  options: { forcer?: boolean } = {}
): Promise<ResultatStatut> {
  const supabase = createClient();

  const { data: colis } = await supabase
    .from("commandes")
    .select("id, statut, destination, contenu_verifie, poids_kg")
    .eq("id", commandeId)
    .maybeSingle<ColisPourStatut>();
  if (!colis) return { error: "Colis introuvable." };

  if (nouveauStatut !== "annulee" && !options.forcer) {
    const problemes = problemesAvant(colis, nouveauStatut);
    if (problemes.length > 0) {
      return {
        error: `Ce colis est ${problemes.join(" et ")}. Passer quand même à « ${libelleStatut(nouveauStatut, colis.destination)} » ?`,
        confirmable: true,
      };
    }
  }

  // Passer à « Vérifié à Dakar » = contrôle du contenu fait.
  const miseAJour: { statut: StatutCommande; contenu_verifie?: boolean } = { statut: nouveauStatut };
  if (SUIVI_FRET_FRANCE && nouveauStatut === "en_preparation") miseAJour.contenu_verifie = true;

  const { error } = await supabase.from("commandes").update(miseAJour).eq("id", commandeId);
  if (error) return { error: error.message };

  revalidatePath("/commandes");
  revalidatePath("/commandes/pipeline");
  revalidatePath(`/commandes/${commandeId}`);
  return { success: true };
}

/**
 * Changement de statut groupé — sélection de plusieurs colis dans la liste
 * (CommandesListe). Les colis qui ne remplissent pas les conditions de l'étape
 * (vérification à Dakar, poids) sont ignorés sauf si `forcer` ; on dit
 * combien. Un seul update par lot : le trigger trg_log_statut (historique)
 * se déclenche une fois par ligne modifiée, comme pour changerStatut().
 */
export async function changerStatutMasse(
  commandeIds: string[],
  nouveauStatut: StatutCommande,
  options: { forcer?: boolean } = {}
): Promise<{ error: string } | { success: true; nbMisAJour: number; nbIgnores: number }> {
  if (commandeIds.length === 0) return { success: true, nbMisAJour: 0, nbIgnores: 0 };

  const supabase = createClient();

  const { data: colis } = await supabase
    .from("commandes")
    .select("id, statut, destination, contenu_verifie, poids_kg")
    .in("id", commandeIds)
    .returns<ColisPourStatut[]>();

  const aMettreAJour = (colis ?? []).filter(
    (c) => nouveauStatut === "annulee" || options.forcer || problemesAvant(c, nouveauStatut).length === 0
  );
  const nbIgnores = (colis ?? []).length - aMettreAJour.length;
  if (aMettreAJour.length === 0) return { success: true, nbMisAJour: 0, nbIgnores };

  const { data, error } = await supabase
    .from("commandes")
    .update({
      statut: nouveauStatut,
      ...(SUIVI_FRET_FRANCE && nouveauStatut === "en_preparation" ? { contenu_verifie: true } : {}),
    })
    .in(
      "id",
      aMettreAJour.map((c) => c.id)
    )
    .select("id");

  if (error) return { error: error.message };

  revalidatePath("/commandes");
  revalidatePath("/commandes/pipeline");
  return { success: true, nbMisAJour: data?.length ?? 0, nbIgnores };
}

/**
 * Fait avancer d'un coup les colis d'un départ qui sont à l'étape `depuis`
 * (ex. tous les « En vol » → « En transit à Paris » quand le vol atterrit).
 * L'étape suivante dépend de la destination de chaque colis : après « Arrivé
 * à Paris », un colis pour Lyon passe à « Arrivé à Lyon », un colis pour
 * Paris est remis au client.
 */
export async function avancerDepart(
  projetId: string,
  depuis: StatutCommande,
  options: { forcer?: boolean } = {}
): Promise<
  | { error: string; confirmable?: boolean }
  | { success: true; nbMisAJour: number; nbIgnores: number }
> {
  const supabase = createClient();

  const { data: colis } = await supabase
    .from("commandes")
    .select("id, statut, destination, contenu_verifie, poids_kg")
    .eq("projet_id", projetId)
    .eq("statut", depuis)
    .returns<ColisPourStatut[]>();

  const liste = colis ?? [];
  if (liste.length === 0) return { success: true, nbMisAJour: 0, nbIgnores: 0 };

  // Regroupe par étape suivante (elle varie avec la destination).
  const parSuivant = new Map<StatutCommande, ColisPourStatut[]>();
  for (const c of liste) {
    const suivant = statutSuivant(depuis, c.destination);
    if (!suivant) continue;
    parSuivant.set(suivant, [...(parSuivant.get(suivant) ?? []), c]);
  }

  const nonConformes = Array.from(parSuivant.entries()).flatMap(([suivant, cs]) =>
    cs.filter((c) => problemesAvant(c, suivant).length > 0)
  );
  if (nonConformes.length > 0 && !options.forcer) {
    return {
      error: `${nonConformes.length} colis sur ${liste.length} ne sont pas prêts (non vérifiés à Dakar ou sans poids). Les faire avancer quand même ?`,
      confirmable: true,
    };
  }

  let nbMisAJour = 0;
  for (const [suivant, cs] of Array.from(parSuivant.entries())) {
    const { data, error } = await supabase
      .from("commandes")
      .update({
        statut: suivant,
        ...(SUIVI_FRET_FRANCE && suivant === "en_preparation" ? { contenu_verifie: true } : {}),
      })
      .in(
        "id",
        cs.map((c) => c.id)
      )
      .select("id");
    if (error) return { error: error.message };
    nbMisAJour += data?.length ?? 0;
  }

  revalidatePath("/commandes");
  revalidatePath("/commandes/pipeline");
  return { success: true, nbMisAJour, nbIgnores: 0 };
}

type UpdateCommandeInput = {
  clientId: string | null;
  nouveauClient: {
    nom: string;
    telephone: string;
    telephonePays: string;
    adresse: string;
  } | null;
  projetId: string;
  produitId: string;
  poidsKg: number | null;
  prixParKg: number | null;
  modeFret: "aerien" | "conteneur";
  volumeM3: number | null;
  prixParM3: number | null;
  enveloppe: boolean;
  nombrePaquets: number;
  adresseLivraison: string;
  destination: string;
  description: string;
  remarqueInterne: string;
  livreurNom: string;
  livreurTelephone: string;
  contenuVerifie: boolean;
  photoPaths: string[];
  videoPaths: string[];
  noteVocalePath: string | null;
};

export async function updateCommande(
  commandeId: string,
  input: UpdateCommandeInput
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();

  const clientResult = await resolveClientId(
    supabase,
    input.clientId,
    input.nouveauClient
  );
  if ("error" in clientResult) return { error: clientResult.error };

  const { error } = await supabase
    .from("commandes")
    .update({
      client_id: clientResult.clientId,
      projet_id: input.projetId,
      produit_id: input.produitId,
      poids_kg: input.poidsKg,
      prix_par_kg: input.prixParKg,
      mode_fret: input.modeFret,
      volume_m3: input.volumeM3,
      prix_par_m3: input.prixParM3,
      enveloppe: input.enveloppe,
      nombre_paquets: input.nombrePaquets,
      adresse_livraison: input.adresseLivraison.trim() || null,
      destination: input.destination.trim() || null,
      description: input.description.trim() || null,
      remarque_interne: input.remarqueInterne.trim() || null,
      livreur_nom: input.livreurNom.trim() || null,
      livreur_telephone: input.livreurTelephone.trim() || null,
      contenu_verifie: input.contenuVerifie,
      photo_urls: input.photoPaths.length > 0 ? input.photoPaths : null,
      video_urls: input.videoPaths.length > 0 ? input.videoPaths : null,
      note_vocale_url: input.noteVocalePath,
    })
    .eq("id", commandeId);

  if (error) return { error: error.message };

  revalidatePath("/commandes");
  revalidatePath("/commandes/pipeline");
  revalidatePath(`/commandes/${commandeId}`);
  return { success: true };
}

// Modèles approuvés par Meta (Twilio Content Template Builder) pour les
// notifications de commande — permettent l'envoi même hors fenêtre de 24h.
const TEMPLATE_COMMANDE_RECUE_SID = "HXdae5b92c8994c3dd488142f08518de28";
const TEMPLATE_COMMANDE_PRETE_SID = "HX1c2dc12ebe5ffa069883940e2ab6f52f";

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: BRAND.devise,
});

export async function envoyerNotificationCommande(
  commandeId: string,
  statutCommande: StatutCommande,
  message: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();

  const { data: commande, error: commandeError } = await supabase
    .from("commandes")
    .select(
      "numero, poids_kg, montant_total, description, client_id, clients(id, nom, telephone, telephone_pays)"
    )
    .eq("id", commandeId)
    .single();

  if (commandeError || !commande) {
    return { error: "Colis introuvable." };
  }

  const client = commande.clients as unknown as {
    id: string;
    nom: string;
    telephone: string | null;
    telephone_pays: string | null;
  } | null;

  if (!client?.telephone) {
    return { error: "Ce client n'a pas de numéro de téléphone enregistré." };
  }

  const chiffres = client.telephone.replace(/\D/g, "");
  const indicatif = (client.telephone_pays ?? "+33").replace(/\D/g, "");
  const digits = chiffres.startsWith(indicatif) ? chiffres : indicatif + chiffres;
  const numero = `+${digits}`;

  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    return {
      error:
        "TWILIO_WHATSAPP_FROM n'est pas configuré (numéro WhatsApp Twilio manquant).",
    };
  }

  const contentSid =
    statutCommande === "recue"
      ? TEMPLATE_COMMANDE_RECUE_SID
      : statutCommande === "prete"
      ? TEMPLATE_COMMANDE_PRETE_SID
      : null;

  const contentVariables =
    statutCommande === "recue"
      ? {
          "1": client.nom,
          "2": String(commande.numero),
          "3": String(commande.poids_kg),
          "4": montantFormatter.format(commande.montant_total),
          "5": commande.description?.trim()
            ? `Contenu : ${commande.description.trim()}.`
            : "Bien noté.",
        }
      : { "1": client.nom, "2": String(commande.numero) };

  const twilioClient = getTwilioClient();
  let sid: string | null = null;

  if (contentSid) {
    try {
      const twilioMessage = await twilioClient.messages.create({
        from: whatsappAddress(from),
        to: whatsappAddress(numero),
        contentSid,
        contentVariables: JSON.stringify(contentVariables),
      });
      sid = twilioMessage.sid;
    } catch {
      // Modèle pas encore approuvé ou refusé : on retombe sur l'envoi libre.
    }
  }

  if (!sid) {
    try {
      const twilioMessage = await twilioClient.messages.create({
        from: whatsappAddress(from),
        to: whatsappAddress(numero),
        body: message,
      });
      sid = twilioMessage.sid;
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Erreur inconnue.",
      };
    }
  }

  await supabase.from("whatsapp_messages").insert({
    client_id: client.id,
    telephone: numero,
    direction: "out",
    body: message,
    message_sid: sid,
  });

  await supabase.from("notifications_a_envoyer").insert({
    commande_id: commandeId,
    statut_commande: statutCommande,
    destinataire_telephone: digits,
    envoyee: true,
    envoyee_at: new Date().toISOString(),
  });

  revalidatePath("/notifications-whatsapp");
  return { success: true };
}

export async function recalculerPrix(): Promise<
  { error: string } | { success: true; nbMisAJour: number }
> {
  const supabase = createClient();

  const { data: commandes, error: fetchError } = await supabase
    .from("commandes")
    .select("id, produit_id, prix_par_kg")
    .not("statut", "in", "(livree,annulee)");

  if (fetchError) return { error: fetchError.message };
  if (!commandes || commandes.length === 0) {
    return { success: true, nbMisAJour: 0 };
  }

  const { data: produits, error: produitsError } = await supabase
    .from("produits")
    .select("id, prix_par_kg");

  if (produitsError) return { error: produitsError.message };

  const prixParProduit = new Map(
    (produits ?? []).map((p) => [p.id, p.prix_par_kg])
  );

  let nbMisAJour = 0;
  for (const c of commandes) {
    const prixActuel = prixParProduit.get(c.produit_id);
    if (prixActuel === undefined || prixActuel === c.prix_par_kg) continue;

    const { error } = await supabase
      .from("commandes")
      .update({ prix_par_kg: prixActuel })
      .eq("id", c.id);
    if (error) return { error: error.message };
    nbMisAJour += 1;
  }

  revalidatePath("/commandes");
  revalidatePath("/commandes/pipeline");
  revalidatePath("/tableau-de-bord");
  return { success: true, nbMisAJour };
}

export async function supprimerCommande(
  commandeId: string
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();

  // douane_extractions/douane_logs référencent commandes(id) sans ON DELETE CASCADE :
  // il faut les purger avant, sinon la suppression échoue avec une violation de clé étrangère.
  await supabase.from("douane_logs").delete().eq("commande_id", commandeId);
  await supabase.from("douane_extractions").delete().eq("commande_id", commandeId);

  const { error } = await supabase
    .from("commandes")
    .delete()
    .eq("id", commandeId);

  if (error) return { error: error.message };

  revalidatePath("/commandes");
  revalidatePath("/commandes/pipeline");
  return { success: true };
}
