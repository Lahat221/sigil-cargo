import { createClient } from "@/lib/supabase/server";
import { chargerVueEnsemble } from "@/lib/douane/vueEnsemble";
import { regrouperParSection, poidsTotalUnique } from "@/lib/douane/sections";
import { ValeurSectionInput } from "@/components/douane/ValeurSectionInput";
import { DeclarationXlsxButton } from "@/components/douane/DeclarationXlsxButton";
import { ValiderDeclarationButton } from "@/components/douane/ValiderDeclarationButton";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

export const dynamic = "force-dynamic";

const {
  expediteurNom: EXPEDITEUR_NOM,
  expediteurAdresse: EXPEDITEUR_ADRESSE,
  expediteurTel: EXPEDITEUR_TEL,
  destinataireNom: DESTINATAIRE_NOM,
  destinataireSiret: DESTINATAIRE_SIRET,
  destinataireEori: DESTINATAIRE_EORI,
  destinataireAdresse: DESTINATAIRE_ADRESSE,
  destinataireTel: DESTINATAIRE_TEL,
  destinataireEmail: DESTINATAIRE_EMAIL,
} = BRAND.identite;

export default async function DeclarationPage({
  searchParams,
}: {
  searchParams: { projet?: string };
}) {
  const supabase = createClient();

  const { data: projets } = await supabase
    .from("projets")
    .select("id, nom, date_depart")
    .order("created_at", { ascending: false });

  const projetId = searchParams.projet || projets?.[0]?.id;
  const projet = projets?.find((p) => p.id === projetId);

  const lignes = projetId ? await chargerVueEnsemble(supabase, projetId) : [];
  const sections = regrouperParSection(lignes);
  const poidsTotal = poidsTotalUnique(lignes);

  const { data: valeursRows } = projetId
    ? await supabase
        .from("douane_declaration_valeurs")
        .select("section, montant_fcfa")
        .eq("projet_id", projetId)
    : { data: [] };

  const valeurs = new Map((valeursRows ?? []).map((v) => [v.section, v.montant_fcfa]));
  const valeurTotal = Array.from(valeurs.values()).reduce(
    (acc: number, v) => acc + (v ?? 0),
    0
  );

  const dateAffichee = projet?.date_depart
    ? new Date(projet.date_depart).toLocaleDateString("fr-FR")
    : new Date().toLocaleDateString("fr-FR");

  const { data: expeditionFrance } = projetId
    ? await supabase
        .from("douane_expeditions_france")
        .select("declaration_dakar_validee")
        .eq("projet_id", projetId)
        .maybeSingle()
    : { data: null };
  const declarationValidee = expeditionFrance?.declaration_dakar_validee ?? false;

  return (
    <div className="max-w-5xl">
      {!projetId ? (
        <p className="rounded-xl border border-slate-200/70 bg-white p-4 text-sm text-slate-500 shadow-sm">
          Aucun départ trouvé.
        </p>
      ) : (
        <>
          <div className="mb-6 overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm">
            <div className="bg-navy px-5 py-3">
              <h1 className="text-center text-lg font-bold tracking-wide text-white">
                {BRAND.nom} — DÉCLARATION DE MARCHANDISE
              </h1>
            </div>
            <div className="grid grid-cols-1 gap-4 border-b border-slate-100 p-5 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold text-navy">Expéditeur : {EXPEDITEUR_NOM}</p>
                <p className="text-slate-600">Adresse : {EXPEDITEUR_ADRESSE}</p>
                <p className="text-slate-600">Tel : {EXPEDITEUR_TEL}</p>
                <p className="mt-2 text-slate-500">Date : {dateAffichee}</p>
              </div>
              <div>
                <p className="font-semibold text-navy">Destinataire : {DESTINATAIRE_NOM}</p>
                <p className="text-slate-600">Num SIRET : {DESTINATAIRE_SIRET}</p>
                <p className="text-slate-600">Num EORI : {DESTINATAIRE_EORI}</p>
                <p className="text-slate-600">Adresse : {DESTINATAIRE_ADRESSE}</p>
                <p className="text-slate-600">TEL : {DESTINATAIRE_TEL}</p>
                <p className="text-slate-600">Email : {DESTINATAIRE_EMAIL}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-5 py-3">
              <p className="text-xs text-slate-400">
                {projet?.nom} · {lignes.filter((l) => l.typeProduit !== null).length} lignes produit
              </p>
              <DeclarationXlsxButton projetId={projetId} />
            </div>
          </div>

          {sections.every((s) => s.lignes.length === 0) && (
            <p className="rounded-xl border border-slate-200/70 bg-white p-4 text-sm text-slate-500 shadow-sm">
              Aucun produit traité pour ce départ — traitez d&apos;abord les colis depuis le tableau
              de bord.
            </p>
          )}

          {sections.map(({ section, lignes: sectionLignes }) => {
            if (sectionLignes.length === 0) return null;
            const colisDejaAffiches = new Set<string>();

            return (
              <div
                key={section.cle}
                className="mb-6 overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 bg-navy px-4 py-2.5">
                  <h2 className="font-semibold text-white">{section.nom}</h2>
                  <div className="flex items-center gap-2 rounded-md bg-white/10 px-2 py-1">
                    <span className="text-xs text-white/70">Valeur estimée</span>
                    <ValeurSectionInput
                      projetId={projetId}
                      section={section.cle}
                      valeurInitiale={valeurs.get(section.cle) ?? null}
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2 font-medium">Type produit</th>
                        <th className="px-3 py-2 font-medium">Description douane</th>
                        <th className="px-3 py-2 font-medium">HS Code</th>
                        <th className="px-3 py-2 font-medium">Produit</th>
                        <th className="px-3 py-2 font-medium text-right">Qté</th>
                        <th className="px-3 py-2 font-medium text-right">Poids</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sectionLignes.map((l, i) => {
                        const afficherPoids = !colisDejaAffiches.has(l.colisId);
                        colisDejaAffiches.add(l.colisId);
                        return (
                          <tr key={`${l.colisId}-${i}`}>
                            <td className="px-3 py-2">{l.typeProduit}</td>
                            <td className="px-3 py-2">{l.descriptionDouane}</td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {l.hsCode ?? "à préciser"}
                            </td>
                            <td className="px-3 py-2">{l.descriptionProduit}</td>
                            <td className="px-3 py-2 text-right">
                              {l.quantite} {l.unite}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-400">
                              {afficherPoids ? `${l.poidsKg} kg` : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {sections.some((s) => s.lignes.length > 0) && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold-gradient px-5 py-3 shadow-sm">
              <div className="flex flex-wrap items-center gap-6">
                <p className="font-semibold text-navy">
                  TOTAL :{" "}
                  <span className="text-lg">
                    {valeurTotal.toLocaleString("fr-FR")} FCFA
                  </span>
                </p>
                <p className="font-semibold text-navy">
                  POIDS TOTAL : <span className="text-lg">{poidsTotal.toFixed(2)} KG</span>
                </p>
              </div>
              <ValiderDeclarationButton projetId={projetId} dejaValidee={declarationValidee} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
