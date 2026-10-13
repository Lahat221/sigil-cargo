import { redirect } from "next/navigation";
import { getAdminCourant } from "@/lib/auth/profil";
import { createAdminClient } from "@/lib/supabase/admin";
import { chargerReglagesIA } from "@/lib/whatsapp-ia/reglages";
import { AgentIAForm } from "@/components/parametres/AgentIAForm";
import { CARTE } from "@/components/parametres/styles";

export const dynamic = "force-dynamic";

export default async function AgentWhatsAppPage() {
  if (!(await getAdminCourant())) redirect("/parametres");

  const reglages = await chargerReglagesIA(createAdminClient());
  const prerequis = {
    claude: !!process.env.ANTHROPIC_API_KEY,
    twilio:
      !!process.env.TWILIO_ACCOUNT_SID &&
      !!process.env.TWILIO_AUTH_TOKEN &&
      !!process.env.TWILIO_WHATSAPP_FROM,
    proprietaire: !!process.env.OWNER_WHATSAPP_NUMBER,
  };

  return (
    <div className="grid max-w-3xl gap-5">
      <section className={CARTE}>
        <h2 className="font-semibold text-slate-900">Agent WhatsApp (IA)</h2>
        <p className="mb-4 mt-1 text-sm text-slate-500">
          L&apos;agent répond seul aux messages WhatsApp des clients : suivi de colis,
          tarifs et estimation, prochains départs, adresses, demandes de devis. Vous
          recevez une copie de chaque réponse et une alerte dès qu&apos;un humain doit
          intervenir. Dès que vous répondez vous-même à un client, l&apos;agent se tait
          12 h sur cette conversation.
        </p>
        <AgentIAForm initial={reglages} prerequis={prerequis} />
      </section>
    </div>
  );
}
