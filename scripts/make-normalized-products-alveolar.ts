import fs from "fs";
import path from "path";

const rawPath = path.resolve(process.cwd(), "data/raw/alveolar.json");
const outPath = path.resolve(process.cwd(), "data/normalized/products.alveolar.json");

function dec4(v: number | string | null | undefined): string {
  if (v == null || v === "") return "0.0000";
  const n = typeof v === "string" ? Number(String(v).replace(",", ".")) : Number(v);
  return (isFinite(n) ? n : 0).toFixed(4);
}

function dec2(v: number | string | null | undefined): string {
  if (v == null || v === "") return "0.00";
  const n = typeof v === "string" ? Number(String(v).replace(",", ".")) : Number(v);
  return (isFinite(n) ? n : 0).toFixed(2);
}

function isNum(x: any): boolean {
  const n = Number(x);
  return Number.isFinite(n);
}

function parseDimsFromCols(w: any, h: any): { widthMm: number | null; heightMm: number | null } {
  const wn = Number(String(w).replace(",", "."));
  const hn = Number(String(h).replace(",", "."));
  if (!isFinite(wn) || !isFinite(hn)) return { widthMm: null, heightMm: null };
  return { widthMm: Math.round(wn * 1000), heightMm: Math.round(hn * 1000) };
}

(() => {
  const rows: any[] = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

  // Detect header row for this sheet layout
  let headerIdx = -1;
  let colMaterial = 0, colDimW = -1, colDimH = -1, colCustoM2 = -1, colLucro = -1, colTotal = -1;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const v0 = (r[Object.keys(r)[0]] ?? "").toString().toUpperCase();
    const keys = Object.keys(r);
    const vals = keys.map(k => (r[k] ?? "").toString().toUpperCase());
    if (v0.includes("TIPO") && vals.some(v => v.includes("LARGURA")) && vals.some(v => v.includes("ALTURA")) && vals.some(v => v.includes("CUSTO")) && vals.some(v => v.includes("TOTAL"))) {
      headerIdx = i;
      keys.forEach((k, idx) => {
        const val = (r[k] ?? "").toString().toUpperCase();
        if (val.includes("LARGURA") && colDimW === -1) colDimW = idx;
        if (val.includes("ALTURA") && colDimH === -1) colDimH = idx;
        if (val === "CUSTO") colCustoM2 = idx; // production cost column
        if (val.includes("LUCRO")) colLucro = idx;
        if (val.includes("TOTAL")) colTotal = idx;
      });
      colMaterial = 0; // first column is material/title
      break;
    }
  }

  const out: any[] = [];
  const seen = new Set<string>();

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const keys = Object.keys(r);
    const getByIdx = (idx: number) => (idx >= 0 && idx < keys.length) ? r[keys[idx]] : null;

    const materialName = (getByIdx(colMaterial) ?? "").toString().trim();
    const custoM2Raw = getByIdx(colCustoM2);
    const lucroRaw = getByIdx(colLucro);
    const totalRaw = getByIdx(colTotal);
    const dimWRaw = getByIdx(colDimW);
    const dimHRaw = getByIdx(colDimH);

    if (!materialName) continue;
    if (!(isNum(custoM2Raw) || isNum(totalRaw))) continue;

    const dims = parseDimsFromCols(dimWRaw, dimHRaw);
    const unitCostM2 = dec4(custoM2Raw);
    const lucro = dec4(lucroRaw);
    const totalUnitario = dec4(totalRaw);

    const mat = {
      name: materialName,
      type: "alveolar",
      unit: "M2",
      unitCostM2: unitCostM2,
    };

    let productName: string;
    if (dims.widthMm && dims.heightMm) {
      productName = `Placa Alveolar ${materialName} (${dims.widthMm}x${dims.heightMm}mm)`;
    } else {
      productName = `Placa Alveolar ${materialName} (m²)`;
    }

    const product: any = {
      name: productName,
      category: "Placas rígidas",
    };
    if (dims.widthMm && dims.heightMm) {
      product.widthMm = dims.widthMm;
      product.heightMm = dims.heightMm;
    }

    const pricingHints = {
      custoM2: unitCostM2,
      lucro: lucro,
      totalUnitario: totalUnitario,
    };

    const key = `${materialName.toLowerCase()}|${product.widthMm || 0}|${product.heightMm || 0}|${unitCostM2}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ material: mat, product, pricingHints });
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ count: out.length }));
})();
