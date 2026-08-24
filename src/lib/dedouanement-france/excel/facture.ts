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

export type InfosExpedition = {
  mawb: string;
  dateVol: string;
  nombreColis: number;
  dimensions: string;
  poidsBrutLtaKg: number;
};

export async function buildFactureCommerciale(
  data: DeclarationFranceIA,
  infos: InfosExpedition
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Facture Commerciale");
  ws.columns = [
    { width: 5 },
    { width: 40 },
    { width: 30 },
    { width: 15 },
    { width: 6 },
    { width: 8 },
    { width: 10 },
    { width: 12 },
    { width: 8 },
  ];

  let l = 1;

  ws.mergeCells(`A${l}:I${l}`);
  const titre = ws.getCell(`A${l}`);
  titre.value = "FACTURE COMMERCIALE / COMMERCIAL INVOICE";
  titre.font = POLICE_TITRE;
  titre.fill = FOND_BLEU;
  titre.alignment = CENTRE;
  ws.getRow(l).height = 24;
  l += 1;

  ws.mergeCells(`A${l}:I${l}`);
  const sousTitre = ws.getCell(`A${l}`);
  sousTitre.value = `N° SIGIL-${infos.dateVol}-001 — Date : ${infos.dateVol} — MAWB ${infos.mawb}`;
  sousTitre.font = { name: "Arial", size: 10, italic: true };
  sousTitre.alignment = CENTRE;
  l += 2;

  ws.mergeCells(`A${l}:D${l}`);
  ws.getCell(`A${l}`).value = "EXPORTATEUR / EXPORTER";
  ws.mergeCells(`F${l}:I${l}`);
  ws.getCell(`F${l}`).value = "IMPORTATEUR / IMPORTER";
  [`A${l}`, `F${l}`].forEach((ref) => {
    const c = ws.getCell(ref);
    c.font = POLICE_ENTETE;
    c.fill = FOND_BLEU;
    c.alignment = CENTRE;
  });
  l += 1;

  const identite: [string, string, string, string][] = [
    ["Raison sociale :", EXPORTATEUR.raisonSociale, "Nom :", IMPORTATEUR.nom],
    ["Représentant :", EXPORTATEUR.representant, "Adresse :", IMPORTATEUR.adresse],
    ["Adresse :", EXPORTATEUR.adresse, "SIRET :", IMPORTATEUR.siret],
    ["Téléphone :", EXPORTATEUR.telephone, "EORI :", IMPORTATEUR.eori],
    ["Email :", EXPORTATEUR.email, "N° TVA :", IMPORTATEUR.tvaIntracom],
    ["TIN :", EXPORTATEUR.tin, "Téléphone :", IMPORTATEUR.telephone],
    ["N° REX :", EXPORTATEUR.rex, "Email :", IMPORTATEUR.email],
  ];
  for (const [labelG, valG, labelD, valD] of identite) {
    ws.getCell(`A${l}`).value = labelG;
    ws.getCell(`B${l}`).value = valG;
    ws.getCell(`F${l}`).value = labelD;
    ws.getCell(`G${l}`).value = valD;
    l += 1;
  }
  l += 1;

  ws.mergeCells(`A${l}:I${l}`);
  const transportTitre = ws.getCell(`A${l}`);
  transportTitre.value = "TRANSPORT";
  transportTitre.font = POLICE_ENTETE;
  transportTitre.fill = FOND_BLEU;
  transportTitre.alignment = CENTRE;
  l += 1;

  const transport: [string, string, string, string][] = [
    ["Transporteur :", TRANSPORT_DEFAUT.transporteur, "Agent IATA :", TRANSPORT_DEFAUT.agentIata],
    ["MAWB :", infos.mawb, "Vol :", `${TRANSPORT_DEFAUT.vol} / ${infos.dateVol}`],
    ["Itinéraire :", TRANSPORT_DEFAUT.itineraire, "Incoterm :", TRANSPORT_DEFAUT.incoterm],
    ["Nombre de colis :", `${infos.nombreColis} colis`, "Dimensions :", infos.dimensions],
  ];
  for (const [labelG, valG, labelD, valD] of transport) {
    ws.getCell(`A${l}`).value = labelG;
    ws.getCell(`B${l}`).value = valG;
    ws.getCell(`E${l}`).value = labelD;
    ws.getCell(`F${l}`).value = valD;
    l += 1;
  }
  ws.getCell(`A${l}`).value = "Poids brut total :";
  ws.getCell(`B${l}`).value = `${infos.poidsBrutLtaKg} kg ✓ (LTA)`;
  l += 2;

  const headerRow = ws.getRow(l);
  headerRow.height = 30;
  const entetesTableau = [
    "N°",
    "Description produit",
    "Description douanière",
    "HS Code",
    "Qté",
    "Poids kg",
    "P.U. FCFA",
    "Total FCFA",
    "REX",
  ];
  entetesTableau.forEach((label, i) => {
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
  let valeurTotaleFcfa = 0;
  let valeurRexFcfa = 0;
  let valeurNonRexFcfa = 0;

  for (const sectionDef of SECTION_ORDER) {
    const lignesSection = data.lignes.filter((li) => li.section === sectionDef.cle);
    if (lignesSection.length === 0) continue;

    ws.mergeCells(`A${l}:I${l}`);
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
      row.getCell(2).value = ligne.produits_absorbes;
      row.getCell(3).value = ligne.designation_taric;
      row.getCell(4).value = ligne.hs;
      row.getCell(5).value = ligne.qte;
      row.getCell(5).numFmt = "0";
      row.getCell(6).value = ligne.poids_kg;
      row.getCell(6).numFmt = "0.0";
      row.getCell(7).value = ligne.pu_fcfa;
      row.getCell(7).numFmt = "#,##0";
      row.getCell(8).value = ligne.valeur_fcfa;
      row.getCell(8).numFmt = "#,##0";
      row.getCell(9).value = ligne.preference === 200 ? "✓ REX" : "—";

      row.getCell(1).alignment = CENTRE;
      row.getCell(2).alignment = GAUCHE;
      row.getCell(3).alignment = GAUCHE;
      row.getCell(4).alignment = GAUCHE;
      row.getCell(5).alignment = CENTRE;
      row.getCell(6).alignment = DROITE;
      row.getCell(7).alignment = DROITE;
      row.getCell(8).alignment = DROITE;
      row.getCell(9).alignment = CENTRE;
      row.eachCell((cell) => {
        cell.fill = fondSection(sectionDef.couleur);
        cell.border = BORDURE_FINE;
      });

      qteTotale += ligne.qte;
      poidsTotal += ligne.poids_kg;
      valeurTotaleFcfa += ligne.valeur_fcfa;
      if (ligne.preference === 200) valeurRexFcfa += ligne.valeur_fcfa;
      else valeurNonRexFcfa += ligne.valeur_fcfa;

      l += 1;
    }
  }

  ws.mergeCells(`A${l}:D${l}`);
  ws.getCell(`A${l}`).value = "TOTAL";
  ws.getCell(`E${l}`).value = qteTotale;
  ws.getCell(`F${l}`).value = poidsTotal;
  ws.getCell(`F${l}`).numFmt = "0.0";
  ws.getCell(`H${l}`).value = valeurTotaleFcfa;
  ws.getCell(`H${l}`).numFmt = "#,##0";
  [`A${l}`, `E${l}`, `F${l}`, `G${l}`, `H${l}`, `I${l}`].forEach((ref) => {
    const c = ws.getCell(ref);
    c.font = POLICE_TOTAL;
    c.fill = FOND_JAUNE;
    c.alignment = CENTRE;
    c.border = BORDURE_FINE;
  });
  l += 1;

  ws.mergeCells(`A${l}:G${l}`);
  ws.getCell(`A${l}`).value = `TOTAL EUR (1 EUR = ${TRANSPORT_DEFAUT.tauxChangeXofEur} FCFA)`;
  ws.getCell(`H${l}`).value = data.meta.valeur_totale_eur;
  ws.getCell(`H${l}`).numFmt = "#,##0.00";
  [`A${l}`, `H${l}`, `I${l}`].forEach((ref) => {
    const c = ws.getCell(ref);
    c.font = POLICE_TOTAL;
    c.fill = FOND_JAUNE;
    c.alignment = CENTRE;
    c.border = BORDURE_FINE;
  });
  l += 2;

  ws.mergeCells(`A${l}:I${l}`);
  const repartTitre = ws.getCell(`A${l}`);
  repartTitre.value = "RÉPARTITION PRÉFÉRENCE TARIFAIRE (REX)";
  repartTitre.font = POLICE_ENTETE;
  repartTitre.fill = FOND_BLEU;
  repartTitre.alignment = CENTRE;
  l += 1;

  const pctRex = valeurTotaleFcfa > 0 ? valeurRexFcfa / valeurTotaleFcfa : 0;
  ws.mergeCells(`A${l}:C${l}`);
  ws.getCell(`A${l}`).value = "✓ REX éligible (préf. 200 → droit 0 %) :";
  ws.getCell(`D${l}`).value = valeurRexFcfa;
  ws.getCell(`D${l}`).numFmt = "#,##0";
  ws.getCell(`E${l}`).value = pctRex;
  ws.getCell(`E${l}`).numFmt = "0.0%";
  [`A${l}`, `D${l}`, `E${l}`].forEach((ref) => {
    const c = ws.getCell(ref);
    c.font = POLICE_GRAS;
    c.fill = fondSection("GREEN");
  });
  l += 1;

  ws.mergeCells(`A${l}:C${l}`);
  ws.getCell(`A${l}`).value = "— Non éligible (préf. 100) :";
  ws.getCell(`D${l}`).value = valeurNonRexFcfa;
  ws.getCell(`D${l}`).numFmt = "#,##0";
  ws.getCell(`E${l}`).value = 1 - pctRex;
  ws.getCell(`E${l}`).numFmt = "0.0%";
  [`A${l}`, `D${l}`, `E${l}`].forEach((ref) => {
    const c = ws.getCell(ref);
    c.font = POLICE_GRAS;
    c.fill = fondSection("GREY");
  });
  l += 2;

  ws.mergeCells(`A${l}:I${l}`);
  const declTitre = ws.getCell(`A${l}`);
  declTitre.value = "DÉCLARATION D'ORIGINE / STATEMENT ON ORIGIN (Annexe 22-07 Règl. UE 2015/2447)";
  declTitre.font = POLICE_ENTETE;
  declTitre.fill = FOND_BLEU;
  declTitre.alignment = CENTRE;
  l += 1;

  ws.mergeCells(`A${l}:I${l}`);
  const texteFr = ws.getCell(`A${l}`);
  texteFr.value = `FR : L'exportateur des produits couverts par ce document (N° d'exportateur enregistré REX ${EXPORTATEUR.rex}) déclare que, sauf indication contraire, ces produits ont l'origine préférentielle Sénégal (SPG / UE).`;
  texteFr.alignment = GAUCHE;
  ws.getRow(l).height = 34;
  l += 2;

  ws.mergeCells(`A${l}:I${l}`);
  const texteEn = ws.getCell(`A${l}`);
  texteEn.value = `EN : The exporter of the products covered by this document (REX No. ${EXPORTATEUR.rex}) declares that, except where otherwise clearly indicated, these products are of Senegalese preferential origin (GSP / SPG).`;
  texteEn.alignment = GAUCHE;
  ws.getRow(l).height = 34;
  l += 2;

  ws.mergeCells(`A${l}:I${l}`);
  ws.getCell(`A${l}`).value = `Conditions : DAP Villeurbanne    Date : ${infos.dateVol}    Lieu : Dakar, Sénégal`;
  l += 1;

  ws.mergeCells(`A${l}:I${l}`);
  const signature = ws.getCell(`A${l}`);
  signature.value = "Signature & cachet exportateur :";
  signature.font = POLICE_GRAS;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
