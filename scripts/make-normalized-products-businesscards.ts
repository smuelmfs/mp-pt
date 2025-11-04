import fs from "fs";
import path from "path";

type AnyRow = Record<string, any>;

const SRC = path.join(process.cwd(), "data/raw/cartoes-de-visita.json");
const OUT = path.join(process.cwd(), "data/normalized/products.businesscards.json");

function readJSON<T = any>(p: string): T { return JSON.parse(fs.readFileSync(p, "utf8")); }
function ensureDir(p: string) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function isNum(x: any): boolean { const n = Number(x); return Number.isFinite(n) && n > 0; }
function dec2s(n: any): string { return (Number(n ?? 0)).toFixed(2); }
function dec4s(n: any): string { return (Number(n ?? 0)).toFixed(4); }

type ProductOut = {
  name: string;
  format: string;
  widthMm: number;
  heightMm: number;
  printing: {
    technology: "DIGITAL";
    colors: string;
    unitPrice: string;
    sides: number;
    yield: null;
  };
  finishes: Array<{ name: string; active?: boolean; baseCost: string }>;
  suggested: number[];
  totals: { qty: number; total: string; unit: string };
};

function detectBlockType(label: any): string | null {
  if (typeof label !== "string") return null;
  const l = label.toLowerCase().trim();
  if (l === "simples") return "SIMPLES";
  if (l.includes("plastificação") && l.includes("foil") && (l.includes("2") || l.includes("duas"))) return "PLASTIFICAÇÃO + FOIL 2 FACES";
  if (l.includes("plastificação") && l.includes("foil")) return "PLASTIFICAÇÃO + FOIL 1 FACE";
  if (l === "plastificação") return "PLASTIFICAÇÃO";
  return null;
}

function main() {
  if (!fs.existsSync(SRC)) throw new Error(`Arquivo não encontrado: ${SRC}`);
  const rows: AnyRow[] = readJSON(SRC);
  const byName = new Map<string, ProductOut>();
  let currentBlock: string | null = null;

  for (const r of rows) {
    const label = r["QUANTIDADE\nATÉ (X) Unid."];
    
    // Check if this row indicates a block type
    const block = detectBlockType(label);
    if (block) {
      currentBlock = block;
    }

    // Skip if not in a block
    if (!currentBlock) continue;

    // Check if this row has quantity data (Unnamed: 3 is a number)
    const qty = Number(r["Unnamed: 3"] ?? 0);
    if (!isNum(qty)) continue;

    // Extract values
    const total = r["Unnamed: 9"];  // Total cost
    const unit = r["Unnamed: 10"];  // Unit price
    if (!isNum(total) || !isNum(unit)) continue;

    // Extract costs
    const costPrinting = r["CORTE"];
    const costPlast = r["PLASTIFICAÇÃO"];
    // For FOIL blocks, cost is in Unnamed: 8
    const costFoil = isNum(r["FOIL"]) ? r["FOIL"] : (isNum(r["Unnamed: 8"]) ? r["Unnamed: 8"] : (isNum(r["Unnamed: 12"]) ? r["Unnamed: 12"] : null));

    const name = currentBlock === "SIMPLES" ? "Cartão de Visita 4x4"
      : currentBlock === "PLASTIFICAÇÃO" ? "Cartão de Visita Plastificado F/V"
      : currentBlock === "PLASTIFICAÇÃO + FOIL 1 FACE" ? "Cartão de Visita Plastificado + Foil 1F"
      : currentBlock === "PLASTIFICAÇÃO + FOIL 2 FACES" ? "Cartão de Visita Plastificado + Foil 2F"
      : null;

    if (!name) continue;

    // Calculate unit prices
    const unitPricePrint = isNum(costPrinting) ? dec4s(Number(costPrinting) / qty) : dec4s(Number(total) / qty);
    
    const finishes: Array<{ name: string; active?: boolean; baseCost: string }> = [];
    if (isNum(costPlast)) {
      finishes.push({ name: "Plastificação (face)", active: true, baseCost: dec4s(Number(costPlast) / qty) });
    }
    if (isNum(costFoil)) {
      const foilName = currentBlock.includes("2") ? "Foil 2F" : "Foil 1F";
      finishes.push({ name: foilName, baseCost: dec4s(Number(costFoil) / qty) });
    }

    let prod = byName.get(name);
    if (!prod) {
      prod = {
        name,
        format: "85x55mm",
        widthMm: 85,
        heightMm: 55,
        printing: {
          technology: "DIGITAL",
          colors: "4x4",
          unitPrice: unitPricePrint,
          sides: 2,
          yield: null,
        },
        finishes,
        suggested: [qty],
        totals: { qty, total: dec2s(total), unit: dec4s(unit) },
      };
      byName.set(name, prod);
    } else {
      if (!prod.suggested.includes(qty)) {
        prod.suggested.push(qty);
      }
      // Update totals to use the latest values
      prod.totals = { qty, total: dec2s(total), unit: dec4s(unit) };
    }
  }

  // Sort suggested quantities
  for (const prod of byName.values()) {
    prod.suggested.sort((a, b) => a - b);
  }

  const result = Array.from(byName.values());
  ensureDir(path.dirname(OUT));
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2), "utf8");
  console.log(JSON.stringify({ count: result.length }));
}

main();
