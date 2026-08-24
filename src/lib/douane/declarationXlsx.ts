import ExcelJS from "exceljs";
import type { LigneVueEnsemble } from "./vueEnsemble";

// Coordonnées fixes de l'expéditeur (Sénégal) et du destinataire (France) —
// identiques sur chaque départ, reprises du modèle de déclaration fourni
// par l'utilisateur pour son transitaire à Dakar.
const EXPEDITEUR_NOM = "Aminata MBAYE";
const EXPEDITEUR_ADRESSE = "Pikine  Djidah Thiaroye, Dakar Senegal";
const EXPEDITEUR_TEL = "+221 77 970 49 23  -  +221 77 271 65 25";

const DESTINATAIRE_NOM = "Abdou Lahat MBAYE";
const DESTINATAIRE_SIRET = "10216746700012";
const DESTINATAIRE_EORI = "FR10216746700012";
const DESTINATAIRE_ADRESSE = "37 Rue Docteur Rollet 69100, Villeurbanne";
const DESTINATAIRE_TEL = "+33 06 95 81 11 29";
const DESTINATAIRE_EMAIL = "lahat221@gmail.com";

const NOTE_BAS_DE_PAGE =
  "NB : Concernant les vêtements et autres produits, ceux-ci ne disposent pas de facture car la plupart sont déjà utilisés ou de type traditionnel. Un inventaire chiffré a donc été établi afin d'en estimer la valeur.";

// Regroupement en grandes sections — la valeur estimée (FCFA) est saisie une
// seule fois par section par l'utilisateur, pas ligne par ligne. Toute
// catégorie non listée explicitement tombe dans la dernière section
// ("Divers"), donc l'ajout d'une nouvelle catégorie ne casse rien.
const SECTIONS: { nom: string; types: string[] }[] = [
  {
    nom: "Alimentaire, plantes & épices",
    types: ["Produit alimentaire", "Épice / Condiment", "Plante séchée"],
  },
  { nom: "Vêtements & textile", types: ["Vêtement", "Textile"] },
  { nom: "Divers", types: [] },
];

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFFFFF00" },
};

const THIN_BOTTOM_BORDER: Partial<ExcelJS.Borders> = {
  bottom: { style: "thin" },
};

function sectionIndexPour(typeProduit: string): number {
  for (let i = 0; i < SECTIONS.length - 1; i++) {
    if (SECTIONS[i].types.includes(typeProduit)) return i;
  }
  return SECTIONS.length - 1;
}

export async function genererDeclarationBuffer(
  lignes: LigneVueEnsemble[],
  nomDepart: string,
  dateDepart: string | null
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
    { width: 12.4 },
  ];

  const dateAffichee = dateDepart
    ? new Date(dateDepart).toLocaleDateString("fr-FR")
    : new Date().toLocaleDateString("fr-FR");

  ws.mergeCells("A1:H1");
  const titre = ws.getCell("A1");
  titre.value = "DECLARATION DE MARCHANDISE";
  titre.font = { bold: true, size: 16 };
  titre.alignment = { horizontal: "center" };
  titre.border = THIN_BOTTOM_BORDER;

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
      cell.border = THIN_BOTTOM_BORDER;
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
    cell.font = { bold: true };
    cell.fill = HEADER_FILL;
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = THIN_BOTTOM_BORDER;
  });

  // Une déclaration ne concerne que les colis pour lesquels des produits ont
  // été détectés — un colis non traité n'a rien à déclarer.
  const lignesAvecProduit = lignes.filter((l) => l.typeProduit !== null);

  const parSection: LigneVueEnsemble[][] = SECTIONS.map(() => []);
  for (const l of lignesAvecProduit) {
    parSection[sectionIndexPour(l.typeProduit!)].push(l);
  }

  let ligneCourante = 12;
  const poidsAAfficherDejaFait = new Set<string>();
  const valeurCellRefs: string[] = [];
  const poidsCellRefs: string[] = [];

  parSection.forEach((sectionLignes, idx) => {
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
        cell.border = THIN_BOTTOM_BORDER;
        cell.alignment = { vertical: "middle", wrapText: true };
      });

      ligneCourante += 1;
    }

    const finSection = ligneCourante - 1;
    ws.mergeCells(`H${debutSection}:H${finSection}`);
    const celluleValeur = ws.getCell(`H${debutSection}`);
    celluleValeur.font = { bold: true };
    celluleValeur.alignment = { horizontal: "center", vertical: "middle" };
    celluleValeur.numFmt = '#,##0" FCFA"';
    celluleValeur.border = THIN_BOTTOM_BORDER;
    valeurCellRefs.push(`H${debutSection}`);

    // Ligne vide de séparation entre sections (sauf après la dernière).
    if (idx < parSection.length - 1 && parSection.slice(idx + 1).some((s) => s.length > 0)) {
      ligneCourante += 1;
    }
  });

  const ligneTotal = ligneCourante;
  ws.getCell(`G${ligneTotal}`).value = " TOTAL";
  ws.getCell(`G${ligneTotal}`).font = { bold: true, size: 12 };
  ws.getCell(`G${ligneTotal}`).fill = HEADER_FILL;
  ws.getCell(`G${ligneTotal}`).alignment = { horizontal: "center" };
  const celluleTotal = ws.getCell(`H${ligneTotal}`);
  celluleTotal.value =
    valeurCellRefs.length > 0 ? { formula: valeurCellRefs.join("+") } : 0;
  celluleTotal.font = { bold: true, size: 12 };
  celluleTotal.fill = HEADER_FILL;
  celluleTotal.alignment = { horizontal: "center" };
  celluleTotal.numFmt = '#,##0" FCFA"';

  const lignePoidsTotal = ligneTotal + 1;
  ws.getCell(`G${lignePoidsTotal}`).value = "POIDS TOTAL";
  ws.getCell(`G${lignePoidsTotal}`).font = { bold: true, size: 12 };
  ws.getCell(`G${lignePoidsTotal}`).fill = HEADER_FILL;
  ws.getCell(`G${lignePoidsTotal}`).alignment = { horizontal: "center" };
  ws.getCell(`G${lignePoidsTotal}`).border = THIN_BOTTOM_BORDER;
  const cellulePoidsTotal = ws.getCell(`H${lignePoidsTotal}`);
  cellulePoidsTotal.value =
    poidsCellRefs.length > 0 ? { formula: poidsCellRefs.join("+") } : 0;
  cellulePoidsTotal.font = { bold: true, size: 12 };
  cellulePoidsTotal.fill = HEADER_FILL;
  cellulePoidsTotal.alignment = { horizontal: "center" };
  cellulePoidsTotal.numFmt = '0.00" KG"';
  cellulePoidsTotal.border = THIN_BOTTOM_BORDER;

  const ligneNote = lignePoidsTotal + 2;
  ws.mergeCells(`A${ligneNote}:H${ligneNote + 2}`);
  const celluleNote = ws.getCell(`A${ligneNote}`);
  celluleNote.value = NOTE_BAS_DE_PAGE;
  celluleNote.alignment = { horizontal: "left", vertical: "top", wrapText: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
