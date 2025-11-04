import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";

type RawRow = Record<string, any>;

type Normalized = {
  technology: "DIGITAL" | "GRANDE_FORMATO";
  formatLabel: "A4" | "SRA4" | "A3" | "SRA3" | "33x48" | "BANNER";
  colors: "K" | "CMYK";
  sides: 1 | 2;
  unitPrice: string; // 4 casas
  active: true;
};

const FORMAT_TOKENS = ["A4", "SRA4", "A3", "SRA3", "33x48", "BANNER"] as const;
type FormatToken = typeof FORMAT_TOKENS[number];

function toFixed4(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/\./g, "").replace(",", "."));
  if (!isFinite(n) || n <= 0) return null;
  return n.toFixed(4);
}

function parseFormatToken(text: string): FormatToken | null {
  for (const tok of FORMAT_TOKENS) {
    const re = new RegExp(`(^|[^A-Z0-9])${tok}([^A-Z0-9]|$)`, "i");
    if (re.test(text)) return tok as FormatToken;
  }
  return null;
}

function parseColors(text: string): "K" | "CMYK" | null {
  const t = text.toUpperCase();
  if (/CMYK/.test(t)) return "CMYK";
  if (/(^|\s)K(\s|$)/.test(t)) return "K";
  return null;
}

function parseSides(text: string): 1 | 2 | null {
  const t = text.toUpperCase().replace(/\s+/g, "");
  if (/FRENTE\/VERSO/.test(t) || /FRENTEVERSO/.test(t)) return 2;
  if (/FRENTE/.test(t)) return 1;
  return null;
}

function inferTechnology(format: FormatToken): "DIGITAL" | "GRANDE_FORMATO" {
  return format === "BANNER" ? "GRANDE_FORMATO" : "DIGITAL";
}

function main() {
  const inputPath = path.resolve(process.cwd(), "data", "raw", "impressoes-singulares.json");
  let payload: unknown;
  try {
    payload = JSON.parse(readFileSync(inputPath, "utf-8"));
  } catch (e) {
    console.error("Falha ao ler/parsear impressoes-singulares.json:", e);
    process.exit(1);
  }
  if (!Array.isArray(payload)) {
    console.error("impressoes-singulares.json não é um array");
    process.exit(1);
  }

  const results: Normalized[] = [];
  const seen = new Set<string>();

  for (const row of payload as RawRow[]) {
    const labelRaw = String(row["Unnamed: 0"] ?? "").trim();
    const priceRaw = row["Unnamed: 1"];
    if (!labelRaw) continue;

    const formatToken = parseFormatToken(labelRaw);
    if (!formatToken) continue;

    const colors = parseColors(labelRaw);
    const sides = parseSides(labelRaw);
    const unitPrice = toFixed4(priceRaw);
    if (!colors || !sides || !unitPrice) continue;

    const technology = inferTechnology(formatToken);
    const key = `${technology}|${formatToken}|${colors}|${sides}`.toUpperCase();
    const obj: Normalized = {
      technology,
      formatLabel: formatToken,
      colors,
      sides,
      unitPrice,
      active: true,
    };

    // dedup (última vence)
    if (seen.has(key)) {
      const idx = results.findIndex(r => `${r.technology}|${r.formatLabel}|${r.colors}|${r.sides}`.toUpperCase() === key);
      if (idx >= 0) results[idx] = obj;
    } else {
      results.push(obj);
      seen.add(key);
    }
  }

  const outDir = path.resolve(process.cwd(), "data", "normalized");
  mkdirSync(outDir, { recursive: true });
  const outPath = path.resolve(outDir, "printing-single.json");
  writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(JSON.stringify({ count: results.length }));
}

if (require.main === module) {
  main();
}


