import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import { calcQuote } from "../lib/calc-quote";

const prisma = new PrismaClient();
const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface ComparisonResult {
  productName: string;
  quantity: number;
  excelPrice?: number;
  systemPrice: number;
  difference?: number;
  differencePercent?: number;
  status: "OK" | "DIFERENTE" | "NAO_ENCONTRADO" | "ERRO";
  details?: {
    excel?: any;
    system?: any;
  };
}

async function findCartazA4(): Promise<number | null> {
  const product = await prisma.product.findFirst({
    where: {
      name: { contains: "CARTAZ A4", mode: "insensitive" },
      category: { name: { equals: "Papelaria", mode: "insensitive" } }
    },
    select: { id: true, name: true }
  });
  
  if (product) {
    console.log(`✅ Produto encontrado: ${product.name} (ID: ${product.id})`);
    return product.id;
  }
  
  return null;
}

interface ExcelCartazA4 {
  quantity: number;
  totalPrice: number;
  unitPrice: number;
  materialCost?: number;
  printingCost?: number;
  finishCost?: number;
  margin?: number;
}

function extractCartazA4FromExcel(): ExcelCartazA4[] {
  try {
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetName = "IMPRESSÕES SINGULARES";
    
    if (!workbook.SheetNames.includes(sheetName)) {
      console.log(`  ⚠️  Aba "${sheetName}" não encontrada`);
      return [];
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
    
    const results: ExcelCartazA4[] = [];
    
    // Procurar diretamente por "CARTAZ A4 - FRENTE"
    let cartazA4StartRow = -1;
    
    for (let i = 0; i < Math.min(1100, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      
      const rowText = row.map(c => String(c || "")).join(" ").toUpperCase();
      
      if (rowText.includes("CARTAZ A4") && rowText.includes("FRENTE")) {
        cartazA4StartRow = i;
        break;
      }
    }
    
    if (cartazA4StartRow === -1) {
      console.log(`  ⚠️  "CARTAZ A4 - FRENTE" não encontrado na aba "${sheetName}"`);
      return [];
    }
    
    // Baseado na estrutura da planilha:
    // Coluna 2 (índice 2): Quantidade
    // Coluna 14 (índice 14): Total (preço final)
    // As linhas seguintes têm as quantidades: 50, 100, 250, 500, 750, 1000
    
    for (let i = cartazA4StartRow; i < Math.min(cartazA4StartRow + 20, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      
      // Coluna 2 (índice 2) tem a quantidade
      const qtyStr = String(row[2] || "").trim();
      const quantity = Number(qtyStr.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
      
      // Coluna 14 (índice 14) tem o preço total
      const priceStr = String(row[14] || "").trim();
      const totalPrice = Number(priceStr.replace(/[€\s,]/g, "").replace(",", ".")) || 0;
      
      if (quantity > 0 && totalPrice > 0) {
        results.push({
          quantity,
          totalPrice,
          unitPrice: totalPrice / quantity
        });
      }
    }
    
    return results;
  } catch (error: any) {
    console.error(`Erro ao ler Excel: ${error.message}`);
    return [];
  }
}

async function calculateSystemQuote(productId: number, quantity: number): Promise<any> {
  try {
    const result = await calcQuote(productId, quantity, {}, {});
    return {
      subtotal: Number(result.subtotal),
      finalPrice: Number(result.final),
      priceGross: Number(result.priceGross),
      unitPrice: Number(result.final) / quantity,
      margin: Number(result.margin),
      dynamic: Number(result.dynamic),
      markup: Number(result.markup),
      vatAmount: Number(result.vatAmount),
      items: result.items || []
    };
  } catch (error: any) {
    console.error(`Erro ao calcular: ${error.message}`);
    return null;
  }
}

async function main() {
  console.log("=".repeat(120));
  console.log("📊 COMPARAÇÃO: CARTAZ A4 - Sistema vs Planilha Excel");
  console.log("=".repeat(120));
  console.log();

  // Encontrar produto CARTAZ A4
  const productId = await findCartazA4();
  
  if (!productId) {
    console.log("❌ Produto CARTAZ A4 não encontrado no sistema");
    await prisma.$disconnect();
    return;
  }

  // Quantidades para testar (baseado nos testes anteriores)
  const quantities = [100, 500];
  
  console.log("📋 Extraindo dados da planilha Excel...");
  const excelData = extractCartazA4FromExcel();
  console.log(`  ✅ Dados extraídos: ${excelData.length} entradas da planilha`);
  
  if (excelData.length > 0) {
    console.log("\n📊 Dados encontrados na planilha:");
    excelData.forEach((item, idx) => {
      console.log(`  ${idx + 1}. Qtd: ${item.quantity} → Total: €${item.totalPrice.toFixed(2)} (Unit: €${item.unitPrice.toFixed(2)})`);
    });
  }
  
  console.log("\n🧪 Testando cálculos do sistema:");
  console.log();
  
  const comparisons: ComparisonResult[] = [];
  
  // Testar quantidades da planilha se disponíveis, senão usar as padrão
  const testQuantities = excelData.length > 0 
    ? excelData.map(e => e.quantity).slice(0, 5)
    : quantities;
  
  for (const qty of testQuantities) {
    console.log(`  📦 Quantidade: ${qty} unidades`);
    
    const systemResult = await calculateSystemQuote(productId, qty);
    const excelMatch = excelData.find(e => e.quantity === qty);
    
    if (!systemResult) {
      comparisons.push({
        productName: "CARTAZ A4",
        quantity: qty,
        systemPrice: 0,
        status: "ERRO"
      });
      console.log(`    ❌ Erro ao calcular`);
      continue;
    }
    
    console.log(`    Sistema - Preço Total: €${systemResult.finalPrice.toFixed(2)}`);
    console.log(`    Sistema - Preço Unitário: €${systemResult.unitPrice.toFixed(2)}`);
    console.log(`    Sistema - Preço com IVA: €${systemResult.priceGross.toFixed(2)}`);
    console.log(`    Sistema - Subtotal: €${systemResult.subtotal.toFixed(2)}`);
    console.log(`    Sistema - Markup: ${(systemResult.markup * 100).toFixed(1)}%`);
    console.log(`    Sistema - Margem: ${(systemResult.margin * 100).toFixed(1)}%`);
    console.log(`    Sistema - Ajuste Dinâmico: ${(systemResult.dynamic * 100).toFixed(1)}%`);
    console.log(`    Sistema - IVA: €${systemResult.vatAmount.toFixed(2)}`);
    
    if (systemResult.items && systemResult.items.length > 0) {
      console.log(`    Sistema - Breakdown:`);
      systemResult.items.forEach((item: any) => {
        console.log(`      - ${item.name || item.itemType}: ${item.quantity || 0} ${item.unit || ""} × €${item.unitCost ? Number(item.unitCost).toFixed(4) : "0.0000"} = €${item.totalCost ? Number(item.totalCost).toFixed(2) : "0.00"}`);
      });
    }
    
    if (excelMatch) {
      const difference = systemResult.finalPrice - excelMatch.totalPrice;
      const differencePercent = excelMatch.totalPrice 
        ? (difference / excelMatch.totalPrice) * 100 
        : 0;
      
      const status: "OK" | "DIFERENTE" = Math.abs(differencePercent) < 5 ? "OK" : "DIFERENTE";
      
      console.log(`\n    📊 COMPARAÇÃO:`);
      console.log(`    Planilha Excel: €${excelMatch.totalPrice.toFixed(2)} (Unit: €${excelMatch.unitPrice.toFixed(2)})`);
      console.log(`    Sistema:       €${systemResult.finalPrice.toFixed(2)} (Unit: €${systemResult.unitPrice.toFixed(2)})`);
      console.log(`    Diferença:     €${difference.toFixed(2)} (${differencePercent > 0 ? "+" : ""}${differencePercent.toFixed(2)}%)`);
      console.log(`    Status:        ${status === "OK" ? "✅ OK" : "⚠️ DIFERENTE"}`);
      
      comparisons.push({
        productName: "CARTAZ A4",
        quantity: qty,
        excelPrice: excelMatch.totalPrice,
        systemPrice: systemResult.finalPrice,
        difference,
        differencePercent,
        status,
        details: {
          excel: excelMatch,
          system: systemResult
        }
      });
    } else {
      comparisons.push({
        productName: "CARTAZ A4",
        quantity: qty,
        systemPrice: systemResult.finalPrice,
        status: "NAO_ENCONTRADO",
        details: {
          system: systemResult
        }
      });
      console.log(`    ⚠️  Quantidade ${qty} não encontrada na planilha Excel`);
    }
    
    console.log();
  }
  
  // Resumo
  console.log("=".repeat(120));
  console.log("📊 RESUMO DA COMPARAÇÃO");
  console.log("=".repeat(120));
  console.log();
  
  const ok = comparisons.filter(c => c.status === "OK").length;
  const different = comparisons.filter(c => c.status === "DIFERENTE").length;
  const notFound = comparisons.filter(c => c.status === "NAO_ENCONTRADO").length;
  const errors = comparisons.filter(c => c.status === "ERRO").length;
  
  console.log(`✅ OK (diferença < 5%): ${ok}`);
  console.log(`⚠️  DIFERENTE (diferença >= 5%): ${different}`);
  console.log(`❓ NÃO ENCONTRADO NA PLANILHA: ${notFound}`);
  console.log(`❌ ERROS: ${errors}`);
  console.log(`📦 Total testado: ${comparisons.length}`);
  console.log();
  
  if (different > 0 || ok > 0) {
    console.log("=".repeat(120));
    console.log("📋 DETALHES DAS COMPARAÇÕES:");
    console.log("=".repeat(120));
    console.log();
    
    for (const comp of comparisons.filter(c => c.status === "OK" || c.status === "DIFERENTE")) {
      console.log(`📦 Quantidade: ${comp.quantity} unidades`);
      console.log(`   Planilha Excel: €${comp.excelPrice?.toFixed(2) || "N/A"}`);
      console.log(`   Sistema:        €${comp.systemPrice.toFixed(2)}`);
      if (comp.difference !== undefined && comp.differencePercent !== undefined) {
        console.log(`   Diferença:      €${comp.difference.toFixed(2)} (${comp.differencePercent > 0 ? "+" : ""}${comp.differencePercent.toFixed(2)}%)`);
      }
      console.log(`   Status:         ${comp.status === "OK" ? "✅ OK" : "⚠️ DIFERENTE"}`);
      console.log();
    }
  }
  
  if (notFound > 0) {
    console.log("=".repeat(120));
    console.log("⚠️  QUANTIDADES TESTADAS MAS NÃO ENCONTRADAS NA PLANILHA:");
    console.log("=".repeat(120));
    console.log();
    
    for (const comp of comparisons.filter(c => c.status === "NAO_ENCONTRADO")) {
      console.log(`📦 Quantidade: ${comp.quantity} unidades`);
      console.log(`   Sistema: €${comp.systemPrice.toFixed(2)} (Unit: €${(comp.systemPrice / comp.quantity).toFixed(2)})`);
      console.log();
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);

