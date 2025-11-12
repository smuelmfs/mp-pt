export function computeImposition(opts: {
    productWidthMm: number;
    productHeightMm: number;
    sheetWidthMm: number;
    sheetHeightMm: number;
    bleedMm?: number;
    gutterMm?: number;
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
  
    const usableW = Math.max(0, sheetWidthMm - 2 * bleedMm);
    const usableH = Math.max(0, sheetHeightMm - 2 * bleedMm);
  
    function fit(countW: number, countH: number, prodW: number, prodH: number) {
      if (countW === 0 || countH === 0) return false;
      const occW = countW * prodW + (countW > 1 ? (countW - 1) * gutterMm : 0);
      const occH = countH * prodH + (countH > 1 ? (countH - 1) * gutterMm : 0);
      return occW <= usableW && occH <= usableH;
    }
  
    function maxFit(prodW: number, prodH: number) {
      const estW = Math.floor((usableW + gutterMm) / (prodW + gutterMm));
      const estH = Math.floor((usableH + gutterMm) / (prodH + gutterMm));
      
      let best = 0;
      let bestW = 0;
      let bestH = 0;
  
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
  