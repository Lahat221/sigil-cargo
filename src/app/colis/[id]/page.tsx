import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/layout/Logo";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

// Page PUBLIQUE (pas de connexion requise — voir PUBLIC_PATHS dans
// middleware.ts) accessible via le QR code imprimé sur l'étiquette colis :
// juste le contenu (description + photos + vidéo) pour que le destinataire
// puisse vérifier son colis sans compte. Client service-role nécessaire car
// la table commandes/le bucket media exigent normalement un rôle
// "authenticated" — on sélectionne ici volontairement UNIQUEMENT les champs
// sans risque (jamais téléphone, adresse, montant, remarque interne...).
export default async function ColisPublicPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createAdminClient();

  const { data: commande } = await supabase
    .from("commandes")
    .select("numero, description, photo_urls, video_urls, clients(nom)")
    .eq("id", params.id)
    .maybeSingle();

  if (!commande) notFound();

  const photoItems: string[] = [];
  if (commande.photo_urls) {
    for (const path of commande.photo_urls) {
      const { data } = await supabase.storage
        .from("commandes-media")
        .createSignedUrl(path, 3600);
      if (data) photoItems.push(data.signedUrl);
    }
  }
  const videoItems: string[] = [];
  if (commande.video_urls) {
    for (const path of commande.video_urls) {
      const { data } = await supabase.storage
        .from("commandes-media")
        .createSignedUrl(path, 3600);
      if (data) videoItems.push(data.signedUrl);
    }
  }

  return (
    <div className="min-h-screen bg-navy-gradient px-4 py-10">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <Logo size={48} tagline />
        </div>

        <div className="rounded-xl border border-line bg-white p-6 shadow-xl">
          <p className="text-sm text-slate-500">
            Bienvenue{commande.clients?.nom ? `, ${commande.clients.nom}` : ""}
          </p>
          <h1 className="mb-4 text-2xl font-bold text-slate-900">
            Colis #{commande.numero}
          </h1>

          {commande.description && (
            <div className="mb-5 rounded-md bg-slate-50 p-3">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                Contenu du colis
              </p>
              <p className="text-sm text-slate-800">{commande.description}</p>
            </div>
          )}

          {photoItems.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Photos
              </p>
              <div className="flex flex-wrap gap-2">
                {photoItems.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={url}
                    src={url}
                    alt="Photo du colis"
                    className="h-24 w-24 rounded-md object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {videoItems.length > 0 && (
            <div className="mb-2">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Vidéo
              </p>
              <div className="flex flex-col gap-3">
                {videoItems.map((url) => (
                  <video
                    key={url}
                    src={url}
                    controls
                    className="w-full rounded-md"
                  />
                ))}
              </div>
            </div>
          )}

          {!commande.description &&
            photoItems.length === 0 &&
            videoItems.length === 0 && (
              <p className="text-sm text-slate-400">
                Aucun contenu disponible pour ce colis.
              </p>
            )}
        </div>

        <p className="mt-6 text-center text-xs text-muted2">{BRAND.nom}</p>
      </div>
    </div>
  );
}
