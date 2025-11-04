import fs from "fs";
import path from "path";

const rawPath = path.resolve(process.cwd(), "data/raw/cartoes-pvc.json");
const outPath = path.resolve(process.cwd(), "data/normalized/products.cards.pvc.json");

function dec4(v: number | string | null | undefined): string {
  if (v == null || v === "") return "0.0000";
  const n = typeof v === "string" ? Number(String(v).replace(",", ".")) : Number(v);
  return (isFinite(n) ? n : 0).toFixed(4);
}

function isNum(x: any): boolean {
  const n = Number(x);
  return Number.isFinite(n);
}

(() => {
  const rows = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

  // Materials
  const materials: any[] = [];
  // Printings (derive from rows with CARTUXO and unit price in Unnamed:7)
  const printingsMap = new Map<string, any>();
  // Suggested quantities from client section
  const suggestedSet = new Set<number>();

  for (const r of rows) {
    const tipo = (r["CARTÃO"] ?? "").toString().trim();
    const cartuxo = (r["CARTUXO"] ?? "").toString().trim();

    // Materials section: lines with material types and unit cost in Unnamed:2
    if (tipo && tipo !== "TIPO" && tipo.toUpperCase() !== "CLIENTE" && tipo.toUpperCase() !== "CUSTO PRODUÇÃO") {
      const unitCost = isNum(r["Unnamed: 2"]) ? Number(r["Unnamed: 2"]) : null;
      const isHeaderish = (r["Unnamed: 2"] === "CUSTO\nUNITÁRIO");
      if (!isHeaderish) {
        const active = unitCost != null && unitCost > 0;
        materials.push({
          name: tipo,
          type: "pvc",
          unit: "UNIT",
          unitCost: dec4(unitCost),
          active,
        });
      }
    }

    // Printing rows: have CARTUXO color (CMYK or K) and cost per unit in Unnamed:7
    if (cartuxo && (/(CMYK|K)/i).test(cartuxo) && isNum(r["Unnamed: 7"])) {
      const color = cartuxo.toUpperCase().includes("CMYK") ? "CMYK" : "K";
      const unitPrice = dec4(r["Unnamed: 7"]);
      for (const sides of [1, 2]) {
        const key = `${color}_${sides}`;
        if (!printingsMap.has(key)) {
          printingsMap.set(key, {
            technology: "DIGITAL",
            formatLabel: "PVC_CARD",
            colors: color,
            sides,
            unitPrice,
            setupMode: "FLAT",
            setupFlatFee: "0.00",
            minFee: "0.00",
            lossFactor: "0.0300",
            active: true,
          });
        }
      }
    }

    // Suggested quantities: from CLIENTE section, Unnamed:2 numeric
    if (tipo.toUpperCase() === "CLIENTE") continue;
    if ((r["Unnamed: 1"] || "").toString().toUpperCase().includes("IMPRESSÃO")) {
      const q = Number(r["Unnamed: 2"]);
      if (Number.isFinite(q) && q > 0) suggestedSet.add(q);
    }
  }

  // Build products: for each active material, create 4/0 and 4/4 variants
  const products: any[] = [];
  const suggested = Array.from(suggestedSet).sort((a, b) => a - b);

  const printingCMYK1 = printingsMap.get("CMYK_1");
  const printingCMYK2 = printingsMap.get("CMYK_2");

  for (const m of materials) {
    const base = {
      widthMm: 85,
      heightMm: 54,
      roundingStep: "0.0500",
      roundingStrategy: "PER_STEP",
      pricingStrategy: "COST_MARKUP_MARGIN",
      markupDefault: "0.2000",
      marginDefault: "0.3000",
      minOrderQty: 1,
      minOrderValue: null,
      finishes: [] as any[],
      suggested,
      active: m.active,
      materials: [
        { name: m.name, type: "pvc", unit: "UNIT", unitCost: m.unitCost, qtyPerUnit: "1.0000" },
      ],
    };

    // 4/0
    products.push({
      name: `Cartão PVC ${m.name} — 4/0`,
      ...base,
      printing: printingCMYK1 || {
        technology: "DIGITAL",
        formatLabel: "PVC_CARD",
        colors: "CMYK",
        sides: 1,
        unitPrice: "0.0000",
        setupMode: "FLAT",
        setupFlatFee: "0.00",
        minFee: "0.00",
        lossFactor: "0.0300",
      },
    });

    // 4/4
    products.push({
      name: `Cartão PVC ${m.name} — 4/4`,
      ...base,
      printing: printingCMYK2 || {
        technology: "DIGITAL",
        formatLabel: "PVC_CARD",
        colors: "CMYK",
        sides: 2,
        unitPrice: "0.0000",
        setupMode: "FLAT",
        setupFlatFee: "0.00",
        minFee: "0.00",
        lossFactor: "0.0300",
      },
    });
  }

  const out = {
    printings: Array.from(printingsMap.values()),
    materials,
    products,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(JSON.stringify({ printings: out.printings.length, materials: out.materials.length, products: out.products.length }));
})();
