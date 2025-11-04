import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

type RawRow = {
  [k: string]: any;
};

type NormalizedPrinting = {
  technology: "DIGITAL" | "GRANDE_FORMATO";
  formatLabel: string;
  colors: string;
  unitPrice: string; // 4 casas
  active: boolean;
};

function toFixed4(v: any): string | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."));
  if (!isFinite(n)) return null;
  return n.toFixed(4);
}

function normalizeString(v: any): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function inferTechnology(formatLabel: string): "DIGITAL" | "GRANDE_FORMATO" {
  return /banner/i.test(formatLabel) ? "GRANDE_FORMATO" : "DIGITAL";
}

function main() {
  const rawPath = path.resolve(process.cwd(), "data", "raw", "impressao.json");
  let rows: unknown;
  try {
    rows = JSON.parse(readFileSync(rawPath, "utf-8"));
  } catch (e) {
    console.error("Falha ao ler/parsear data/raw/impressao.json:", e);
    process.exit(1);
  }
  if (!Array.isArray(rows)) {
    console.error("data/raw/impressao.json não é um array");
    process.exit(1);
  }

  const out: NormalizedPrinting[] = [];
  for (const r of rows as RawRow[]) {
    const formatLabel = normalizeString(r["FORMATO IMPRESSÃO"]) || "";
    const colors = normalizeString(r["COR"]) || "";
    const unitPrice = toFixed4(r["PREÇO POR IMPRESSÃO"]);
    if (!formatLabel || !colors || !unitPrice) continue;
    const technology = inferTechnology(formatLabel);
    out.push({
      technology,
      formatLabel,
      colors,
      unitPrice,
      active: true,
    });
  }

  const outDir = path.resolve(process.cwd(), "data", "normalized");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.resolve(outDir, "printing.json");
  writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8");
  console.log(JSON.stringify({ count: out.length }));
}

if (require.main === module) {
  main();
}


