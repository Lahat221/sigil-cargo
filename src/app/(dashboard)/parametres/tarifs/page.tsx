import { redirect } from "next/navigation";
import { getAdminCourant } from "@/lib/auth/profil";
import { createClient } from "@/lib/supabase/server";
import {
  DestinationsEditeur,
  ProduitsEditeur,
  type DestinationLigne,
} from "@/components/parametres/TarifsEditeurs";
import { CARTE } from "@/components/parametres/styles";
import { TARIF_ALIMENTAIRE_ACTIF } from "@/lib/commandes/tarifAlimentaire";

export const dynamic = "force-dynamic";

export default async function TarifsPage() {
  if (!(await getAdminCourant())) redirect("/parametres");

  const supabase = createClient();
  const [{ data: destinations }, { data: produits }] = await Promise.all([
    supabase
      .from("destinations")
      .select(
        TARIF_ALIMENTAIRE_ACTIF
          ? "id, nom, tarif_par_kg, tarif_alimentaire_par_kg, ordre, actif"
          : "id, nom, tarif_par_kg, ordre, actif"
      )
      .order("ordre", { ascending: true })
      .order("nom", { ascending: true }),
    supabase
      .from("produits")
      .select("id, nom, prix_par_kg, actif")
      .order("actif", { ascending: false })
      .order("nom", { ascending: true }),
  ]);

  return (
    <div className="grid max-w-3xl gap-5">
      <section className={CARTE}>
        <h2 className="font-semibold text-slate-900">Destinations</h2>
        <p className="mb-3 mt-1 text-sm text-slate-500">
          Villes proposées sur le formulaire colis et dans les filtres. Le tarif/kg
          est proposé automatiquement à la création d&apos;un colis (toujours
          modifiable) : « Autres » pour les produits courants, « Aliment. » pour les
          produits alimentaires (champ vide = pas de tarif spécial). Sous le seuil
          « petit colis » (Site public), c&apos;est le tarif petit colis qui s&apos;applique.
          Le dernier champ est l&apos;ordre d&apos;affichage.
        </p>
        <DestinationsEditeur
          destinations={(destinations ?? []) as unknown as DestinationLigne[]}
          avecTarifAlimentaire={TARIF_ALIMENTAIRE_ACTIF}
        />
      </section>

      <section className={CARTE}>
        <h2 className="font-semibold text-slate-900">Produits</h2>
        <p className="mb-3 mt-1 text-sm text-slate-500">
          Tarif par défaut au kilo, utilisé quand aucune destination ne fixe de
          tarif. Les colis déjà créés gardent le prix appliqué à leur création ;
          un produit inactif n&apos;est plus proposé pour les nouveaux colis.
        </p>
        <ProduitsEditeur produits={produits ?? []} />
      </section>
    </div>
  );
}
