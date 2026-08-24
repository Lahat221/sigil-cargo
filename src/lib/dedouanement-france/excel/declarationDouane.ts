import ExcelJS from "exceljs";
import { EXPORTATEUR, IMPORTATEUR, TRANSPORT_DEFAUT, SECTION_ORDER } from "../constantes";
import type { DeclarationFranceIA } from "../schema";
import {
  FOND_BLEU,
  FOND_JAUNE,
  fondSection,
  POLICE_TITRE,
  POLICE_ENTETE,
  POLICE_SECTION,
  POLICE_GRAS,
  POLICE_TOTAL,
  BORDURE_FINE,
  CENTRE,
  GAUCHE,
  DROITE,
} from "./styles";
import type { InfosExpedition } from "./facture";

const montantFcfa = new Intl.NumberFormat("fr-FR");

export async function buildDeclarationDouane(
  data: DeclarationFranceIA,
  infos: InfosExpedition
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Déclaration Douane");
  ws.columns = [
    { width: 5 },
    { width: 15 },
    { width: 30 },
    { width: 40 },
    { width: 6 },
    { width: 8 },
    { width: 10 },
    { width: 10 },
    { width: 6 },
    { width: 7 },
    { width: 10 },
    { width: 6 },
    { width: 10 },
    { width: 10 },
  ];

  let l = 1;

  ws.mergeCells(`A${l}:N${l}`);
  const titre = ws.getCell(`A${l}`);
  titre.value = "DÉCLARATION DE MARCHANDISE / CUSTOMS DECLARATION";
  titre.font = POLICE_TITRE;
  titre.fill = FOND_BLEU;
  titre.alignment = CENTRE;
  ws.getRow(l).height = 24;
  l += 1;

  ws.mergeCells(`A${l}:N${l}`);
  const sousTitre = ws.getCell(`A${l}`);
  sousTitre.value = `MAWB ${infos.mawb} — Date : ${infos.dateVol} — REGROUPÉ par code HS (${data.meta.nb_lignes_regroupees} lignes) — OPTIMISATION DROITS DE DOUANE`;
  sousTitre.font = { name: "Arial", size: 10, italic: true };
  sousTitre.alignment = CENTRE;
  l += 2;

  ws.mergeCells(`A${l}:N${l}`);
  const infoTitre = ws.getCell(`A${l}`);
  infoTitre.value = "INFORMATIONS EXPÉDITION";
  infoTitre.font = POLICE_ENTETE;
  infoTitre.fill = FOND_BLEU;
  infoTitre.alignment = CENTRE;
  l += 1;

  const infosBloc: [string, string][] = [
    ["Exportateur :", `${EXPORTATEUR.raisonSociale} — REX ${EXPORTATEUR.rex} — TIN ${EXPORTATEUR.tin}`],
    [
      "Importateur :",
      `${IMPORTATEUR.nom} — SIRET ${IMPORTATEUR.siret} — EORI ${IMPORTATEUR.eori} — TVA ${IMPORTATEUR.tvaIntracom}`,
    ],
    ["Transport :", `${TRANSPORT_DEFAUT.transporteur} — MAWB ${infos.mawb} — Vol ${TRANSPORT_DEFAUT.vol} / ${infos.dateVol}`],
    ["Itinéraire :", `${TRANSPORT_DEFAUT.itineraire} — Incoterm ${TRANSPORT_DEFAUT.incoterm}`],
    ["Colisage :", `${infos.nombreColis} colis — ${infos.dimensions} — Poids brut ${infos.poidsBrutLtaKg} kg`],
    [
      "Valeur totale :",
      `${montantFcfa.format(data.meta.valeur_totale_fcfa)} FCFA = ${data.meta.valeur_totale_eur.toFixed(2)} EUR (1 EUR = ${TRANSPORT_DEFAUT.tauxChangeXofEur})`,
    ],
    [
      "Régime TVA :",
      "RÉEL NORMAL mensuel — TVA à l'importation en AUTOLIQUIDATION (ATVAI - art. 1695 II CGI)",
    ],
  ];
  for (const [label, val] of infosBloc) {
    ws.getCell(`A${l}`).value = label;
    ws.mergeCells(`B${l}:N${l}`);
    ws.getCell(`B${l}`).value = val;
    l += 1;
  }
  l += 1;

  const headerRow = ws.getRow(l);
  headerRow.height = 30;
  const entetes = [
    "N°",
    "Code HS",
    "Désignation TARIC",
    "Produits absorbés",
    "Qté",
    "Poids kg",
    "Valeur FCFA",
    "Valeur EUR",
    "Préf.",
    "Droit %",
    "Droit EUR",
    "TVA %",
    "Base TVA",
    "TVA EUR",
  ];
  entetes.forEach((label, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = label;
    c.font = POLICE_ENTETE;
    c.fill = FOND_BLEU;
    c.alignment = CENTRE;
    c.border = BORDURE_FINE;
  });
  l += 1;

  let qteTotale = 0;
  let poidsTotal = 0;
  let valeurFcfaTotal = 0;
  let valeurEurTotal = 0;
  let droitEurTotal = 0;
  let tvaEurTotal = 0;

  for (const sectionDef of SECTION_ORDER) {
    const lignesSection = data.lignes.filter((li) => li.section === sectionDef.cle);
    if (lignesSection.length === 0) continue;

    ws.mergeCells(`A${l}:N${l}`);
    const secCell = ws.getCell(`A${l}`);
    secCell.value = lignesSection[0].section_label;
    secCell.font = POLICE_SECTION;
    secCell.fill = fondSection(sectionDef.couleur);
    secCell.alignment = GAUCHE;
    l += 1;

    for (const ligne of lignesSection) {
      const row = ws.getRow(l);
      row.height = 32;
      row.getCell(1).value = ligne.num;
      row.getCell(2).value = ligne.hs;
      row.getCell(3).value = ligne.designation_taric;
      row.getCell(4).value = ligne.produits_absorbes;
      row.getCell(5).value = ligne.qte;
      row.getCell(6).value = ligne.poids_kg;
      row.getCell(6).numFmt = "0.0";
      row.getCell(7).value = ligne.valeur_fcfa;
      row.getCell(7).numFmt = "#,##0";
      row.getCell(8).value = ligne.valeur_eur;
      row.getCell(8).numFmt = "#,##0.00";
      row.getCell(9).value = ligne.preference;
      row.getCell(10).value = ligne.droit_pct;
      row.getCell(10).numFmt = "0.0%";
      row.getCell(11).value = ligne.droit_eur;
      row.getCell(11).numFmt = "#,##0.00";
      row.getCell(12).value = ligne.tva_pct;
      row.getCell(12).numFmt = "0.0%";
      row.getCell(13).value = ligne.base_tva_eur;
      row.getCell(13).numFmt = "#,##0.00";
      row.getCell(14).value = ligne.tva_eur;
      row.getCell(14).numFmt = "#,##0.00";

      [1, 5, 9].forEach((c) => (row.getCell(c).alignment = CENTRE));
      [3, 4].forEach((c) => (row.getCell(c).alignment = GAUCHE));
      row.getCell(2).alignment = GAUCHE;
      [6, 7, 8, 10, 11, 12, 13, 14].forEach((c) => (row.getCell(c).alignment = DROITE));
      row.eachCell((cell) => {
        cell.fill = fondSection(sectionDef.couleur);
        cell.border = BORDURE_FINE;
      });

      qteTotale += ligne.qte;
      poidsTotal += ligne.poids_kg;
      valeurFcfaTotal += ligne.valeur_fcfa;
      valeurEurTotal += ligne.valeur_eur;
      droitEurTotal += ligne.droit_eur;
      tvaEurTotal += ligne.tva_eur;

      l += 1;
    }
  }

  ws.mergeCells(`A${l}:D${l}`);
  ws.getCell(`A${l}`).value = "TOTAL GÉNÉRAL";
  ws.getCell(`E${l}`).value = qteTotale;
  ws.getCell(`F${l}`).value = poidsTotal;
  ws.getCell(`F${l}`).numFmt = "0.0";
  ws.getCell(`G${l}`).value = valeurFcfaTotal;
  ws.getCell(`G${l}`).numFmt = "#,##0";
  ws.getCell(`H${l}`).value = valeurEurTotal;
  ws.getCell(`H${l}`).numFmt = "#,##0.00";
  ws.getCell(`K${l}`).value = droitEurTotal;
  ws.getCell(`K${l}`).numFmt = "#,##0.00";
  ws.getCell(`N${l}`).value = tvaEurTotal;
  ws.getCell(`N${l}`).numFmt = "#,##0.00";
  ["A", "E", "F", "G", "H", "K", "N"].forEach((col) => {
    const c = ws.getCell(`${col}${l}`);
    c.font = POLICE_TOTAL;
    c.fill = FOND_JAUNE;
    c.alignment = CENTRE;
    c.border = BORDURE_FINE;
  });
  l += 2;

  ws.mergeCells(`A${l}:N${l}`);
  const liquidTitre = ws.getCell(`A${l}`);
  liquidTitre.value = "LIQUIDATION FINALE (DAP + REX + ATVAI)";
  liquidTitre.font = POLICE_ENTETE;
  liquidTitre.fill = FOND_BLEU;
  liquidTitre.alignment = CENTRE;
  l += 1;

  const lignesLiquidation: [string, string | number][] = [
    ["Droits de douane (avec REX appliqué)", droitEurTotal],
    ["TVA importée (autoliquidée sur CA3 — ATVAI)", tvaEurTotal],
    ["TVA nette à débourser à la douane (ATVAI = 0 €)", "0,00 €"],
  ];
  for (const [label, val] of lignesLiquidation) {
    ws.mergeCells(`A${l}:M${l}`);
    ws.getCell(`A${l}`).value = label;
    ws.getCell(`N${l}`).value = val;
    if (typeof val === "number") ws.getCell(`N${l}`).numFmt = "#,##0.00";
    l += 1;
  }
  l += 1;

  ws.mergeCells(`A${l}:M${l}`);
  ws.getCell(`A${l}`).value = "TOTAL À PAYER À LA DOUANE (droits seuls) :";
  ws.getCell(`N${l}`).value = droitEurTotal;
  ws.getCell(`N${l}`).numFmt = "#,##0.00";
  [`A${l}`, `N${l}`].forEach((ref) => {
    const c = ws.getCell(ref);
    c.font = POLICE_TOTAL;
    c.fill = FOND_JAUNE;
  });
  l += 2;

  ws.mergeCells(`A${l}:N${l}`);
  const syntheseTitre = ws.getCell(`A${l}`);
  syntheseTitre.value = "SYNTHÈSE PAR TAUX TVA (autoliquidation ATVAI)";
  syntheseTitre.font = POLICE_ENTETE;
  syntheseTitre.fill = FOND_BLEU;
  syntheseTitre.alignment = CENTRE;
  l += 1;

  const synthese: [string, number, number][] = [
    ["TVA 5,5 % (denrées base)", data.synthese_tva.base_5_5_eur, data.synthese_tva.tva_5_5_eur],
    ["TVA 10 % (prépa alim.)", data.synthese_tva.base_10_eur, data.synthese_tva.tva_10_eur],
    ["TVA 20 % (manufacturé)", data.synthese_tva.base_20_eur, data.synthese_tva.tva_20_eur],
  ];
  for (const [label, base, tva] of synthese) {
    ws.mergeCells(`A${l}:J${l}`);
    ws.getCell(`A${l}`).value = label;
    ws.mergeCells(`K${l}:L${l}`);
    ws.getCell(`K${l}`).value = base;
    ws.getCell(`K${l}`).numFmt = "#,##0.00";
    ws.getCell(`M${l}`).value = "→";
    ws.getCell(`M${l}`).alignment = CENTRE;
    ws.getCell(`N${l}`).value = tva;
    ws.getCell(`N${l}`).numFmt = "#,##0.00";
    l += 1;
  }
  l += 1;

  ws.mergeCells(`A${l}:N${l}`);
  const declTitre = ws.getCell(`A${l}`);
  declTitre.value = "DÉCLARATION D'ORIGINE / STATEMENT ON ORIGIN (Annexe 22-07 Règl. UE 2015/2447)";
  declTitre.font = POLICE_ENTETE;
  declTitre.fill = FOND_BLEU;
  declTitre.alignment = CENTRE;
  l += 1;

  ws.mergeCells(`A${l}:N${l}`);
  const texteFr = ws.getCell(`A${l}`);
  texteFr.value = `FR : L'exportateur des produits couverts par ce document (N° d'exportateur enregistré REX ${EXPORTATEUR.rex}) déclare que, sauf indication contraire, ces produits ont l'origine préférentielle Sénégal (SPG / UE).`;
  texteFr.alignment = GAUCHE;
  ws.getRow(l).height = 34;
  l += 2;

  ws.mergeCells(`A${l}:N${l}`);
  const texteEn = ws.getCell(`A${l}`);
  texteEn.value = `EN : The exporter of the products covered by this document (REX No. ${EXPORTATEUR.rex}) declares that, except where otherwise clearly indicated, these products are of Senegalese preferential origin (GSP / SPG).`;
  texteEn.alignment = GAUCHE;
  ws.getRow(l).height = 34;
  l += 2;

  ws.mergeCells(`A${l}:N${l}`);
  const signature = ws.getCell(`A${l}`);
  signature.value = `Signature & cachet — Date ${infos.dateVol}, Dakar`;
  signature.font = POLICE_GRAS;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
