import ExcelJS from "exceljs";
import type { LigneVueEnsemble } from "./vueEnsemble";
import { SECTIONS_DECLARATION, regrouperParSection } from "./sections";
import { BRAND } from "@/lib/brand"; // cache-bust: force recompile after BRAND fix

// Coordonnées de l'expéditeur/destinataire — identiques sur chaque départ,
// reprises du modèle de déclaration fourni par l'utilisateur. Une valeur
// par tenant (voir src/lib/brand.ts) : le sens du flux change selon la
// route (SIGIL = Dakar→France, un autre tenant peut être inversé).
const { expediteurNom: EXPEDITEUR_NOM, expediteurAdresse: EXPEDITEUR_ADRESSE, expediteurTel: EXPEDITEUR_TEL } =
  BRAND.identite;
const {
  destinataireNom: DESTINATAIRE_NOM,
  destinataireSiret: DESTINATAIRE_SIRET,
  destinataireEori: DESTINATAIRE_EORI,
  destinataireAdresse: DESTINATAIRE_ADRESSE,
  destinataireTel: DESTINATAIRE_TEL,
  destinataireEmail: DESTINATAIRE_EMAIL,
} = BRAND.identite;

const NOTE_BAS_DE_PAGE =
  "NB : Concernant les vêtements et autres produits, ceux-ci ne disposent pas de facture car la plupart sont déjà utilisés ou de type traditionnel. Un inventaire chiffré a donc été établi afin d'en estimer la valeur.";

// Couleurs de la marque active (voir src/lib/brand.ts), reprises du reste
// de l'application plutôt que d'un jaune Excel générique.
const argb = (hex: string) => `FF${hex.replace("#", "")}`;
const NAVY = argb(BRAND.couleurs.navy);
const GOLD = argb(BRAND.couleurs.gold2);
const GOLD_LIGHT = argb(BRAND.couleurs.gold1);
const WHITE = "FFFFFFFF";

const FOND_NAVY: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
const FOND_OR: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } };
const FOND_OR_CLAIR: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: GOLD_LIGHT },
};

const BORDURE_BASSE: Partial<ExcelJS.Borders> = { bottom: { style: "thin" } };

export type ValeursParSection = Record<string, number | null | undefined>;

