import fs from "fs";
import path from "path";

type AnyRow = Record<string, any>;

const SRC = path.join(process.cwd(), "data/raw/acabamento.json");
const OUT = path.join(process.cwd(), "data/normalized/finishes.json");

function readJSON<T = any>(p: string): T { return JSON.parse(fs.readFileSync(p, "utf8")); }
function ensureDir(p: string) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function isNum(x: any): boolean { const n = Number(x); return Number.isFinite(n); }
function dec4s(n: any): string { return (Number(n ?? 0)).toFixed(4); }
function dec2s(n: any): string { return (Number(n ?? 0)).toFixed(2); }

type FinishOut = {
  name: string;
  category: "LAMINACAO"|"VERNIZ"|"CORTE"|"DOBRA"|"OUTROS";
  unit: "UNIT"|"M2"|"LOT"|"HOUR";
  calcType: "PER_UNIT"|"PER_M2"|"PER_LOT"|"PER_HOUR";
  baseCost: string;
  minFee?: string | null;
  areaStepM2?: string | null;
  minPerPiece?: string | null;
  lossFactor?: string | null;
  active: boolean;
  notes?: any;
};

function pushOrDedup(arr: FinishOut[], item: FinishOut) {
  const idx = arr.findIndex(x => x.name.toLowerCase() === item.name.toLowerCase());
  if (idx === -1) { arr.push(item); return; }
  // keep smallest baseCost
  const prev = arr[idx];
  if (Number(item.baseCost) < Number(prev.baseCost)) arr[idx] = item;
}

function main() {
  if (!fs.existsSync(SRC)) throw new Error(`Arquivo não encontrado: ${SRC}`);
  const rows: AnyRow[] = readJSON(SRC);
  const out: FinishOut[] = [];

  // 1) CORTE: rows where column "CUSTO DE CORTE" matches labels
  const labels = ["NORMAL", "A5", "A4", "A3", "CARTÃO", "CARTAO"]; // handle no-tilde
  for (const r of rows) {
    const label = String(r["CUSTO DE CORTE"] ?? "").trim();
    if (!label) continue;
    const match = labels.find(l => label.toLowerCase().includes(l.toLowerCase()));
    if (!match) continue;
    const price = r["Unnamed: 1"]; if (!isNum(price)) continue;
    const name = `Corte ${match === "CARTAO" ? "CARTÃO" : match}`;
    pushOrDedup(out, {
      name,
      category: "CORTE",
      unit: "UNIT",
      calcType: "PER_UNIT",
      baseCost: dec4s(price),
      active: true,
    });
  }

  // 2) Corte com dobra
  const withFold = rows.find(r => String(r["CUSTO DE CORTE"] ?? "").toLowerCase().includes("com dobra"));
  if (withFold) {
    const unit = isNum(withFold["Unnamed: 1"]) ? Number(withFold["Unnamed: 1"]) : 0.07;
    const qty = isNum(withFold["Unnamed: 2"]) ? Number(withFold["Unnamed: 2"]) : 110;
    const minFee = unit * qty;
    pushOrDedup(out, {
      name: "Corte com dobra",
      category: "DOBRA",
      unit: "UNIT",
      calcType: "PER_UNIT",
      baseCost: dec4s(unit),
      minFee: dec2s(minFee),
      active: true,
    });
  }

  // 3) Plastificação (face) tiers base
  pushOrDedup(out, {
    name: "Plastificação (face)",
    category: "LAMINACAO",
    unit: "UNIT",
    calcType: "PER_UNIT",
    baseCost: dec4s(0.34),
    active: true,
    notes: { "<100": 0.50, "<500": 0.34, ">500": 0.17 },
  });

  // 3b) Específicos cartões 1F/2F
  pushOrDedup(out, { name: "Plastificação Cartão 1F", category: "LAMINACAO", unit: "UNIT", calcType: "PER_UNIT", baseCost: dec4s(0.16), active: true });
  pushOrDedup(out, { name: "Plastificação Cartão 2F", category: "LAMINACAO", unit: "UNIT", calcType: "PER_UNIT", baseCost: dec4s(0.32), active: true });

  // 4) Laminação Dourada/Prateada
  pushOrDedup(out, {
    name: "Laminação Dourada/Prateada",
    category: "LAMINACAO",
    unit: "UNIT",
    calcType: "PER_UNIT",
    baseCost: dec4s(0.85),
    active: true,
    notes: { "<100": 1.25, "<500": 0.85, ">500": 0.50 },
  });

  // 5) Dobra Quadrada A4
  pushOrDedup(out, {
    name: "Dobra Quadrada A4",
    category: "DOBRA",
    unit: "UNIT",
    calcType: "PER_UNIT",
    baseCost: dec4s(0.35),
    active: true,
    notes: { tiers: [0.50, 0.35, 0.15] },
  });

  // 6) Cola na Lombada A4
  pushOrDedup(out, {
    name: "Cola na Lombada A4",
    category: "DOBRA",
    unit: "UNIT",
    calcType: "PER_UNIT",
    baseCost: dec4s(0.35),
    minFee: dec2s(50.00),
    active: true,
    notes: { "<100": 0.50, "<500": 0.35, ">500": 0.15, passesQty: 100, minTotal: 50 },
  });

  // 7) Agrafos
  const agRow = rows.find(r => String(r["CUSTO DE AGRAFO"] ?? "").length > 0 || String(r["AGRAFO"] ?? "").length > 0);
  pushOrDedup(out, {
    name: "Agrafos",
    category: "OUTROS",
    unit: "UNIT",
    calcType: "PER_UNIT",
    baseCost: dec4s(0.01023),
    active: true,
  });

  ensureDir(path.dirname(OUT));
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2), "utf8");
  console.log(JSON.stringify({ count: out.length }));
}

main();


