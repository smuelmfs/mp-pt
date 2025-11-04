import fs from "fs";
import path from "path";

type AnyRow = Record<string, any>;

function readJSON<T = any>(p: string): T {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function toDec4(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return v.toFixed(4);
}

function toDec2(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return v.toFixed(2);
}

function isNumeric(x: any): boolean {
  if (x === null || x === undefined) return false;
  const n = Number(x);
  return Number.isFinite(n);
}

function extractDimsFromName(name: string): { widthMm: number | null; heightMm: number | null; label: string } {
  // Accept patterns like "3050x1220x3mm" or "3050x1220" (mm assumed)
  const re = /(\d{2,5})\s*x\s*(\d{2,5})(?:\s*x\s*\d{1,4}\s*mm)?/i;
  const m = name.match(re);
  if (m) {
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (Number.isFinite(w) && Number.isFinite(h)) {
      return { widthMm: w, heightMm: h, label: `${w}x${h}` };
    }
  }
  return { widthMm: null, heightMm: null, label: name };
}

function normalizePrinting(rows: AnyRow[]) {
  // Find row where "Preço" contains "Impressão UV (m2)" and numeric price in "Unnamed: 2"
  const row = rows.find(r => {
    const precoCell = String(r["Preço"] ?? "").toLowerCase();
    return precoCell.includes("impressão uv (m2)") || precoCell.includes("impressao uv (m2)");
  });
  if (!row) throw new Error("Linha 'Impressão UV (m2)' não encontrada em data/raw/impressao-uv.json");
  const priceCell = row["Unnamed: 2"];
  if (!isNumeric(priceCell)) throw new Error("Preço numérico não encontrado em coluna 'Unnamed: 2' para 'Impressão UV (m2)'");

  const unitPrice = toDec4(priceCell);
  return [
    {
      technology: "UV",
      formatLabel: "PLANO_M2",
      colors: null,
      sides: 1,
      unitPrice,
      yield: null,
      setupMode: "FLAT",
      setupFlatFee: toDec2(0),
      minFee: toDec2(0),
      lossFactor: toDec4(0.03),
      active: true,
    },
  ];
}

function normalizeMaterials(rows: AnyRow[]) {
  const OUT: any[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const nameRaw = r["CALCULO \nsuporte imp."] ?? r["CALCULO suporte imp."] ?? r["CALCULO suporte imp"];
    const priceRaw = r["preço.1"] ?? r["preco.1"] ?? r["preço1"];
    if (!nameRaw || typeof nameRaw !== "string") continue;
    if (!isNumeric(priceRaw)) continue;

    const name = String(nameRaw).trim();
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const unitCost = toDec4(priceRaw);
    const dims = extractDimsFromName(name);
    const variant = {
      label: dims.label,
      widthMm: dims.widthMm,
      heightMm: dims.heightMm,
    };

    OUT.push({
      name,
      type: "placa",
      unit: "SHEET",
      unitCost,
      variant,
      active: true,
    });
  }
  return OUT;
}

async function main() {
  const rawPath = path.join(process.cwd(), "data/raw/impressao-uv.json");
  if (!fs.existsSync(rawPath)) throw new Error(`Arquivo não encontrado: ${rawPath}`);
  const rows: AnyRow[] = readJSON(rawPath);

  const printing = normalizePrinting(rows);
  const materials = normalizeMaterials(rows);

  const outDir = path.join(process.cwd(), "data/normalized");
  ensureDir(outDir);

  const printingPath = path.join(outDir, "printing-uv.json");
  const materialsPath = path.join(outDir, "materials.uv-substrates.json");

  fs.writeFileSync(printingPath, JSON.stringify(printing, null, 2), "utf8");
  fs.writeFileSync(materialsPath, JSON.stringify(materials, null, 2), "utf8");

  console.log(JSON.stringify({ printing: { count: printing.length }, materials: { count: materials.length } }));
}

main().catch(err => {
  console.error(err.message || String(err));
  process.exit(1);
});


