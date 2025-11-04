import { readFileSync, writeFileSync } from "fs";
import path from "path";

type Raw = Record<string, any>;

function dec4(v: number|string|null|undefined): string {
  if (v == null || v === "") return "0.0000";
  const n = typeof v === "string" ? Number(String(v).replace(",", ".")) : Number(v);
  return (isFinite(n) ? n : 0).toFixed(4);
}

function normType(s: string | null | undefined) {
  const t = (s ?? "").toString().trim().toUpperCase();
  if (!t) return null;
  if (t.includes("S JANELA")) return "S_JANELA";
  if (t.includes("JANELA"))   return "JANELA";
  return t;
}

(() => {
  const rawPath = path.resolve(process.cwd(), "data", "raw", "envelopes.json");
  const outPath = path.resolve(process.cwd(), "data", "normalized", "envelopes.json");
  const data: Raw[] = JSON.parse(readFileSync(rawPath, "utf-8"));

  // 1) Printing DL
  let unitPriceDL: number | null = null;
  for (const r of data) {
    const imp = (r["IMPRESSÃO"] ?? "").toString().toUpperCase().trim();
    if (imp.includes("IMPRESSÃO DL")) {
      const v = r["Unnamed: 1"];
      if (v != null && v !== "") {
        const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
        if (isFinite(n)) unitPriceDL = n;
      }
      break;
    }
  }
  if (unitPriceDL == null) unitPriceDL = 0;

  // 2) Itens de envelope (formato + tipo + custo unitário)
  type Item = { name: string; format: string; type: "JANELA"|"S_JANELA"; unitCost: string };
  const itemsMap = new Map<string, Item>();

  for (const r of data) {
    const formatRaw = r["ENVELOPES"];
    // Skip if ENVELOPES is a number (not a format string like "DL 90")
    if (typeof formatRaw === "number") continue;
    const format = (formatRaw ?? "").toString().trim(); // ex.: "DL 90" ou "DL 120"
    if (!format) continue;

    const typeS = normType(r["Unnamed: 4"]);
    // Only process if type is JANELA or S_JANELA, skip numeric or other types
    if (!typeS || (typeS !== "JANELA" && typeS !== "S_JANELA")) continue;

    // Preferir "CUSTO UNITÁRIO" se presente; senão derivar total/quant
    let unitCost: number | null = null;
    const maybeUnit = r["Unnamed: 7"];
    if (maybeUnit != null && maybeUnit !== "") {
      unitCost = typeof maybeUnit === "string" ? Number(maybeUnit.replace(",", ".")) : Number(maybeUnit);
    }
    if (!isFinite(unitCost as number)) {
      const total = r["Unnamed: 5"];
      const qty   = r["Unnamed: 6"];
      const tot = typeof total === "string" ? Number(total.replace(",", ".")) : Number(total);
      const qn  = typeof qty   === "string" ? Number(qty.replace(",", "."))   : Number(qty);
      if (isFinite(tot) && isFinite(qn) && qn > 0) unitCost = tot / qn;
    }

    if (!isFinite(unitCost as number)) continue;

    const name = `Envelope ${format} - ${typeS === "JANELA" ? "Janela" : "Sem Janela"}`;
    const key = `${format}__${typeS}`;
    const current = itemsMap.get(key);
    const uc = Number(unitCost);
    if (!current || uc < Number(current.unitCost)) {
      itemsMap.set(key, { name, format, type: typeS as any, unitCost: dec4(uc) });
    }
  }

  const items = [...itemsMap.values()];

  const normalized = {
    printing: {
      technology: "DIGITAL",
      formatLabel: "DL",
      colors: null,
      sides: 1,
      unitPrice: dec4(unitPriceDL),
      yield: null,
      setupMode: "FLAT",
      setupFlatFee: "0.00",
      minFee: "0.00",
      lossFactor: "0.0300",
      active: true
    },
    items,
    suggestedQuantities: [50,100,200,250,500,1000]
  };

  writeFileSync(outPath, JSON.stringify(normalized, null, 2));
  console.log(JSON.stringify({ count: items.length }));
})();

