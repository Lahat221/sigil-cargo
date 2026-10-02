import { Suspense } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/commandes/PrintButton";
import { EtiquetteFormat } from "@/components/commandes/EtiquetteFormat";
import { ImageImprimanteButton } from "@/components/commandes/ImageImprimanteButton";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix
import { chargerParametresSite } from "@/lib/parametres";

export const dynamic = "force-dynamic";

// Largeur utile du rouleau ≈ 192 unités (voir --u dans le CSS ci-dessous).
// Réduit la taille d'un texte en capitales/gras (Montserrat, ~0,85 em par
// lettre) pour qu'il tienne sur une ligne — évite qu'un mot comme
// "MARSEILLE" se coupe en deux.
function tailleAjustee(nbLettres: number, max: number, min: number, facteur = 0.85) {
  const taille = Math.floor(192 / (Math.max(nbLettres, 1) * facteur));
  return Math.max(min, Math.min(max, taille));
}

function styleTaille(taille: number) {
  return { fontSize: `calc(${taille} * var(--u))` };
}

export default async function EtiquetteCommandePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: commande } = await supabase
    .from("commandes")
    .select(
      "id, numero, poids_kg, mode_fret, volume_m3, nombre_paquets, destination, clients(nom), projets(nom)"
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!commande) notFound();

  // URL de la page publique (pas de connexion requise, voir
  // src/app/colis/[id]/page.tsx) encodée dans le QR code de l'étiquette —
  // construite depuis les en-têtes de la requête pour pointer vers le bon
  // domaine (local/preview/prod) sans variable d'env à maintenir.
  const headersList = headers();
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  const host = headersList.get("host");
  const urlColis = `${proto}://${host}/colis/${commande.id}`;
  const qrDataUrl = await QRCode.toDataURL(urlColis, { width: 160, margin: 1 });

  // Site affiché en bas de l'étiquette (réglable dans Paramètres → Site
  // public), à défaut l'adresse avec laquelle l'appli est ouverte.
  const site = await chargerParametresSite(supabase);
  const siteAffiche = (site.siteWeb || host || "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const tailleSite = tailleAjustee(siteAffiche.length, 16, 9, 0.62);

  // Une étiquette par paquet déclaré (ex. 3 paquets → 1/3, 2/3, 3/3), pas
  // une seule étiquette pour tout le colis — chaque paquet physique doit
  // pouvoir être identifié séparément.
  const nomClient = commande.clients?.nom ?? "—";
  const motLePlusLong = Math.max(...nomClient.split(/\s+/).map((m) => m.length));
  const tailleNom = tailleAjustee(motLePlusLong, 28, 14);
  const tailleNumero = tailleAjustee(String(commande.numero).length + 1, 58, 30);
  const tailleDestination = commande.destination
    ? tailleAjustee(commande.destination.length, 30, 14)
    : 0;
  const totalPaquets = Math.max(1, commande.nombre_paquets);
  const paquets = Array.from({ length: totalPaquets }, (_, i) => i + 1);

  return (
    <div className="mx-auto max-w-md p-8 print:m-0 print:max-w-none print:p-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-ink">
          Étiquette — Colis #{commande.numero}
          {totalPaquets > 1 && ` (${totalPaquets} paquets)`}
        </h1>
        <div className="flex items-center gap-2 print:hidden">
          <ImageImprimanteButton
            selector=".etiquette"
            filenamePrefix={`etiquette-colis-${commande.numero}`}
          />
          <Suspense fallback={null}>
            <PrintButton />
          </Suspense>
        </div>
      </div>

      <EtiquetteFormat />

      <div className="space-y-6 print:space-y-0">
        {paquets.map((paquet) => (
          <div key={paquet} className="etiquette">
            <p className="et-marque">{BRAND.nom}</p>

            <h2 className="et-nom" style={styleTaille(tailleNom)}>
              {nomClient}
            </h2>

            <p className="et-numero" style={styleTaille(tailleNumero)}>
              #{commande.numero}
            </p>

            {commande.destination && (
              <p className="et-destination" style={styleTaille(tailleDestination)}>
                {commande.destination}
              </p>
            )}

            {totalPaquets > 1 && (
              <p className="et-paquet">
                Paquet {paquet}/{totalPaquets}
              </p>
            )}

            <p className="et-meta">
              {[
                commande.poids_kg !== null ? `${commande.poids_kg} kg` : null,
                commande.mode_fret === "conteneur" && commande.volume_m3 !== null
                  ? `${commande.volume_m3} m³`
                  : null,
                commande.projets?.nom ?? null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>

            <div className="et-qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="QR code — voir le contenu et la vidéo du colis"
              />
              <p>Scanner : photos &amp; vidéo du colis</p>
            </div>

            {siteAffiche && (
              <div className="et-site">
                <p>Suivi du colis &amp; infos</p>
                <strong style={styleTaille(tailleSite)}>{siteAffiche}</strong>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        /* Toutes les tailles passent par --u : 1px sur le rouleau réel (58mm,
           54mm utiles ≈ 204px), 1.6px à l'écran pour un aperçu fidèle de la
           mise en page. Nom, numéro et destination sont volontairement très
           grands pour être lisibles de loin. */
        .etiquette {
          --u: 1.6px;
          width: calc(204 * var(--u));
          margin: 0 auto;
          padding: calc(10 * var(--u));
          background: #fff;
          color: #0f172a;
          text-align: center;
          border: 2px solid #0f172a;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
        }
        .et-marque {
          font-size: calc(8 * var(--u));
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
          margin: 0 0 calc(4 * var(--u));
        }
        .et-nom {
          font-size: calc(28 * var(--u));
          font-weight: 900;
          line-height: 1.05;
          text-transform: uppercase;
          overflow-wrap: break-word;
          margin: 0 0 calc(6 * var(--u));
        }
        .et-numero {
          font-size: calc(58 * var(--u));
          font-weight: 900;
          line-height: 1;
          margin: 0 0 calc(6 * var(--u));
        }
        .et-destination {
          font-size: calc(30 * var(--u));
          font-weight: 900;
          line-height: 1.1;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          overflow-wrap: break-word;
          background: #0f172a;
          color: #fff;
          border-radius: calc(5 * var(--u));
          padding: calc(5 * var(--u)) calc(4 * var(--u));
          margin: 0 0 calc(6 * var(--u));
        }
        .et-paquet {
          font-size: calc(20 * var(--u));
          font-weight: 800;
          margin: 0 0 calc(6 * var(--u));
        }
        .et-meta {
          font-size: calc(11 * var(--u));
          color: #334155;
          margin: 0 0 calc(6 * var(--u));
        }
        .et-meta:empty {
          display: none;
        }
        .et-qr {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: calc(2 * var(--u));
          border-top: 1px dashed #cbd5e1;
          padding-top: calc(6 * var(--u));
          margin-bottom: calc(6 * var(--u));
        }
        .et-qr img {
          width: calc(92 * var(--u));
          height: calc(92 * var(--u));
        }
        .et-qr p {
          font-size: calc(9 * var(--u));
          color: #64748b;
          margin: 0;
        }
        .et-site {
          border-top: 1px solid #cbd5e1;
          padding-top: calc(5 * var(--u));
        }
        .et-site p {
          font-size: calc(9 * var(--u));
          color: #64748b;
          margin: 0 0 calc(2 * var(--u));
        }
        .et-site strong {
          display: block;
          font-weight: 800;
          line-height: 1.1;
          overflow-wrap: anywhere;
        }
        @media print {
          /* L'appli entoure le contenu de marges (padding du <main>, ~70px en
             bas) : à l'impression elles mangent la largeur utile du rouleau
             (54 mm) et décalent/rognent l'étiquette — on les neutralise. */
          html, body { margin: 0 !important; padding: 0 !important; }
          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: none !important;
          }
          .animate-page-in { animation: none !important; }
          .etiquette {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            break-after: page;
          }
          .etiquette:last-of-type {
            break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
