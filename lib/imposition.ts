/**
 * Calcula quantas peças (largura x altura) cabem em uma folha (sheetW x sheetH).
 * Considera sangria (bleed) na borda da folha e folga (gutter) entre peças.
 * Tenta também a rotação 90º e escolhe o melhor encaixe.
 * 
 * Melhorias:
 * - Algoritmo mais preciso que testa todas as combinações possíveis
 * - Considera margens de segurança mais realistas
 */
export function computeImposition(opts: {
    productWidthMm: number;   // largura da peça (mm)
    productHeightMm: number;  // altura da peça (mm)
    sheetWidthMm: number;     // largura da folha (mm)
    sheetHeightMm: number;    // altura da folha (mm)
    bleedMm?: number;         // sangria na borda da folha (mm) - aplicada nos 4 lados
    gutterMm?: number;        // folga entre peças (mm) - aplicada entre as peças
  }) {
    const {
      productWidthMm,
      productHeightMm,
      sheetWidthMm,
      sheetHeightMm,
      bleedMm = 0,
      gutterMm = 0,
    } = opts;
  
    if (
      productWidthMm <= 0 || productHeightMm <= 0 ||
      sheetWidthMm <= 0 || sheetHeightMm <= 0
    ) {
      return { piecesPerSheet: 0, orientation: "none" as const };
    }
  
    // Área útil da folha (desconta bleed nos 4 lados)
    const usableW = Math.max(0, sheetWidthMm - 2 * bleedMm);
    const usableH = Math.max(0, sheetHeightMm - 2 * bleedMm);
  
    // Função helper para calcular peças (com folga entre peças)
    function fit(countW: number, countH: number, prodW: number, prodH: number) {
      if (countW === 0 || countH === 0) return false;
      // largura ocupada por N peças considerando folga entre elas
      const occW = countW * prodW + (countW > 1 ? (countW - 1) * gutterMm : 0);
      const occH = countH * prodH + (countH > 1 ? (countH - 1) * gutterMm : 0);
      return occW <= usableW && occH <= usableH;
    }
  
    function maxFit(prodW: number, prodH: number) {
      // estimativa inicial (upper bound) - quantas peças cabem teoricamente
      const estW = Math.floor((usableW + gutterMm) / (prodW + gutterMm));
      const estH = Math.floor((usableH + gutterMm) / (prodH + gutterMm));
      
      let best = 0;
      let bestW = 0;
      let bestH = 0;
  
      // Testa todas as combinações possíveis (não apenas a primeira que couber)
      for (let w = estW; w >= 1; w--) {
        for (let h = estH; h >= 1; h--) {
          if (fit(w, h, prodW, prodH)) {
            const total = w * h;
            if (total > best) {
              best = total;
              bestW = w;
              bestH = h;
            }
          }
        }
      }
      
      return best;
    }
  
    const normal = maxFit(productWidthMm, productHeightMm);
    const rotated = maxFit(productHeightMm, productWidthMm);
  
    if (rotated > normal) {
      return { piecesPerSheet: rotated, orientation: "rotated" as const };
    }
    return { piecesPerSheet: normal, orientation: "normal" as const };
  }
  