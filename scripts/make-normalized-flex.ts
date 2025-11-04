import fs from "fs";
import path from "path";

const rawPath = path.resolve(process.cwd(), "data/raw/flex.json");
const outPath = path.resolve(process.cwd(), "data/normalized/products.flex.json");

function dec4(v: number | string | null | undefined): string {
  if (v == null || v === "") return "0.0000";
  const n = typeof v === "string" ? Number(String(v).replace(",", ".")) : Number(v);
  return (isFinite(n) ? n : 0).toFixed(4);
}

function isNum(x: any): boolean {
  const n = Number(x);
  return Number.isFinite(n) && n >= 0;
}

function parseDimensions(dim: string | null | undefined): { widthMm: number | null; heightMm: number | null } {
  if (!dim || typeof dim !== "string") return { widthMm: null, heightMm: null };
  const clean = dim.replace(/[x×]/gi, "x").replace(/\s+/g, "").replace(/\+-/g, "").trim();
  const parts = clean.split("x");
  if (parts.length !== 2) return { widthMm: null, heightMm: null };
  const w = Number(parts[0]);
  const h = Number(parts[1]);
  if (!isFinite(w) || !isFinite(h)) return { widthMm: null, heightMm: null };
  // Convert to mm (assume input is in meters/decimeters: 10 = 1000mm)
  return { widthMm: w * 100, heightMm: h * 100 };
}

function extractFaces(facesStr: string | null | undefined): number {
  if (!facesStr || typeof facesStr !== "string") return 1;
  const match = facesStr.match(/(\d+)[\s-]*face/i);
  return match ? Number(match[1]) : 1;
}

const rows = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

const items: any[] = [];
let inFlexSection = false;
let flexHeaderSeen = false;

// Detectar seção de Flex (antes da seção de Têxteis que começa com "CLIENTE")
for (const r of rows) {
  const flex = (r["FLEX"] || "").toString().trim();
  
  // Marca início da seção de Flex
  if (flex.toUpperCase().includes("PERSONALIZAÇÃO") || flex === "Medida") {
    flexHeaderSeen = true;
    inFlexSection = true;
    continue;
  }
  
  // Marca fim da seção de Flex (início de têxteis)
  if (flex.toUpperCase() === "CLIENTE") {
    inFlexSection = false;
    break;
  }
  
  // Ignora cabeçalhos e linhas vazias
  if (!inFlexSection || !flex || flex === "Medida" || !isNum(r["Unnamed: 1"])) continue;
  
  const areaM2 = Number(r["Unnamed: 1"]);
  if (areaM2 <= 0) continue;
  
  const dims = parseDimensions(flex);
  if (!dims.widthMm || !dims.heightMm) {
    console.warn(`Skipping line with invalid dimensions: ${flex}`);
    continue;
  }
  
  const desc = (r["Unnamed: 3"] || "").toString().trim();
  const structurePrice = isNum(r["Unnamed: 5"]) ? Number(r["Unnamed: 5"]) : 0;
  const facesStr = (r["Unnamed: 8"] || "").toString().trim();
  const faces = extractFaces(facesStr);
  
  // Material cost (usar o maior, se houver dois tamanhos)
  const materialCostSmall = isNum(r["Unnamed: 11"]) ? Number(r["Unnamed: 11"]) : 0;
  const materialCostLarge = isNum(r["Unnamed: 15"]) ? Number(r["Unnamed: 15"]) : 0;
  const materialCostM2 = Math.max(materialCostSmall, materialCostLarge) / areaM2; // Converter para €/m²
  
  // Labor cost (mão de obra/tempo) - usar média ou maior
  const laborCostSmall = isNum(r["Unnamed: 12"]) ? Number(r["Unnamed: 12"]) : 0;
  const laborCostLarge = isNum(r["Unnamed: 16"]) ? Number(r["Unnamed: 16"]) : 0;
  const laborCost = Math.max(laborCostSmall, laborCostLarge);
  
  // Printing unit price (assumir 25€/m² como padrão ou calcular a partir do material)
  // Se não houver valor explícito, usar uma estimativa baseada no material cost
  const printingUnitPrice = materialCostM2 > 0 ? materialCostM2 * 4 : 25.0; // Estimativa: material * 4
  
  // Nome do produto
  const productType = desc.toLowerCase().includes("poste") ? "Poste" : desc.toLowerCase().includes("tenda") ? "Tenda" : "Flex";
  const name = `${productType} ${dims.widthMm / 100}x${dims.heightMm / 100} ${faces}F`;
  
  const item: any = {
    name,
    widthMm: dims.widthMm,
    heightMm: dims.heightMm,
    faces,
    printing: {
      technology: "GRANDE_FORMATO",
      formatLabel: "FLEX_M2",
      colors: null,
      sides: 1,
      unitPrice: dec4(printingUnitPrice),
      setupMode: "FLAT",
      setupFlatFee: "0.00",
      minFee: "0.00",
      lossFactor: "0.0300",
    },
    materials: [
      {
        name: "Lona Frontlite 440g",
        unit: "M2",
        unitCost: dec4(materialCostM2),
      },
    ],
    finishes: [],
    suggested: [1, 2, 5, 10],
  };
  
  // Estrutura metálica (se houver preço)
  if (structurePrice > 0) {
    item.finishes.push({
      name: "Estrutura Metálica",
      category: "OUTROS",
      unit: "UNIT",
      calcType: "PER_UNIT",
      baseCost: dec4(structurePrice),
    });
  }
  
  // Montagem (mão de obra)
  if (laborCost > 0) {
    item.finishes.push({
      name: "Montagem",
      category: "OUTROS",
      unit: "UNIT",
      calcType: "PER_HOUR",
      baseCost: dec4(laborCost),
    });
  }
  
  // Camada de Impressão adicional (para faces > 1)
  if (faces > 1) {
    item.finishes.push({
      name: "Camada de Impressão (faces)",
      category: "OUTROS",
      unit: "M2",
      calcType: "PER_M2",
      baseCost: dec4(printingUnitPrice),
      qtyPerUnit: dec4(faces - 1),
    });
  }
  
  items.push(item);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(items, null, 2));

console.log(JSON.stringify({ count: items.length }));

