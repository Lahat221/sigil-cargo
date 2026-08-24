import type ExcelJS from "exceljs";

// Constantes de style reprises exactement des fichiers réels déjà envoyés au
// transitaire (vérifiées avec openpyxl contre les 3 exemples fournis) — ne
// pas les remplacer par la charte SIGIL CARGO : Clément a l'habitude de ce
// format précis.
export const BLEU = "FF1F4E78";
export const VERT = "FFE2EFDA"; // sections REX
export const GRIS = "FFF2F2F2"; // sections non-REX
export const JAUNE = "FFFFF2CC"; // totaux

export const FOND_BLEU: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLEU } };
export const FOND_VERT: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERT } };
export const FOND_GRIS: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: GRIS } };
export const FOND_JAUNE: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: JAUNE } };

export function fondSection(couleur: "GREEN" | "GREY"): ExcelJS.Fill {
  return couleur === "GREEN" ? FOND_VERT : FOND_GRIS;
}

export const POLICE_TITRE: Partial<ExcelJS.Font> = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
export const POLICE_ENTETE: Partial<ExcelJS.Font> = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
export const POLICE_SECTION: Partial<ExcelJS.Font> = { name: "Arial", size: 10, bold: true };
export const POLICE_CORPS: Partial<ExcelJS.Font> = { name: "Arial", size: 10 };
export const POLICE_GRAS: Partial<ExcelJS.Font> = { name: "Arial", size: 10, bold: true };
export const POLICE_TOTAL: Partial<ExcelJS.Font> = { name: "Arial", size: 11, bold: true };

export const BORDURE_FINE: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FF808080" } },
  bottom: { style: "thin", color: { argb: "FF808080" } },
  left: { style: "thin", color: { argb: "FF808080" } },
  right: { style: "thin", color: { argb: "FF808080" } },
};

export const CENTRE: Partial<ExcelJS.Alignment> = { horizontal: "center", vertical: "middle", wrapText: true };
export const GAUCHE: Partial<ExcelJS.Alignment> = { horizontal: "left", vertical: "middle", wrapText: true };
export const DROITE: Partial<ExcelJS.Alignment> = { horizontal: "right", vertical: "middle", wrapText: true };
