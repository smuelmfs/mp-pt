import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface MarginPattern {
  sheetName: string;
  category?: string;
  productName?: string;
  marginPercent: number;
  quantity?: number;
  minSubtotal?: number;
  unitPrice?: number;
}

function normalizeMargin(value: any): number | null {
  if (!value) return null;
  const str = String(value).replace(/[€\s%]/g, "").replace(",", ".");
  const num = Number(str);
  if (isNaN(num)) return null;
  
  if (num > 1 && num <= 10) {
    return num / 100;
  } else if (num > 10) {
    return num / 100;
  }
  return num;
}

function normalizeProductName(name: string): string {
  return name
    .replace(/\n/g, " ")
    .replace(/\\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function analyzeSheet(sheetName: string, category?: string): MarginPattern[] {
  if (!fs.existsSync(EXCEL_PATH)) return [];

  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes(sheetName)) return [];

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const patterns: MarginPattern[] = [];
  
  // Encontrar colunas
  let headerRow = -1;
  const colMap: Record<string, number> = {};

  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toUpperCase().trim();
      
      if (cell.includes("% LUCRO") || cell.includes("LUCRO") || cell.includes("MARGEM")) {
        colMap.margin = j;
        if (headerRow === -1) headerRow = i;
      }
      if (cell.includes("TIPO") || cell.includes("PRODUTO") || cell.includes("DESCRIÇÃO") || 
          cell.includes("CARACTERÍSTICAS") || cell.includes("FORMATO")) {
        colMap.product = j;
        if (headerRow === -1) headerRow = i;
      }
      if (cell.includes("QUANT") || cell.includes("QTD") || cell.includes("QUANTIDADE")) {
        colMap.quantity = j;
      }
      if (cell.includes("TOTAL") || cell.includes("SUBTOTAL") || cell.includes("CUSTO TOTAL") ||
          cell.includes("TOTAL UNITÁRIO")) {
        colMap.subtotal = j;
      }
      if (cell.includes("UNIT") || cell.includes("UNITÁRIO") || cell.includes("PREÇO")) {
        colMap.unitPrice = j;
      }
    }

    if (colMap.margin !== undefined && headerRow !== -1) break;
  }

  if (headerRow === -1 || colMap.margin === undefined) return [];

  // Extrair padrões
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const margin = normalizeMargin(row[colMap.margin]);
    if (margin === null) continue;

    const productName = colMap.product !== undefined 
      ? normalizeProductName(String(row[colMap.product] || ""))
      : undefined;

    const quantity = colMap.quantity !== undefined
      ? Number(String(row[colMap.quantity] || "").replace(/[^\d.,]/g, "").replace(",", ".")) || undefined
      : undefined;

    const subtotal = colMap.subtotal !== undefined
      ? Number(String(row[colMap.subtotal] || "").replace(/[€\s,]/g, "").replace(",", ".")) || undefined
      : undefined;

    const unitPrice = colMap.unitPrice !== undefined
      ? Number(String(row[colMap.unitPrice] || "").replace(/[€\s,]/g, "").replace(",", ".")) || undefined
      : undefined;

    patterns.push({
      sheetName,
      category: category || undefined,
      productName,
      marginPercent: margin,
      quantity,
      minSubtotal: subtotal,
      unitPrice
    });
  }

  return patterns;
}