export async function genererDeclarationBuffer(
  lignes: LigneVueEnsemble[],
  dateDepart: string | null,
  valeursParSection: ValeursParSection = {}
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Déclaration", {
    pageSetup: { orientation: "portrait", fitToPage: true },
  });

  ws.columns = [
    { width: 19.5 },
    { width: 27.4 },
    { width: 15.4 },
    { width: 23.4 },
    { width: 7.7 },
    { width: 7.4 },
    { width: 8.1 },
    { width: 14 },
  ];

  const dateAffichee = dateDepart
    ? new Date(dateDepart).toLocaleDateString("fr-FR")
    : new Date().toLocaleDateString("fr-FR");

  ws.mergeCells("A1:H1");
  const titre = ws.getCell("A1");
  titre.value = `${BRAND.nom} — DÉCLARATION DE MARCHANDISE`;
  titre.font = { bold: true, size: 16, color: { argb: WHITE } };
  titre.alignment = { horizontal: "center", vertical: "middle" };
  titre.fill = FOND_NAVY;
  ws.getRow(1).height = 26;

  ws.mergeCells("A2:D2");
  ws.getCell("A2").value = `Expéditeur : ${EXPEDITEUR_NOM}`;
  ws.mergeCells("F2:H2");
  ws.getCell("F2").value = `Date : ${dateAffichee}`;
  ws.mergeCells("A3:D3");
  ws.getCell("A3").value = `Adresse: ${EXPEDITEUR_ADRESSE}`;
  ws.mergeCells("A4:D4");
  ws.getCell("A4").value = `Tel : ${EXPEDITEUR_TEL}`;

  ws.mergeCells("E5:H5");
  ws.getCell("E5").value = `Destinataire : ${DESTINATAIRE_NOM}`;
  ws.mergeCells("E6:H6");
  ws.getCell("E6").value = `Num SIRET : ${DESTINATAIRE_SIRET}`;
  ws.mergeCells("E7:H7");
  ws.getCell("E7").value = `Num EORI : ${DESTINATAIRE_EORI}`;
  ws.mergeCells("E8:H8");
  ws.getCell("E8").value = `Adresse : ${DESTINATAIRE_ADRESSE}`;
  ws.mergeCells("E9:H9");
  ws.getCell("E9").value = `TEL : ${DESTINATAIRE_TEL}`;
  ws.mergeCells("E10:H10");
  ws.getCell("E10").value = `Email : ${DESTINATAIRE_EMAIL}`;

  for (let r = 2; r <= 10; r++) {
    ws.getRow(r).eachCell((cell) => {
      cell.border = BORDURE_BASSE;
      cell.font = { bold: r === 2 || r === 5, color: { argb: NAVY } };
    });
  }

  const headerRow = ws.getRow(11);
  headerRow.height = 30;
  const headers = [
    "Type_produit",
    "Description_douane",
    "HS_code_complet",
    "Description produit",
    "Quantité",
    "Poids (kg)",
    "Poids + emb total",
    "Valeur Estimé en FCFA",
  ];
  headers.forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.fill = FOND_NAVY;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = BORDURE_BASSE;
  });

  const sections = regrouperParSection(lignes);

  let ligneCourante = 12;
  const poidsAAfficherDejaFait = new Set<string>();
  const valeurCellRefs: string[] = [];
  const poidsCellRefs: string[] = [];

  sections.forEach(({ section, lignes: sectionLignes }, idx) => {
    if (sectionLignes.length === 0) return;

    const debutSection = ligneCourante;

    for (const l of sectionLignes) {
      const row = ws.getRow(ligneCourante);
      row.getCell(1).value = l.typeProduit;
      row.getCell(2).value = l.descriptionDouane;
      row.getCell(3).value = l.hsCode ?? "à préciser";
      row.getCell(4).value = l.descriptionProduit;
      row.getCell(5).value = l.quantite ?? 0;
      row.getCell(6).value = 0;

      // Le poids d'un colis n'apparaît qu'à sa toute première ligne dans le
      // document entier (quelle que soit la section) — sinon la somme
      // totale compterait deux fois un même colis présent dans plusieurs
      // catégories.
      const afficherPoids = !poidsAAfficherDejaFait.has(l.colisId);
      if (afficherPoids) {
        poidsAAfficherDejaFait.add(l.colisId);
        row.getCell(7).value = l.poidsKg;
        poidsCellRefs.push(`G${ligneCourante}`);
      }

      row.eachCell((cell) => {
        cell.border = BORDURE_BASSE;
        cell.alignment = { vertical: "middle", wrapText: true };
      });

      ligneCourante += 1;
    }

    const finSection = ligneCourante - 1;
    ws.mergeCells(`H${debutSection}:H${finSection}`);
    const celluleValeur = ws.getCell(`H${debutSection}`);
    const valeur = valeursParSection[section.cle];
    if (valeur != null) celluleValeur.value = valeur;
    celluleValeur.font = { bold: true, color: { argb: NAVY } };
    celluleValeur.fill = FOND_OR_CLAIR;
    celluleValeur.alignment = { horizontal: "center", vertical: "middle" };
    celluleValeur.numFmt = '#,##0" FCFA"';
    celluleValeur.border = BORDURE_BASSE;
    valeurCellRefs.push(`H${debutSection}`);

    // Ligne vide de séparation entre sections (sauf après la dernière).
    if (idx < sections.length - 1 && sections.slice(idx + 1).some((s) => s.lignes.length > 0)) {
      ligneCourante += 1;
    }
  });

  const ligneTotal = ligneCourante;
  ws.getCell(`G${ligneTotal}`).value = " TOTAL";
  ws.getCell(`G${ligneTotal}`).font = { bold: true, size: 12, color: { argb: WHITE } };
  ws.getCell(`G${ligneTotal}`).fill = FOND_NAVY;
  ws.getCell(`G${ligneTotal}`).alignment = { horizontal: "center" };
  const celluleTotal = ws.getCell(`H${ligneTotal}`);
  celluleTotal.value = valeurCellRefs.length > 0 ? { formula: valeurCellRefs.join("+") } : 0;
  celluleTotal.font = { bold: true, size: 12, color: { argb: WHITE } };
  celluleTotal.fill = FOND_NAVY;
  celluleTotal.alignment = { horizontal: "center" };
  celluleTotal.numFmt = '#,##0" FCFA"';

  const lignePoidsTotal = ligneTotal + 1;
  ws.getCell(`G${lignePoidsTotal}`).value = "POIDS TOTAL";
  ws.getCell(`G${lignePoidsTotal}`).font = { bold: true, size: 12, color: { argb: NAVY } };
  ws.getCell(`G${lignePoidsTotal}`).fill = FOND_OR;
  ws.getCell(`G${lignePoidsTotal}`).alignment = { horizontal: "center" };
  ws.getCell(`G${lignePoidsTotal}`).border = BORDURE_BASSE;
  const cellulePoidsTotal = ws.getCell(`H${lignePoidsTotal}`);
  cellulePoidsTotal.value = poidsCellRefs.length > 0 ? { formula: poidsCellRefs.join("+") } : 0;
  cellulePoidsTotal.font = { bold: true, size: 12, color: { argb: NAVY } };
  cellulePoidsTotal.fill = FOND_OR;
  cellulePoidsTotal.alignment = { horizontal: "center" };
  cellulePoidsTotal.numFmt = '0.00" KG"';
  cellulePoidsTotal.border = BORDURE_BASSE;

  const ligneNote = lignePoidsTotal + 2;
  ws.mergeCells(`A${ligneNote}:H${ligneNote + 2}`);
  const celluleNote = ws.getCell(`A${ligneNote}`);
  celluleNote.value = NOTE_BAS_DE_PAGE;
  celluleNote.font = { italic: true, size: 9, color: { argb: "FF5B6B85" } };
  celluleNote.alignment = { horizontal: "left", vertical: "top", wrapText: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export { SECTIONS_DECLARATION };
