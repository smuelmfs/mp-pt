import fs from "fs";
import path from "path";

const rawPath = path.resolve(process.cwd(), "data/raw/pastas-para-a4.json");
const outPath = path.resolve(process.cwd(), "data/normalized/products.folders.a4.json");

function dec4(v: number | string | null | undefined): string {
  if (v == null || v === "") return "0.0000";
  const n = typeof v === "string" ? Number(String(v).replace(",", ".")) : Number(v);
  return (isFinite(n) ? n : 0).toFixed(4);
}

function isNum(x: any): boolean {
  const n = Number(x);
  return Number.isFinite(n) && n >= 0;
}

const rows = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

// Extrai blocos válidos — ignora cabeçalhos e linhas vazias
const items: any[] = [];

for (const r of rows) {
  if (!isNum(r["Unnamed: 2"])) continue; // só linhas com quantidade
  if (!r["Unnamed: 1"] || typeof r["Unnamed: 1"] !== "string") continue;

  const qty = Number(r["Unnamed: 2"]);
  if (qty <= 0) continue; // skip linhas sem quantidade válida
  
  const name = r["Unnamed: 1"].replace(/\n/g, " ").trim();
  if (!name) continue;
  
  // Skip cabeçalhos
  const nameUpper = name.toUpperCase();
  if (nameUpper.includes("CUSTO") || nameUpper.includes("FORMATO") || nameUpper.includes("QUANT") || nameUpper.includes("UNITÁRIO")) continue;

  const printingUnit = isNum(r["Unnamed: 4"]) ? Number(r["Unnamed: 4"]) : 0;
  const paperUnit = isNum(r["Unnamed: 6"]) ? Number(r["Unnamed: 6"]) : 0;
  const cutCost = isNum(r["CORTE"]) ? Number(r["CORTE"]) : 0;
  const plastCost = isNum(r["Unnamed: 9"]) ? Number(r["Unnamed: 9"]) : 0;
  const foldCost = isNum(r["Unnamed: 11"]) ? Number(r["Unnamed: 11"]) : 0;
  const ferragemCost = isNum(r["Unnamed: 12"]) ? Number(r["Unnamed: 12"]) : 0;
  const bolsaCost = isNum(r["Unnamed: 13"]) ? Number(r["Unnamed: 13"]) : 0;

  items.push({
    name,
    client: r["IMPRESSÃO"]?.toString().trim() || null,
    quantity: qty,
    printing: {
      technology: "DIGITAL",
      formatLabel: "SRA3",
      colors: "4x0",
      sides: 1,
      unitPrice: dec4(printingUnit),
    },
    materials: [
      {
        name: "Papel SRA3 250g",
        unitCost: dec4(paperUnit),
        unit: "SHEET",
      },
    ],
    finishes: [
      { name: "Corte NORMAL", baseCost: dec4(cutCost) },
      { name: "Plastificação (face)", baseCost: dec4(plastCost) },
      { name: "Dobra Quadrada A4", baseCost: dec4(foldCost) },
      { name: "Ferragem", baseCost: dec4(ferragemCost) },
      { name: "Bolsa", baseCost: dec4(bolsaCost) },
    ].filter(f => Number(f.baseCost) > 0),
  });
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(items, null, 2));

console.log(JSON.stringify({ count: items.length }));