function identifyDynamicPatterns(patterns: MarginPattern[]): {
  byProduct: Map<string, MarginPattern[]>;
  byCategory: Map<string, MarginPattern[]>;
  dynamicRules: Array<{
    type: "PRODUCT" | "CATEGORY";
    target: string;
    baseMargin: number;
    adjustments: Array<{ condition: string; adjustPercent: number; minQty?: number; minSubtotal?: number }>;
  }>;
} {
  const byProduct = new Map<string, MarginPattern[]>();
  const byCategory = new Map<string, MarginPattern[]>();

  // Agrupar por produto
  for (const p of patterns) {
    if (p.productName) {
      const key = p.productName;
      if (!byProduct.has(key)) {
        byProduct.set(key, []);
      }
      byProduct.get(key)!.push(p);
    }

    if (p.category) {
      const key = p.category;
      if (!byCategory.has(key)) {
        byCategory.set(key, []);
      }
      byCategory.get(key)!.push(p);
    }
  }

  // Identificar padrões dinâmicos
  const dynamicRules: Array<{
    type: "PRODUCT" | "CATEGORY";
    target: string;
    baseMargin: number;
    adjustments: Array<{ condition: string; adjustPercent: number; minQty?: number; minSubtotal?: number }>;
  }> = [];

  // Por produto
  for (const [product, ps] of byProduct.entries()) {
    if (ps.length <= 1) continue;

    // Agrupar por margem
    const byMargin = new Map<number, MarginPattern[]>();
    for (const p of ps) {
      const key = Math.round(p.marginPercent * 10000) / 10000; // Arredondar para 4 casas
      if (!byMargin.has(key)) {
        byMargin.set(key, []);
      }
      byMargin.get(key)!.push(p);
    }

    if (byMargin.size > 1) {
      // Múltiplas margens = possível margem dinâmica
      const margins = Array.from(byMargin.keys()).sort((a, b) => a - b);
      const baseMargin = margins[0];
      const adjustments: Array<{ condition: string; adjustPercent: number; minQty?: number; minSubtotal?: number }> = [];

      for (let i = 1; i < margins.length; i++) {
        const margin = margins[i];
        const adjustPercent = margin - baseMargin;
        const patternsWithMargin = byMargin.get(margin)!;

        // Encontrar condição comum
        const quantities = patternsWithMargin.map(p => p.quantity).filter(q => q !== undefined);
        const subtotals = patternsWithMargin.map(p => p.minSubtotal).filter(s => s !== undefined);

        if (quantities.length > 0) {
          const minQty = Math.min(...quantities);
          adjustments.push({
            condition: `Qtd >= ${minQty}`,
            adjustPercent,
            minQty
          });
        } else if (subtotals.length > 0) {
          const minSubtotal = Math.min(...subtotals);
          adjustments.push({
            condition: `Subtotal >= €${minSubtotal.toFixed(2)}`,
            adjustPercent,
            minSubtotal
          });
        }
      }

      if (adjustments.length > 0) {
        dynamicRules.push({
          type: "PRODUCT",
          target: product,
          baseMargin,
          adjustments
        });
      }
    }
  }

  // Por categoria
  for (const [category, ps] of byCategory.entries()) {
    if (ps.length <= 1) continue;

    const byMargin = new Map<number, MarginPattern[]>();
    for (const p of ps) {
      const key = Math.round(p.marginPercent * 10000) / 10000;
      if (!byMargin.has(key)) {
        byMargin.set(key, []);
      }
      byMargin.get(key)!.push(p);
    }

    if (byMargin.size > 1) {
      const margins = Array.from(byMargin.keys()).sort((a, b) => a - b);
      const baseMargin = margins[0];
      const adjustments: Array<{ condition: string; adjustPercent: number; minQty?: number; minSubtotal?: number }> = [];

      for (let i = 1; i < margins.length; i++) {
        const margin = margins[i];
        const adjustPercent = margin - baseMargin;
        const patternsWithMargin = byMargin.get(margin)!;

        const quantities = patternsWithMargin.map(p => p.quantity).filter(q => q !== undefined);
        const subtotals = patternsWithMargin.map(p => p.minSubtotal).filter(s => s !== undefined);

        if (quantities.length > 0) {
          const minQty = Math.min(...quantities);
          adjustments.push({
            condition: `Qtd >= ${minQty}`,
            adjustPercent,
            minQty
          });
        } else if (subtotals.length > 0) {
          const minSubtotal = Math.min(...subtotals);
          adjustments.push({
            condition: `Subtotal >= €${minSubtotal.toFixed(2)}`,
            adjustPercent,
            minSubtotal
          });
        }
      }

      if (adjustments.length > 0) {
        dynamicRules.push({
          type: "CATEGORY",
          target: category,
          baseMargin,
          adjustments
        });
      }
    }
  }

  return { byProduct, byCategory, dynamicRules };
}

function main() {
  console.log("=".repeat(120));
  console.log("📊 Análise Detalhada de Margens Dinâmicas");
  console.log("=".repeat(120));
  console.log();

  const allPatterns: MarginPattern[] = [];

  // Analisar abas principais
  const sheets = [
    { name: "ENVELOPES", category: "Papelaria" },
    { name: "PASTAS PARA A4", category: "Pastas A4" },
    { name: "VINIL", category: "Grande Formato — Flex/Postes/Tendas" },
    { name: "ALVEOLAR", category: "Placas rígidas" },
    { name: "FLEX", category: "Grande Formato — Flex/Postes/Tendas" },
    { name: "CARTOES PVC", category: "Cartões PVC" },
    { name: "CARTÕES DE VISITA", category: "Papelaria" },
  ];

  for (const { name, category } of sheets) {
    console.log(`📋 Analisando: ${name}...`);
    const patterns = analyzeSheet(name, category);
    allPatterns.push(...patterns);
    console.log(`  ✅ ${patterns.length} padrões encontrados`);
  }

  console.log(`\n📊 Total de padrões: ${allPatterns.length}`);

  // Identificar padrões dinâmicos
  const { dynamicRules } = identifyDynamicPatterns(allPatterns);

  console.log("\n" + "=".repeat(120));
  console.log("🔄 MARGENS DINÂMICAS IDENTIFICADAS:");
  console.log("=".repeat(120));

  if (dynamicRules.length === 0) {
    console.log("\n⚠️  Nenhuma margem dinâmica clara identificada.");
    console.log("   (Margens podem variar por produto, mas não por quantidade/valor)");
  } else {
    for (const rule of dynamicRules) {
      console.log(`\n${rule.type}: ${rule.target}`);
      console.log(`  Margem base: ${(rule.baseMargin * 100).toFixed(0)}%`);
      console.log(`  Ajustes:`);
      for (const adj of rule.adjustments) {
        console.log(`    - ${adj.condition}: ${(adj.adjustPercent * 100).toFixed(0)}%`);
      }
    }
  }

  // Salvar resultados
  const outputPath = path.resolve(process.cwd(), "data", "dynamic-margins-analysis.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify({
    patterns: allPatterns,
    dynamicRules
  }, null, 2), "utf-8");
  console.log(`\n✅ Análise salva em: ${outputPath}`);

  return { patterns: allPatterns, dynamicRules };
}

main();

