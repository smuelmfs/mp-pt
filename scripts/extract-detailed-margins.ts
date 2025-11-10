import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface DetailedMargin {
  sheetName: string;
  productName?: string;
  category?: string;
  marginPercent: number;
  quantity?: number;
  minSubtotal?: number;
  notes?: string;
}

function normalizeMargin(value: any): number | null {
  if (!value) return null;
  const str = String(value).replace(/[€\s%]/g, "").replace(",", ".");
  const num = Number(str);
  if (isNaN(num)) return null;
  
  // Se o valor for > 1, provavelmente está em percentual (ex: 300 = 300%)
  // Se for < 1, está em decimal (ex: 0.3 = 30%)
  if (num > 1) {
    return num / 100; // Converter 300% para 3.0
  }
  return num;
}

function extractDetailedMargins(): DetailedMargin[] {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const margins: DetailedMargin[] = [];

  // Analisar abas específicas
  const sheetsToAnalyze = [
    { name: "VINIL", category: "Grande Formato — Flex/Postes/Tendas" },
    { name: "ALVEOLAR", category: "Placas rígidas" },
    { name: "ENVELOPES", category: "Papelaria" },
    { name: "PASTAS PARA A4", category: "Pastas A4" },
    { name: "FLEX", category: "Grande Formato — Flex/Postes/Tendas" },
    { name: "CARTOES PVC", category: "Cartões PVC" },
    { name: "CARTÕES DE VISITA", category: "Papelaria" },
  ];

  for (const { name: sheetName, category } of sheetsToAnalyze) {
    if (!workbook.SheetNames.includes(sheetName)) continue;

    console.log(`\n📋 Analisando: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

    // Procurar estrutura de cabeçalho
    let headerRow = -1;
    let productCol = -1;
    let marginCol = -1;
    let quantityCol = -1;
    let subtotalCol = -1;

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;

      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "").toUpperCase().trim();
        if (cell.includes("% LUCRO") || cell.includes("LUCRO") || cell.includes("MARGEM")) {
          marginCol = j;
          if (headerRow === -1) headerRow = i;
        }
        if (cell.includes("TIPO") || cell.includes("PRODUTO") || cell.includes("DESCRIÇÃO") || 
            cell.includes("CARACTERÍSTICAS")) {
          productCol = j;
          if (headerRow === -1) headerRow = i;
        }
        if (cell.includes("QUANT") || cell.includes("QTD") || cell.includes("QUANTIDADE")) {
          quantityCol = j;
        }
        if (cell.includes("TOTAL") || cell.includes("SUBTOTAL") || cell.includes("CUSTO TOTAL")) {
          subtotalCol = j;
        }
      }

      if (marginCol !== -1 && headerRow !== -1) break;
    }

    if (marginCol === -1) {
      console.log(`  ⚠️  Coluna de margem não encontrada`);
      continue;
    }

    // Extrair margens com contexto
    let extracted = 0;
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;

      const marginValue = normalizeMargin(row[marginCol]);
      if (marginValue === null || marginValue === 0) continue;

      const productName = productCol !== -1 ? String(row[productCol] || "").trim() : "";
      const quantity = quantityCol !== -1 ? Number(row[quantityCol]) || undefined : undefined;
      const subtotal = subtotalCol !== -1 ? Number(String(row[subtotalCol]).replace(/[€\s,]/g, "").replace(",", ".")) || undefined : undefined;

      if (!productName && marginValue) {
        // Se não tem nome de produto mas tem margem, pode ser uma regra geral
        margins.push({
          sheetName,
          category,
          marginPercent: marginValue,
          quantity,
          minSubtotal: subtotal,
          notes: "Margem geral da aba"
        });
      } else if (productName) {
        margins.push({
          sheetName,
          productName,
          category,
          marginPercent: marginValue,
          quantity,
          minSubtotal: subtotal
        });
        extracted++;
      }
    }

    console.log(`  ✅ ${extracted} margens com produto encontradas`);
  }

  return margins;
}

function main() {
  console.log("=".repeat(120));
  console.log("📊 Extração Detalhada de Margens");
  console.log("=".repeat(120));

  const margins = extractDetailedMargins();

  console.log("\n" + "=".repeat(120));
  console.log(`📊 Total: ${margins.length} margens extraídas`);

  // Agrupar por produto
  const byProduct = margins.filter(m => m.productName).reduce((acc, m) => {
    const key = m.productName!;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, DetailedMargin[]>);

  console.log(`\n📦 Margens por Produto: ${Object.keys(byProduct).length} produtos únicos`);

  // Mostrar produtos com múltiplas margens (possível margem dinâmica)
  const productsWithMultipleMargins = Object.entries(byProduct).filter(([_, ms]) => ms.length > 1);
  if (productsWithMultipleMargins.length > 0) {
    console.log(`\n🔄 Produtos com múltiplas margens (possível margem dinâmica):`);
    for (const [product, ms] of productsWithMultipleMargins.slice(0, 10)) {
      console.log(`\n  ${product}:`);
      ms.forEach(m => {
        const conditions = [];
        if (m.quantity) conditions.push(`Qtd: ${m.quantity}`);
        if (m.minSubtotal) conditions.push(`Subtotal: €${m.minSubtotal}`);
        console.log(`    - ${(m.marginPercent * 100).toFixed(0)}% ${conditions.length > 0 ? `(${conditions.join(", ")})` : ""}`);
      });
    }
  }

  // Agrupar por categoria e margem
  const byCategoryAndMargin = margins.reduce((acc, m) => {
    const cat = m.category || "Sem categoria";
    const marginKey = (m.marginPercent * 100).toFixed(0) + "%";
    const key = `${cat} - ${marginKey}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, DetailedMargin[]>);

  console.log("\n" + "=".repeat(120));
  console.log("Margens por Categoria:");
  for (const [key, ms] of Object.entries(byCategoryAndMargin)) {
    const [cat, margin] = key.split(" - ");
    console.log(`\n  ${cat}: ${margin} (${ms.length} ocorrências)`);
  }

  // Salvar JSON detalhado
  const outputPath = path.resolve(process.cwd(), "data", "margins-detailed.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(margins, null, 2), "utf-8");
  console.log(`\n✅ Dados salvos em: ${outputPath}`);
}

main();

