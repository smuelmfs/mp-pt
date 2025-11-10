import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const prisma = new PrismaClient();
const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface MissingData {
  customers: string[];
  products: string[];
  materials: string[];
  printings: string[];
  finishes: string[];
}

function normalizeName(name: string): string {
  return name
    .replace(/\n/g, " ")
    .replace(/\\+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

async function extractCustomersFromSheet(sheetName: string): Promise<string[]> {
  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes(sheetName)) return [];

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const customers = new Set<string>();

  // Procurar coluna CLIENTE
  let headerRow = -1;
  let clienteCol = -1;

  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toUpperCase().trim();
      if (cell === "CLIENTE" || cell.includes("CLIENTE")) {
        clienteCol = j;
        headerRow = i;
        break;
      }
    }

    if (clienteCol !== -1) break;
  }

  if (clienteCol === -1) return [];

  // Extrair clientes
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const cliente = String(row[clienteCol] || "").trim();
    if (cliente && cliente.length > 2 && !cliente.match(/^\d+$/)) {
      customers.add(normalizeName(cliente));
    }
  }

  return Array.from(customers);
}

async function extractProductsFromSheet(sheetName: string): Promise<string[]> {
  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes(sheetName)) return [];

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const products = new Set<string>();

  // Procurar colunas de produto/descrição
  let headerRow = -1;
  let productCol = -1;
  let descCol = -1;

  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toUpperCase().trim();
      if (cell === "PRODUTO" || cell.includes("PRODUTO")) {
        productCol = j;
        headerRow = i;
      }
      if (cell === "DESCRIÇÃO" || cell.includes("DESCRIÇÃO")) {
        descCol = j;
        headerRow = i;
      }
    }

    if (headerRow !== -1) break;
  }

  if (headerRow === -1) return [];

  // Extrair produtos
  for (let i = headerRow + 1; i < Math.min(headerRow + 200, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const product = productCol !== -1 ? String(row[productCol] || "").trim() : "";
    const desc = descCol !== -1 ? String(row[descCol] || "").trim() : "";
    
    const productName = product || desc;
    if (productName && productName.length > 3) {
      products.add(normalizeName(productName));
    }
  }

  return Array.from(products);
}

async function extractMaterialsFromSheet(sheetName: string): Promise<string[]> {
  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes(sheetName)) return [];

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const materials = new Set<string>();

  // Procurar colunas de material/papel
  let headerRow = -1;
  let materialCol = -1;
  let papelCol = -1;

  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toUpperCase().trim();
      if (cell.includes("MATERIAL") || cell.includes("PAPEL") || cell.includes("VINIL") || 
          cell.includes("ALVEOLAR") || cell.includes("FORMATO")) {
        if (!materialCol) materialCol = j;
        if (cell.includes("PAPEL")) papelCol = j;
        headerRow = i;
      }
    }

    if (headerRow !== -1) break;
  }

  if (headerRow === -1) return [];

  // Extrair materiais
  for (let i = headerRow + 1; i < Math.min(headerRow + 200, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const material = materialCol !== -1 ? String(row[materialCol] || "").trim() : "";
    const papel = papelCol !== -1 ? String(row[papelCol] || "").trim() : "";
    
    const materialName = material || papel;
    if (materialName && materialName.length > 3) {
      materials.add(normalizeName(materialName));
    }
  }

  return Array.from(materials);
}

async function extractPrintingsFromSheet(sheetName: string): Promise<string[]> {
  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes(sheetName)) return [];

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const printings = new Set<string>();

  // Procurar colunas de impressão
  let headerRow = -1;
  let printingCol = -1;

  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toUpperCase().trim();
      if (cell.includes("IMPRESSÃO") || cell.includes("IMPRESSAO") || 
          cell.includes("FORMATO DE IMPRESSÃO")) {
        printingCol = j;
        headerRow = i;
        break;
      }
    }

    if (headerRow !== -1) break;
  }

  if (headerRow === -1) return [];

  // Extrair impressões
  for (let i = headerRow + 1; i < Math.min(headerRow + 200, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const printing = printingCol !== -1 ? String(row[printingCol] || "").trim() : "";
    if (printing && printing.length > 2) {
      printings.add(normalizeName(printing));
    }
  }

  return Array.from(printings);
}

