import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient();
const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface ProductInfo {
  name: string;
  sheetName: string;
  category?: string;
  quantity?: number;
  price?: number;
}

function normalizeName(name: string): string {
  return name
    .replace(/\n/g, " ")
    .replace(/\\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidProduct(name: string): boolean {
  const normalized = normalizeName(name).toUpperCase();
  
  // Filtrar cabeçalhos e valores inválidos
  const invalid = [
    "CLIENTE", "DESCRIÇÃO", "QUANT", "QTD", "QUANTIDADE",
    "CUSTO", "TOTAL", "FORMATO", "TIPO", "PRODUTO",
    "IMPRESSÃO", "IMPRESSAO", "PAPEL", "MATERIAL",
    "CÁLCULO", "CALCULO", "DE", "PARA", "A4", "DL",
    "ENVELOPES", "PASTAS", "CARTOES", "CARTÕES",
    "VISITA", "PVC", "GRANDE", "FORMATO", "SINGULARES"
  ];

  if (invalid.some(i => normalized === i || (normalized.includes(i) && normalized.length < 10))) {
    return false;
  }

  if (normalized.length < 5) return false;
  if (/^\d+$/.test(normalized)) return false;
  if (!/[A-Z]/.test(normalized)) return false;

  return true;
}

async function extractProductsFromSheet(sheetName: string): Promise<ProductInfo[]> {
  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes(sheetName)) return [];

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const products: ProductInfo[] = [];

  // Procurar colunas
  let headerRow = -1;
  let productCol = -1;
  let descCol = -1;
  let qtyCol = -1;
  let priceCol = -1;

  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toUpperCase().trim();
      if (cell === "PRODUTO") productCol = j;
      if (cell === "DESCRIÇÃO" || cell.includes("DESCRIÇÃO")) descCol = j;
      if (cell.includes("QUANT") || cell.includes("QTD")) qtyCol = j;
      if (cell.includes("TOTAL UNITÁRIO") || (cell.includes("TOTAL") && cell.includes("UNIT"))) {
        priceCol = j;
      }
      if (productCol !== -1 || descCol !== -1) {
        headerRow = i;
      }
    }

    if (headerRow !== -1) break;
  }

  if (headerRow === -1) return [];

  // Extrair produtos
  for (let i = headerRow + 1; i < Math.min(headerRow + 300, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const product = productCol !== -1 ? String(row[productCol] || "").trim() : "";
    const desc = descCol !== -1 ? String(row[descCol] || "").trim() : "";
    const productName = product || desc;

    if (isValidProduct(productName)) {
      const qty = qtyCol !== -1 ? Number(String(row[qtyCol] || "").replace(/[^\d.,]/g, "").replace(",", ".")) : undefined;
      const price = priceCol !== -1 ? Number(String(row[priceCol] || "").replace(/[€\s,]/g, "").replace(",", ".")) : undefined;

      products.push({
        name: normalizeName(productName),
        sheetName,
        quantity: qty,
        price
      });
    }
  }

  return products;
}

async function main() {
  console.log("=".repeat(120));
  console.log("📦 Análise Detalhada de Produtos Faltantes");
  console.log("=".repeat(120));
  console.log();

  const sheetsToAnalyze = [
    { name: "CÁLCULO CATALOGOS", category: "Papelaria" },
    { name: "IMPRESSÕES SINGULARES", category: "Papelaria" },
    { name: "IMP. GRANDE FORMATO", category: "Grande Formato — Flex/Postes/Tendas" },
    { name: "IMPRESSAO UV ROLO", category: "Grande Formato — Flex/Postes/Tendas" }
  ];

  const allProducts: ProductInfo[] = [];

  for (const { name: sheetName, category } of sheetsToAnalyze) {
    console.log(`📋 Analisando: ${sheetName}...`);
    const products = await extractProductsFromSheet(sheetName);
    products.forEach(p => {
      p.category = category;
      allProducts.push(p);
    });
    console.log(`  ✅ ${products.length} produtos encontrados`);
  }

  // Verificar quais não estão no sistema
  const systemProducts = await prisma.product.findMany({
    select: { name: true, category: { select: { name: true } } }
  });

  const systemProductNames = new Set(
    systemProducts.map(p => normalizeName(p.name))
  );

  const missing = allProducts.filter(p => !systemProductNames.has(p.name));

  // Agrupar por aba
  const bySheet = missing.reduce((acc, p) => {
    if (!acc[p.sheetName]) acc[p.sheetName] = [];
    acc[p.sheetName].push(p);
    return acc;
  }, {} as Record<string, ProductInfo[]>);

  console.log(`\n${"=".repeat(120)}`);
  console.log(`📊 RESUMO:`);
  console.log(`  - Total de produtos encontrados: ${allProducts.length}`);
  console.log(`  - Produtos no sistema: ${systemProducts.length}`);
  console.log(`  - Produtos faltando: ${missing.length}`);
  console.log("=".repeat(120));

  for (const [sheetName, products] of Object.entries(bySheet)) {
    console.log(`\n📋 ${sheetName} (${products.length} produtos faltando):`);
    products.slice(0, 10).forEach(p => {
      console.log(`  - ${p.name}${p.quantity ? ` (Qtd: ${p.quantity})` : ""}${p.price ? ` - €${p.price.toFixed(2)}` : ""}`);
    });
    if (products.length > 10) {
      console.log(`  ... e mais ${products.length - 10} produtos`);
    }
  }

  // Salvar relatório
  const reportPath = path.resolve(process.cwd(), "docs", "PRODUTOS_FALTANDO_DETALHADO.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  
  let report = "# 📦 Produtos Faltando no Sistema (Detalhado)\n\n";
  report += `**Data:** ${new Date().toLocaleDateString()}\n\n`;
  report += `## Resumo\n\n`;
  report += `- Total encontrado na planilha: ${allProducts.length}\n`;
  report += `- No sistema: ${systemProducts.length}\n`;
  report += `- Faltando: ${missing.length}\n\n`;

  for (const [sheetName, products] of Object.entries(bySheet)) {
    report += `## ${sheetName} (${products.length})\n\n`;
    products.forEach(p => {
      report += `- ${p.name}`;
      if (p.quantity) report += ` - Qtd: ${p.quantity}`;
      if (p.price) report += ` - Preço: €${p.price.toFixed(2)}`;
      report += `\n`;
    });
    report += `\n`;
  }

  fs.writeFileSync(reportPath, report, "utf-8");
  console.log(`\n✅ Relatório salvo em: ${reportPath}`);

  await prisma.$disconnect();
}

main().catch(console.error);

