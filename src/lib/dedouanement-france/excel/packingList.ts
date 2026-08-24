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

// Types produits normalisés attendus dans la colonne "Type produit" (§5.4).
const TYPE_PRODUIT_PAR_SECTION: Record<string, string> = {
  AGRO_REX: "Agro Rex",
  AGRO_NREX: "Agro Nonrex",
  VETEMENTS: "Vetement",
  TEXTILES: "Textile",
  MAROQ: "Sacs",
  CHAUSSURES: "Chaussures",
  PARFUMERIE: "Cosmetique",
  ACCESSOIRES: "Accessoire",
  USTENSILES: "Ustensiles",
  BIJOUX: "Bijoux",
  COIFFURE: "Accessoire",
};

export async function buildPackingList(
  data: DeclarationFranceIA,
  infos: InfosExpedition
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Packing List");
  ws.columns = [
    { width: 5 },
    { width: 40 },
    { width: 30 },
    { width: 15 },
    { width: 12 },
    { width: 6 },
    { width: 10 },
    { width: 6 },
  ];

  let l = 1;

  ws.mergeCells(`A${l}:H${l}`);
  const titre = ws.getCell(`A${l}`);
  titre.value = "LISTE DE COLISAGE / PACKING LIST";
  titre.font = POLICE_TITRE;
  titre.fill = FOND_BLEU;
  titre.alignment = CENTRE;
  ws.getRow(l).height = 24;
  l += 1;

  ws.mergeCells(`A${l}:H${l}`);
  const sousTitre = ws.getCell(`A${l}`);
  sousTitre.value = `Date : ${infos.dateVol}  —  MAWB : ${infos.mawb}`;
  sousTitre.font = { name: "Arial", size: 10, italic: true };
  sousTitre.alignment = CENTRE;
  l += 2;

  ws.mergeCells(`A${l}:D${l}`);
  ws.getCell(`A${l}`).value = "EXPÉDITEUR";
  ws.mergeCells(`E${l}:H${l}`);
  ws.getCell(`E${l}`).value = "DESTINATAIRE";
  [`A${l}`, `E${l}`].forEach((ref) => {
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
    ws.getCell(`E${l}`).value = labelD;
    ws.getCell(`F${l}`).value = valD;
    l += 1;
  }
  l += 1;

  ws.mergeCells(`A${l}:H${l}`);
  const transportTitre = ws.getCell(`A${l}`);
  transportTitre.value = "TRANSPORT & COLISAGE";
  transportTitre.font = POLICE_ENTETE;
  transportTitre.fill = FOND_BLEU;
  transportTitre.alignment = CENTRE;
  l += 1;

  const transport: [string, string][] = [
    ["Transporteur :", TRANSPORT_DEFAUT.transporteur],
    ["Agent IATA :", TRANSPORT_DEFAUT.agentIata],
    ["MAWB :", infos.mawb],
    ["Vol :", `${TRANSPORT_DEFAUT.vol} / ${infos.dateVol}`],
    ["Itinéraire :", TRANSPORT_DEFAUT.itineraire],
    ["Incoterm :", TRANSPORT_DEFAUT.incoterm],
    ["Nombre de colis :", `${infos.nombreColis} colis`],
    ["Dimensions :", infos.dimensions],
    ["Poids brut LTA :", `${infos.poidsBrutLtaKg} kg ✓`],
  ];
  for (const [label, val] of transport) {
    ws.getCell(`A${l}`).value = label;
    ws.getCell(`B${l}`).value = val;
    l += 1;
  }
  l += 1;

  const headerRow = ws.getRow(l);
  headerRow.height = 30;
  const entetes = ["N°", "Description produit", "Description douanière", "HS Code", "Type produit", "Qté", "Poids kg", "REX"];
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
  let valeurRexFcfa = 0;
  let valeurTotaleFcfa = 0;

  for (const sectionDef of SECTION_ORDER) {
    const lignesSection = data.lignes.filter((li) => li.section === sectionDef.cle);
    if (lignesSection.length === 0) continue;

    ws.mergeCells(`A${l}:H${l}`);
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
      row.getCell(5).value = TYPE_PRODUIT_PAR_SECTION[ligne.section] ?? ligne.type_produit;
      row.getCell(6).value = ligne.qte;
      row.getCell(6).numFmt = "0";
      row.getCell(7).value = ligne.poids_kg;
      row.getCell(7).numFmt = "0.0";
      row.getCell(8).value = ligne.preference === 200 ? "✓" : "—";

      row.getCell(1).alignment = CENTRE;
      row.getCell(2).alignment = GAUCHE;
      row.getCell(3).alignment = GAUCHE;
      row.getCell(4).alignment = GAUCHE;
      row.getCell(5).alignment = GAUCHE;
      row.getCell(6).alignment = CENTRE;
      row.getCell(7).alignment = DROITE;
      row.getCell(8).alignment = CENTRE;
      row.eachCell((cell) => {
        cell.fill = fondSection(sectionDef.couleur);
        cell.border = BORDURE_FINE;
      });

      qteTotale += ligne.qte;
      poidsTotal += ligne.poids_kg;
      valeurTotaleFcfa += ligne.valeur_fcfa;
      if (ligne.preference === 200) valeurRexFcfa += ligne.valeur_fcfa;

      l += 1;
    }
  }

  ws.mergeCells(`A${l}:E${l}`);
  ws.getCell(`A${l}`).value = "TOTAL";
  ws.getCell(`F${l}`).value = qteTotale;
  ws.getCell(`G${l}`).value = poidsTotal;
  ws.getCell(`G${l}`).numFmt = "0.0";
  [`A${l}`, `F${l}`, `G${l}`].forEach((ref) => {
    const c = ws.getCell(ref);
    c.font = POLICE_TOTAL;
    c.fill = FOND_JAUNE;
    c.alignment = CENTRE;
    c.border = BORDURE_FINE;
  });
  l += 2;

  ws.mergeCells(`A${l}:H${l}`);
  ws.getCell(`A${l}`).value =
    `📊 ${data.meta.nb_lignes_regroupees} lignes HS regroupées (vs ~${data.meta.nb_lignes_brutes} brutes) — Économie frais transitaire : ${data.meta.economie_transitaire_eur} €`;
  ws.getCell(`A${l}`).font = POLICE_GRAS;
  l += 1;

  const pctRex = valeurTotaleFcfa > 0 ? (valeurRexFcfa / valeurTotaleFcfa) * 100 : 0;
  ws.mergeCells(`A${l}:H${l}`);
  ws.getCell(`A${l}`).value = `Part REX éligible : ${pctRex.toFixed(1)}% (${valeurRexFcfa.toLocaleString("fr-FR")} FCFA)`;
  l += 2;

  ws.mergeCells(`A${l}:H${l}`);
  const signature = ws.getCell(`A${l}`);
  signature.value = "Signature & cachet expéditeur :";
  signature.font = POLICE_GRAS;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
