/**
 * Calcula quantas peças (largura x altura) cabem em uma folha (sheetW x sheetH).
 * Considera sangria (bleed) na borda da folha e folga (gutter) entre peças.
 * Tenta também a rotação 90º e escolhe o melhor encaixe.
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
    function fit(countW: number, countH: number) {
      // largura ocupada por N peças considerando folga entre elas
      const occW = countW * productWidthMm + (countW - 1) * gutterMm;
      const occH = countH * productHeightMm + (countH - 1) * gutterMm;
      return occW <= usableW && occH <= usableH;
    }
  
    function maxFit(prodW: number, prodH: number) {
      // estimativa inicial sem gutter (upper bound)
      const estW = Math.floor(usableW / prodW);
      const estH = Math.floor(usableH / prodH);
      let best = 0;
  
      for (let w = estW; w >= 0; w--) {
        for (let h = estH; h >= 0; h--) {
          if (w === 0 || h === 0) continue;
          if (fit(w, h)) {
            const total = w * h;
            if (total > best) best = total;
            break; // se coube com h, descer h só vai diminuir; otimização simples
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
  