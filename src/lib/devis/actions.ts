"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type ResultatDevis = { error: string } | { success: true };

type DemandeDevisInput = {
  type: "grand_colis" | "professionnel";
  nom: string;
  entreprise: string;
  telephone: string;
  email: string;
  destination: string;
  poidsEstime: string;
  description: string;
  dateSouhaitee: string;
  // Champ piège invisible : un humain ne le remplit jamais.
  siteWeb: string;
  // Instant d'ouverture du formulaire (ms) : un envoi quasi immédiat est un robot.
  ouvertA: number;
};

// Action PUBLIQUE (formulaire du site, sans compte) : écrit avec le client
// service-role, donc toutes les entrées sont validées ici et plafonnées pour
// limiter le spam (champ piège, délai minimum, quota par téléphone et global).
export async function envoyerDemandeDevis(input: DemandeDevisInput): Promise<ResultatDevis> {
  if (input.siteWeb) return { success: true };
  if (Date.now() - input.ouvertA < 3000) {
    return { error: "Veuillez patienter quelques secondes avant d'envoyer." };
  }

  const nom = input.nom.trim().slice(0, 100);
  const entreprise = input.entreprise.trim().slice(0, 120);
  const telephone = input.telephone.trim().slice(0, 30);
  const email = input.email.trim().slice(0, 120);
  const destination = input.destination.trim().slice(0, 80);
  const poidsEstime = input.poidsEstime.trim().slice(0, 80);
  const description = input.description.trim().slice(0, 2000);

  if (!nom) return { error: "Indiquez votre nom." };
  if (telephone.replace(/\D/g, "").length < 6) {
    return { error: "Indiquez un numéro de téléphone valide (idéalement joignable sur WhatsApp)." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "L'adresse email n'est pas valide." };
  }
  if (description.length < 5) {
    return { error: "Décrivez brièvement les marchandises à envoyer." };
  }
  const dateSouhaitee = /^\d{4}-\d{2}-\d{2}$/.test(input.dateSouhaitee) ? input.dateSouhaitee : null;
  const type = input.type === "professionnel" ? "professionnel" : "grand_colis";

  const admin = createAdminClient();

  const ilYaDixMinutes = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count: recentes } = await admin
    .from("demandes_devis")
    .select("id", { count: "exact", head: true })
    .eq("telephone", telephone)
    .gte("created_at", ilYaDixMinutes);
  if ((recentes ?? 0) >= 3) {
    return { error: "Vous avez déjà envoyé plusieurs demandes : nous revenons vers vous très vite." };
  }

  const ilYaUneHeure = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: globales } = await admin
    .from("demandes_devis")
    .select("id", { count: "exact", head: true })
    .gte("created_at", ilYaUneHeure);
  if ((globales ?? 0) >= 30) {
    return { error: "Le service est momentanément très sollicité. Contactez-nous sur WhatsApp." };
  }

  const { error } = await admin.from("demandes_devis").insert({
    type,
    nom,
    entreprise: entreprise || null,
    telephone,
    email: email || null,
    destination: destination || null,
    poids_estime: poidsEstime || null,
    description,
    date_souhaitee: dateSouhaitee,
  });
  if (error) return { error: "L'envoi a échoué. Réessayez ou contactez-nous sur WhatsApp." };

  return { success: true };
}