async function main() {
  console.log("=".repeat(120));
  console.log("🔍 ANÁLISE COMPLETA: Planilha vs Sistema");
  console.log("=".repeat(120));
  console.log();

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ Arquivo não encontrado: ${EXCEL_PATH}`);
    return;
  }

  const workbook = XLSX.readFile(EXCEL_PATH);
  const allSheets = workbook.SheetNames;

  console.log(`📋 Total de abas na planilha: ${allSheets.length}\n`);

  // Abas principais para analisar
  const sheetsToAnalyze = [
    "ENVELOPES",
    "IMP. GRANDE FORMATO",
    "CÁLCULO CATALOGOS",
    "IMPRESSÕES SINGULARES",
    "PASTAS PARA A4",
    "CARTOES PVC",
    "IMPRESSAO UV ROLO",
    "VINIL",
    "ALVEOLAR",
    "FLEX",
    "CARTÕES DE VISITA"
  ];

  const missing: MissingData = {
    customers: [],
    products: [],
    materials: [],
    printings: [],
    finishes: []
  };

  // 1. Extrair clientes de todas as abas
  console.log("👥 Extraindo CLIENTES...");
  const allCustomers = new Set<string>();
  for (const sheetName of sheetsToAnalyze) {
    if (!allSheets.includes(sheetName)) continue;
    const customers = await extractCustomersFromSheet(sheetName);
    customers.forEach(c => allCustomers.add(c));
    if (customers.length > 0) {
      console.log(`  ${sheetName}: ${customers.length} clientes encontrados`);
    }
  }

  // Verificar quais clientes não estão no sistema
  const systemCustomers = await prisma.customer.findMany({
    select: { name: true }
  });
  const systemCustomerNames = new Set(systemCustomers.map(c => normalizeName(c.name)));

  for (const customer of allCustomers) {
    if (!systemCustomerNames.has(customer)) {
      missing.customers.push(customer);
    }
  }

  console.log(`\n  ✅ Total de clientes únicos na planilha: ${allCustomers.size}`);
  console.log(`  ✅ Clientes no sistema: ${systemCustomers.length}`);
  console.log(`  ⚠️  Clientes faltando: ${missing.customers.length}`);

  // 2. Extrair produtos
  console.log("\n📦 Extraindo PRODUTOS...");
  const allProducts = new Set<string>();
  for (const sheetName of sheetsToAnalyze) {
    if (!allSheets.includes(sheetName)) continue;
    const products = await extractProductsFromSheet(sheetName);
    products.forEach(p => allProducts.add(p));
    if (products.length > 0) {
      console.log(`  ${sheetName}: ${products.length} produtos encontrados`);
    }
  }

  const systemProducts = await prisma.product.findMany({
    select: { name: true }
  });
  const systemProductNames = new Set(systemProducts.map(p => normalizeName(p.name)));

  for (const product of allProducts) {
    if (!systemProductNames.has(product)) {
      missing.products.push(product);
    }
  }

  console.log(`\n  ✅ Total de produtos únicos na planilha: ${allProducts.size}`);
  console.log(`  ✅ Produtos no sistema: ${systemProducts.length}`);
  console.log(`  ⚠️  Produtos faltando: ${missing.products.length}`);

  // 3. Extrair materiais
  console.log("\n📄 Extraindo MATERIAIS...");
  const allMaterials = new Set<string>();
  for (const sheetName of sheetsToAnalyze) {
    if (!allSheets.includes(sheetName)) continue;
    const materials = await extractMaterialsFromSheet(sheetName);
    materials.forEach(m => allMaterials.add(m));
    if (materials.length > 0) {
      console.log(`  ${sheetName}: ${materials.length} materiais encontrados`);
    }
  }

  const systemMaterials = await prisma.material.findMany({
    where: { isCurrent: true },
    select: { name: true }
  });
  const systemMaterialNames = new Set(systemMaterials.map(m => normalizeName(m.name)));

  for (const material of allMaterials) {
    if (!systemMaterialNames.has(material)) {
      missing.materials.push(material);
    }
  }

  console.log(`\n  ✅ Total de materiais únicos na planilha: ${allMaterials.size}`);
  console.log(`  ✅ Materiais no sistema: ${systemMaterials.length}`);
  console.log(`  ⚠️  Materiais faltando: ${missing.materials.length}`);

  // 4. Extrair impressões
  console.log("\n🖨️  Extraindo IMPRESSÕES...");
  const allPrintings = new Set<string>();
  for (const sheetName of sheetsToAnalyze) {
    if (!allSheets.includes(sheetName)) continue;
    const printings = await extractPrintingsFromSheet(sheetName);
    printings.forEach(p => allPrintings.add(p));
    if (printings.length > 0) {
      console.log(`  ${sheetName}: ${printings.length} impressões encontradas`);
    }
  }

  const systemPrintings = await prisma.printing.findMany({
    where: { isCurrent: true },
    select: { formatLabel: true, technology: true, colors: true }
  });
  const systemPrintingNames = new Set(
    systemPrintings.map(p => {
      const name = p.formatLabel || `${p.technology} ${p.colors || ""}`;
      return normalizeName(name);
    })
  );

  for (const printing of allPrintings) {
    if (!systemPrintingNames.has(printing)) {
      missing.printings.push(printing);
    }
  }

  console.log(`\n  ✅ Total de impressões únicas na planilha: ${allPrintings.size}`);
  console.log(`  ✅ Impressões no sistema: ${systemPrintings.length}`);
  console.log(`  ⚠️  Impressões faltando: ${missing.printings.length}`);

  // Resumo final
  console.log("\n" + "=".repeat(120));
  console.log("📊 RESUMO FINAL");
  console.log("=".repeat(120));

  if (missing.customers.length > 0) {
    console.log(`\n👥 CLIENTES FALTANDO (${missing.customers.length}):`);
    missing.customers.slice(0, 20).forEach(c => console.log(`  - ${c}`));
    if (missing.customers.length > 20) {
      console.log(`  ... e mais ${missing.customers.length - 20} clientes`);
    }
  }

  if (missing.products.length > 0) {
    console.log(`\n📦 PRODUTOS FALTANDO (${missing.products.length}):`);
    missing.products.slice(0, 20).forEach(p => console.log(`  - ${p}`));
    if (missing.products.length > 20) {
      console.log(`  ... e mais ${missing.products.length - 20} produtos`);
    }
  }

  if (missing.materials.length > 0) {
    console.log(`\n📄 MATERIAIS FALTANDO (${missing.materials.length}):`);
    missing.materials.slice(0, 20).forEach(m => console.log(`  - ${m}`));
    if (missing.materials.length > 20) {
      console.log(`  ... e mais ${missing.materials.length - 20} materiais`);
    }
  }

  if (missing.printings.length > 0) {
    console.log(`\n🖨️  IMPRESSÕES FALTANDO (${missing.printings.length}):`);
    missing.printings.slice(0, 20).forEach(p => console.log(`  - ${p}`));
    if (missing.printings.length > 20) {
      console.log(`  ... e mais ${missing.printings.length - 20} impressões`);
    }
  }

  // Salvar relatório
  const reportPath = path.resolve(process.cwd(), "docs", "DADOS_FALTANDO.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  
  let report = "# 📊 Dados Faltando no Sistema\n\n";
  report += `**Data:** ${new Date().toLocaleDateString()}\n\n`;
  report += `## 👥 Clientes Faltando (${missing.customers.length})\n\n`;
  missing.customers.forEach(c => report += `- ${c}\n`);
  report += `\n## 📦 Produtos Faltando (${missing.products.length})\n\n`;
  missing.products.forEach(p => report += `- ${p}\n`);
  report += `\n## 📄 Materiais Faltando (${missing.materials.length})\n\n`;
  missing.materials.forEach(m => report += `- ${m}\n`);
  report += `\n## 🖨️ Impressões Faltando (${missing.printings.length})\n\n`;
  missing.printings.forEach(p => report += `- ${p}\n`);

  fs.writeFileSync(reportPath, report, "utf-8");
  console.log(`\n✅ Relatório salvo em: ${reportPath}`);

  await prisma.$disconnect();
}

main().catch(console.error);

