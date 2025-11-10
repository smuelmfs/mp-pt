import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface CustomerPrice {
  customerName: string;
  materialName?: string;
  printingName?: string;
  finishName?: string;
  unitCost?: number;
  unitPrice?: number;
  baseCost?: number;
  priority?: number;
  isCurrent?: boolean;
}

async function getCustomersWithoutPrices() {
  const customers = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  const customersWithMaterialPrices = await prisma.materialCustomerPrice.findMany({
    where: { isCurrent: true },
    select: { customerId: true },
    distinct: ["customerId"],
  });
  const customersWithPrintingPrices = await prisma.printingCustomerPrice.findMany({
    where: { isCurrent: true },
    select: { customerId: true },
    distinct: ["customerId"],
  });
  const customersWithFinishPrices = await prisma.finishCustomerPrice.findMany({
    where: { isCurrent: true },
    select: { customerId: true },
    distinct: ["customerId"],
  });

  const hasMaterial = new Set(customersWithMaterialPrices.map(p => p.customerId));
  const hasPrinting = new Set(customersWithPrintingPrices.map(p => p.customerId));
  const hasFinish = new Set(customersWithFinishPrices.map(p => p.customerId));

  const customersWithoutPrices = customers.filter(c =>
    !hasMaterial.has(c.id) && !hasPrinting.has(c.id) && !hasFinish.has(c.id)
  );

  return customersWithoutPrices.map(c => c.name.toUpperCase());
}

function normalizeName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, " ");
}

async function extractCustomerPricesFromExcel() {
  console.log("📖 Lendo planilha Excel...");
  
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ Arquivo não encontrado: ${EXCEL_PATH}`);
    return [];
  }

  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetNames = workbook.SheetNames;
  
  console.log(`📋 Encontradas ${sheetNames.length} abas na planilha`);
  
  const customersWithoutPrices = await getCustomersWithoutPrices();
  console.log(`\n🔍 Buscando preços para ${customersWithoutPrices.length} clientes sem preços...`);
  console.log(`   Clientes: ${customersWithoutPrices.slice(0, 10).join(", ")}${customersWithoutPrices.length > 10 ? "..." : ""}`);
  
  const foundPrices: CustomerPrice[] = [];
  const processedCustomers = new Set<string>();

  // Processar cada aba
  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][];

    // Procurar por nomes de clientes nas linhas
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      // Verificar se alguma célula contém o nome de um cliente
      for (let j = 0; j < row.length; j++) {
        const cellValue = String(row[j] || "").trim().toUpperCase();
        
        // Verificar se é um cliente sem preços
        const matchingCustomer = customersWithoutPrices.find(c => 
          cellValue.includes(c) || c.includes(cellValue) || 
          cellValue === c || normalizeName(cellValue) === c
        );

        if (matchingCustomer && !processedCustomers.has(matchingCustomer)) {
          console.log(`\n✅ Encontrado cliente "${matchingCustomer}" na aba "${sheetName}" (linha ${i + 1})`);
          
          // Tentar extrair preços das linhas próximas
          const prices = extractPricesFromRow(data, i, j, matchingCustomer, sheetName);
          foundPrices.push(...prices);
          processedCustomers.add(matchingCustomer);
        }
      }
    }
  }

  console.log(`\n📊 Total de preços encontrados: ${foundPrices.length}`);
  console.log(`   Clientes processados: ${processedCustomers.size}/${customersWithoutPrices.length}`);

  return foundPrices;
}

function extractPricesFromRow(
  data: any[][],
  rowIndex: number,
  colIndex: number,
  customerName: string,
  sheetName: string
): CustomerPrice[] {
  const prices: CustomerPrice[] = [];
  
  // Procurar nas próximas 20 linhas por dados de preços
  for (let i = rowIndex; i < Math.min(rowIndex + 20, data.length); i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    // Tentar identificar padrões de preços
    // Procurar por valores numéricos que possam ser preços
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").trim();
      
      // Verificar se é um número (preço)
      const numValue = parseFloat(cell.replace(",", ".").replace(/[^\d.,-]/g, ""));
      if (!isNaN(numValue) && numValue > 0 && numValue < 10000) {
        // Tentar identificar o tipo (material, impressão, acabamento)
        // Verificar células anteriores para contexto
        const context = [];
        for (let k = Math.max(0, j - 3); k < j; k++) {
          const ctx = String(row[k] || "").trim();
          if (ctx) context.push(ctx);
        }

        // Se houver contexto, tentar identificar
        if (context.length > 0) {
          const contextStr = context.join(" ").toUpperCase();
          
          // Verificar se parece ser material, impressão ou acabamento
          if (contextStr.includes("MATERIAL") || contextStr.includes("PAPEL") || contextStr.includes("VINIL") || contextStr.includes("ALVEOLAR")) {
            prices.push({
              customerName,
              materialName: context[context.length - 1] || "Material",
              unitCost: numValue,
              priority: 1,
              isCurrent: true,
            });
          } else if (contextStr.includes("IMPRESS") || contextStr.includes("PRINT")) {
            prices.push({
              customerName,
              printingName: context[context.length - 1] || "Impressão",
              unitPrice: numValue,
              priority: 1,
              isCurrent: true,
            });
          } else if (contextStr.includes("ACABAMENT") || contextStr.includes("FINISH") || contextStr.includes("LAMIN") || contextStr.includes("PLASTIF")) {
            prices.push({
              customerName,
              finishName: context[context.length - 1] || "Acabamento",
              baseCost: numValue,
              priority: 1,
              isCurrent: true,
            });
          }
        }
      }
    }
  }

  return prices;
}

async function main() {
  console.log("=".repeat(120));
  console.log("🔍 Extração de Preços de Clientes sem Preços");
  console.log("=".repeat(120));
  console.log();

  try {
    const prices = await extractCustomerPricesFromExcel();
    
    if (prices.length === 0) {
      console.log("\n⚠️  Nenhum preço encontrado na planilha para os clientes sem preços.");
      console.log("   Isso pode ser normal se esses clientes usam preços padrão do sistema.");
      return;
    }

    // Salvar em arquivo JSON
    const outputPath = path.resolve(process.cwd(), "data", "missing-customer-prices.json");
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(prices, null, 2), "utf-8");
    
    console.log(`\n✅ Preços extraídos salvos em: ${outputPath}`);
    console.log(`\n📊 Resumo:`);
    console.log(`   - Preços de materiais: ${prices.filter(p => p.materialName).length}`);
    console.log(`   - Preços de impressões: ${prices.filter(p => p.printingName).length}`);
    console.log(`   - Preços de acabamentos: ${prices.filter(p => p.finishName).length}`);
    
  } catch (error) {
    console.error("❌ Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

