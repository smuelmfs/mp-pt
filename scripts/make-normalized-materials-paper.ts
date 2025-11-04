import fs from "fs";
import path from "path";

type AnyRow = Record<string, any>;

const SRC = path.join(process.cwd(), "data/raw/papel.json");
const OUT = path.join(process.cwd(), "data/normalized/materials.paper.json");

function readJSON<T = any>(p: string): T { return JSON.parse(fs.readFileSync(p, "utf8")); }
function ensureDir(p: string) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function collapseSpaces(s: string): string { return s.replace(/\s+/g, " ").trim(); }
function toDec4(n: number | string): string { return Number(n).toFixed(4); }
function toDec2(n: number | string): string { return Number(n).toFixed(2); }
function isNumeric(x: any): boolean { const n = Number(x); return Number.isFinite(n); }

function parseGrammage(raw: any): { grammage: number | null; rawGrammage: string | null; notes: string | null } {
  if (raw == null) return { grammage: null, rawGrammage: null, notes: null };
  const txt = String(raw);
  const m = txt.match(/(\d{2,4})\s*(g|gr|gr\.|gram|gramas)?/i);
  const grammage = m ? Number(m[1]) : null;
  const rawGrammage = grammage == null ? collapseSpaces(txt) : null;
  const notes = collapseSpaces(txt);
  return { grammage, rawGrammage, notes };
}

function normalize(rows: AnyRow[]) {
  const out: any[] = [];
  const dedup = new Set<string>();
  for (const r of rows) {
    const supplier = r["1"] != null ? collapseSpaces(String(r["1"])) : null;
    const brand = r["MARCA"] != null ? collapseSpaces(String(r["MARCA"])) : null;
    const finish = r["GLOSS / SILK"] != null ? collapseSpaces(String(r["GLOSS / SILK"])) : null;
    const gramRaw = r["GRAMAGEM\nPAPEL"] ?? r["GRAMAGEM PAPEL"] ?? r["GRAMAGEM"];
    const { grammage, rawGrammage, notes } = parseGrammage(gramRaw);
    const qtyPack = isNumeric(r["QUANTIDADE"]) ? Number(r["QUANTIDADE"]) : null;
    const packPrice = isNumeric(r["PREÇO"]) ? toDec2(r["PREÇO"]) : null;
    const unitPriceSheetRaw = r["PREÇO / FOLHA"]; // might be string with commas? assume numeric already
    if (!isNumeric(unitPriceSheetRaw)) continue;
    const unitNum = Number(unitPriceSheetRaw);
    if (!(unitNum > 0)) continue;
    const unitPriceSheet = toDec4(unitNum);

    const key = [brand ?? "", finish ?? "", String(grammage ?? rawGrammage ?? ""), unitPriceSheet].map(s => String(s).toLowerCase()).join("||");
    if (dedup.has(key)) continue;
    dedup.add(key);

    out.push({
      supplier,
      brand,
      finish,
      grammage,
      rawGrammage,
      qtyPack,
      packPrice,
      unitPriceSheet,
      notes,
    });
  }
  return out;
}

function main() {
  if (!fs.existsSync(SRC)) throw new Error(`Arquivo não encontrado: ${SRC}`);
  const rows = readJSON<AnyRow[]>(SRC);
  const data = normalize(rows);
  ensureDir(path.dirname(OUT));
  fs.writeFileSync(OUT, JSON.stringify(data, null, 2), "utf8");
  console.log(JSON.stringify({ count: data.length }));
}

main();


