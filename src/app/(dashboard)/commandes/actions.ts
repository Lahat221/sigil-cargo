"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveClientId } from "@/lib/commandes/resolveClient";
import { getTwilioClient, whatsappAddress } from "@/lib/twilio/client";
import type { StatutCommande } from "@/types/database.types";

export async function changerStatut(
  commandeId: string,
  nouveauStatut: StatutCommande
): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();

  const { error } = await supabase
    .from("commandes")
    .update({ statut: nouveauStatut })
    .eq("id", commandeId);

  if (error) return { error: error.message };

  revalidatePath("/commandes");
  revalidatePath("/commandes/pipeline");
  revalidatePath(`/commandes/${commandeId}`);
  return { success: true };
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
  poidsKg: number;
  prixParKg: number;
  enveloppe: boolean;
  nombrePaquets: number;
  adresseLivraison: string;
  description: string;
  remarqueInterne: string;
  photoPaths: string[];
  videoPath: string | null;
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
      enveloppe: input.enveloppe,
      nombre_paquets: input.nombrePaquets,
      adresse_livraison: input.adresseLivraison.trim() || null,
      description: input.description.trim() || null,
      remarque_interne: input.remarqueInterne.trim() || null,
      photo_urls: input.photoPaths.length > 0 ? input.photoPaths : null,
      video_url: input.videoPath,
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
const TEMPLATE_COMMANDE_RECUE_SID = "HXf3f70419e560619ac068a11d959bc79a";
const TEMPLATE_COMMANDE_PRETE_SID = "HX1c2dc12ebe5ffa069883940e2ab6f52f";

const montantFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
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
      "numero, poids_kg, montant_total, client_id, clients(id, nom, telephone, telephone_pays)"
    )
    .eq("id", commandeId)
    .single();

  if (commandeError || !commande) {
    return { error: "Commande introuvable." };
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
  const { error } = await supabase
    .from("commandes")
    .delete()
    .eq("id", commandeId);

  if (error) return { error: error.message };

  revalidatePath("/commandes");
  revalidatePath("/commandes/pipeline");
  return { success: true };
}
