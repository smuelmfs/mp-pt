import fs from "fs";
import path from "path";

const rawPath = path.resolve(process.cwd(), "data/raw/flex.json");
const outPath = path.resolve(process.cwd(), "data/normalized/textiles.customer.json");

function dec4(v: number | string | null | undefined): string {
  if (v == null || v === "") return "0.0000";
  const n = typeof v === "string" ? Number(String(v).replace(",", ".")) : Number(v);
  return (isFinite(n) ? n : 0).toFixed(4);
}

function isNum(x: any): boolean {
  const n = Number(x);
  return Number.isFinite(n) && n >= 0;
}

function normalizePrintMethod(method: string | null | undefined): string {
  if (!method) return "DTF";
  const m = method.toString().toUpperCase().trim();
  if (m.includes("DTF")) return "DTF";
  if (m.includes("HEV")) return "HEV";
  if (m.includes("FLEX")) return "FLEX";
  return "DTF"; // default
}

function normalizeProductType(product: string | null | undefined): string {
  if (!product) return "T-SHIRT";
  const p = product.toString().toLowerCase().trim();
  if (p.includes("tshirt") || p.includes("t-shirt") || p.includes("t-shirts")) return "T-SHIRT";
  if (p.includes("polo")) return "POLO";
  if (p.includes("sweat")) return "SWEAT";
  return "T-SHIRT"; // default
}

const rows = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

const items: any[] = [];
let inTextilesSection = false;

for (const r of rows) {
  const flex = (r["FLEX"] || "").toString().trim();
  
  // Marca início da seção de têxteis
  if (flex.toUpperCase() === "CLIENTE") {
    inTextilesSection = true;
    continue;
  }
  
  // Ignora cabeçalhos
  if (!inTextilesSection || flex === "CLIENTE" || !flex || flex === "") continue;
  
  const productType = normalizeProductType(r["Unnamed: 1"]);
  const model = (r["Unnamed: 2"] || "").toString().trim();
  const supportCost = isNum(r["Unnamed: 3"]) ? Number(r["Unnamed: 3"]) : null;
  const printMethod = normalizePrintMethod(r["Unnamed: 5"]);
  const frontCost = isNum(r["Unnamed: 6"]) ? Number(r["Unnamed: 6"]) : 0;
  const backCost = isNum(r["Unnamed: 7"]) ? Number(r["Unnamed: 7"]) : 0;
  const totalPrintCost = isNum(r["Unnamed: 8"]) ? Number(r["Unnamed: 8"]) : (frontCost + backCost);
  const productionCost = isNum(r["Unnamed: 9"]) ? Number(r["Unnamed: 9"]) : null;
  const marginPct = isNum(r["Unnamed: 10"]) ? Number(r["Unnamed: 10"]) : 0.4;
  const totalUnit = isNum(r["Unnamed: 11"]) ? Number(r["Unnamed: 11"]) : null;
  
  if (!supportCost || supportCost <= 0) {
    console.warn(`Skipping line with invalid support cost: ${flex} - ${productType} - ${model}`);
    continue;
  }
  
  const productKey = `${productType}_BASIC`;
  const materialName = `${productType.charAt(0) + productType.slice(1).toLowerCase()} ${model || "base"} (branca)`;
  
  // Printing formatLabel baseado no método
  const printingFormatLabel = `${printMethod}_UNIT`;
  
  // Se productionCost existe, pode ser o custo de impressão por peça ou aplicação
  // Vamos usar totalPrintCost como PrintingCustomerPrice e productionCost - totalPrintCost como FinishCustomerPrice (aplicação)
  const applicationCost = productionCost && totalPrintCost ? (productionCost - totalPrintCost) : 0;
  
  const item: any = {
    customer: { name: flex },
    productKey,
    material: {
      name: materialName,
      unit: "UNIT",
      unitCost: dec4(supportCost),
    },
    printing: {
      technology: "DIGITAL",
      formatLabel: printingFormatLabel,
      colors: null,
      sides: 1,
      unitPrice: dec4(totalPrintCost || 0),
    },
    finish: applicationCost > 0 ? {
      name: `Aplicação ${printMethod} (peito)`,
      category: "OUTROS",
      unit: "UNIT",
      calcType: "PER_UNIT",
      baseCost: dec4(applicationCost),
    } : null,
    productOverride: {
      minPricePerPiece: totalUnit ? dec4(totalUnit) : null,
      roundingStep: "0.0500",
      roundingStrategy: "PER_STEP",
      marginDefault: dec4(marginPct),
      markupDefault: "0.2000",
    },
  };
  
  items.push(item);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(items, null, 2));

console.log(JSON.stringify({ count: items.length }));

