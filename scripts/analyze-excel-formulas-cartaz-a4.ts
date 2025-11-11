import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import { calcQuote } from "../lib/calc-quote";

const prisma = new PrismaClient();
const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface ExcelRow {
  quantity: number;
  paperQty: number;
  printQty: number;
  printUnitCost: number;
  printTotalCost: number;
  paperUnitCost: number;
  paperTotalCost: number;
  finishCost: number;
  totalCost: number;
  marginPercent: number;
  finalPrice: number;
}

function extractExcelData(): ExcelRow[] {
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = "IMPRESSÕES SINGULARES";
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
  
  const results: ExcelRow[] = [];
  let cartazA4StartRow = -1;
  
  // Encontrar linha "CARTAZ A4 - FRENTE"
  for (let i = 0; i < Math.min(1100, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    const rowText = row.map(c => String(c || "")).join(" ").toUpperCase();
    if (rowText.includes("CARTAZ A4") && rowText.includes("FRENTE")) {
      cartazA4StartRow = i;
      break;
    }
  }
  
  if (cartazA4StartRow === -1) return [];
  
  // Extrair dados das linhas seguintes
  for (let i = cartazA4StartRow; i < Math.min(cartazA4StartRow + 20, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    
    const quantity = Number(String(row[2] || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    const paperQty = Number(String(row[3] || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    const printQty = Number(String(row[4] || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    const printUnitCost = Number(String(row[5] || "").replace(/[€\s,]/g, "").replace(",", ".")) || 0;
    const printTotalCost = Number(String(row[6] || "").replace(/[€\s,]/g, "").replace(",", ".")) || 0;
    const paperUnitCost = Number(String(row[7] || "").replace(/[€\s,]/g, "").replace(",", ".")) || 0;
    const paperTotalCost = Number(String(row[8] || "").replace(/[€\s,]/g, "").replace(",", ".")) || 0;
    const finishCost = Number(String(row[9] || "").replace(/[€\s,]/g, "").replace(",", ".")) || 0;
    const totalCost = Number(String(row[12] || "").replace(/[€\s,]/g, "").replace(",", ".")) || 0;
    const marginPercent = Number(String(row[13] || "").replace(/[%€\s,]/g, "").replace(",", ".")) || 0;
    const finalPrice = Number(String(row[14] || "").replace(/[€\s,]/g, "").replace(",", ".")) || 0;
    
    if (quantity > 0 && finalPrice > 0) {
      results.push({
        quantity,
        paperQty,
        printQty,
        printUnitCost,
        printTotalCost,
        paperUnitCost,
        paperTotalCost,
        finishCost,
        totalCost,
        marginPercent: marginPercent > 1 ? marginPercent / 100 : marginPercent,
        finalPrice
      });
    }
  }
  
  return results;
}

function analyzeExcelFormula(excel: ExcelRow): {
  calculatedTotalCost: number;
  calculatedFinalPrice: number;
  formula: string;
} {
  // Tentar reconstruir a fórmula da planilha
  // Baseado nos dados: totalCost parece ser a soma de impressão + papel + acabamento
  
  const calculatedTotalCost = excel.printTotalCost + excel.paperTotalCost + excel.finishCost;
  
  // A margem na planilha parece ser aplicada como: finalPrice = totalCost * (1 + marginPercent)
  // Mas vamos verificar se é isso mesmo
  const calculatedFinalPrice1 = calculatedTotalCost * (1 + excel.marginPercent);
  
  // Ou talvez seja: finalPrice = totalCost / (1 - marginPercent) se marginPercent for margem alvo
  // Mas 300% não faz sentido como margem alvo, então deve ser markup
  
  // Vamos verificar qual fórmula se aproxima mais
  const diff1 = Math.abs(calculatedFinalPrice1 - excel.finalPrice);
  
  // Outra possibilidade: finalPrice = totalCost * (1 + marginPercent) mas com algum ajuste
  const calculatedFinalPrice = calculatedTotalCost * (1 + excel.marginPercent);
  
  return {
    calculatedTotalCost,
    calculatedFinalPrice,
    formula: `finalPrice = totalCost × (1 + ${(excel.marginPercent * 100).toFixed(0)}%) = ${calculatedTotalCost.toFixed(2)} × ${(1 + excel.marginPercent).toFixed(2)} = ${calculatedFinalPrice.toFixed(2)}`
  };
}

async function main() {
  console.log("=".repeat(120));
  console.log("📊 ANÁLISE DE FÓRMULAS: Planilha Excel vs Sistema");
  console.log("=".repeat(120));
  console.log();
  
  // Extrair dados da planilha
  const excelData = extractExcelData();
  console.log(`✅ ${excelData.length} linhas extraídas da planilha Excel\n`);
  
  // Encontrar produto no sistema
  const product = await prisma.product.findFirst({
    where: {
      name: { contains: "CARTAZ A4", mode: "insensitive" },
      category: { name: { equals: "Papelaria", mode: "insensitive" } }
    },
    include: {
      category: true,
      materials: { include: { material: true } }
    }
  });
  
  if (!product) {
    console.log("❌ Produto CARTAZ A4 não encontrado no sistema");
    await prisma.$disconnect();
    return;
  }
  
  console.log(`✅ Produto encontrado: ${product.name} (ID: ${product.id})\n`);
  
  // Analisar cada linha da planilha
  for (const excel of excelData.slice(0, 5)) {
    console.log("=".repeat(120));
    console.log(`📦 QUANTIDADE: ${excel.quantity} unidades`);
    console.log("=".repeat(120));
    console.log();
    
    // Análise da planilha Excel
    console.log("📋 PLANILHA EXCEL:");
    console.log(`   Quantidade: ${excel.quantity}`);
    console.log(`   Papel (Qtd): ${excel.paperQty} → Custo Unit: €${excel.paperUnitCost.toFixed(4)} → Total: €${excel.paperTotalCost.toFixed(2)}`);
    console.log(`   Impressão (Qtd): ${excel.printQty} → Custo Unit: €${excel.printUnitCost.toFixed(4)} → Total: €${excel.printTotalCost.toFixed(2)}`);
    console.log(`   Acabamento: €${excel.finishCost.toFixed(2)}`);
    console.log(`   Custo Total Produção: €${excel.totalCost.toFixed(2)}`);
    console.log(`   % Lucro: ${(excel.marginPercent * 100).toFixed(0)}%`);
    console.log(`   Preço Final: €${excel.finalPrice.toFixed(2)}`);
    console.log();
    
    // Verificar fórmula da planilha
    const excelFormula = analyzeExcelFormula(excel);
    console.log("🔍 FÓRMULA DA PLANILHA (reconstruída):");
    console.log(`   ${excelFormula.formula}`);
    console.log(`   Diferença calculada vs real: €${Math.abs(excelFormula.calculatedFinalPrice - excel.finalPrice).toFixed(2)}`);
    console.log();
    
    // Calcular no sistema
    const systemResult = await calcQuote(product.id, excel.quantity, {}, {});
    console.log("💻 SISTEMA:");
    console.log(`   Subtotal Produção: €${Number(systemResult.subtotalProduction).toFixed(2)}`);
    console.log(`   Subtotal (após mínimos): €${Number(systemResult.subtotal).toFixed(2)}`);
    console.log(`   Markup: ${(Number(systemResult.markup) * 100).toFixed(0)}%`);
    console.log(`   Margem: ${(Number(systemResult.margin) * 100).toFixed(0)}%`);
    console.log(`   Ajuste Dinâmico: ${(Number(systemResult.dynamic) * 100).toFixed(1)}%`);
    console.log(`   Preço Final: €${Number(systemResult.final).toFixed(2)}`);
    console.log();
    
    // Comparação
    const difference = Number(systemResult.final) - excel.finalPrice;
    const differencePercent = (difference / excel.finalPrice) * 100;
    
    console.log("📊 COMPARAÇÃO:");
    console.log(`   Planilha Excel: €${excel.finalPrice.toFixed(2)}`);
    console.log(`   Sistema:        €${Number(systemResult.final).toFixed(2)}`);
    console.log(`   Diferença:      €${difference.toFixed(2)} (${differencePercent > 0 ? "+" : ""}${differencePercent.toFixed(2)}%)`);
    console.log();
    
    // Análise das diferenças
    console.log("🔍 ANÁLISE DAS DIFERENÇAS:");
    
    // Verificar custos
    const excelTotalCost = excel.printTotalCost + excel.paperTotalCost + excel.finishCost;
    const systemTotalCost = Number(systemResult.subtotalProduction);
    const costDiff = systemTotalCost - excelTotalCost;
    
    console.log(`   1. Custo Total Produção:`);
    console.log(`      Planilha: €${excelTotalCost.toFixed(2)} (Imp: €${excel.printTotalCost.toFixed(2)} + Papel: €${excel.paperTotalCost.toFixed(2)} + Acab: €${excel.finishCost.toFixed(2)})`);
    console.log(`      Sistema:  €${systemTotalCost.toFixed(2)}`);
    console.log(`      Diferença: €${costDiff.toFixed(2)}`);
    console.log();
    
    // Verificar margem
    console.log(`   2. Aplicação de Margem:`);
    console.log(`      Planilha: Custo × (1 + ${(excel.marginPercent * 100).toFixed(0)}%) = €${excelTotalCost.toFixed(2)} × ${(1 + excel.marginPercent).toFixed(2)} = €${(excelTotalCost * (1 + excel.marginPercent)).toFixed(2)}`);
    
    const systemWithMargin = Number(systemResult.subtotal) * (1 + Number(systemResult.markup)) * (1 + Number(systemResult.margin) + Number(systemResult.dynamic));
    console.log(`      Sistema:  Subtotal × (1 + Markup) × (1 + Margem + Dinâmico) = €${Number(systemResult.subtotal).toFixed(2)} × ${(1 + Number(systemResult.markup)).toFixed(2)} × ${(1 + Number(systemResult.margin) + Number(systemResult.dynamic)).toFixed(2)} = €${systemWithMargin.toFixed(2)}`);
    console.log();
    
    // Verificar se a planilha usa apenas margem ou markup+margem
    const excelWithOnlyMargin = excelTotalCost * (1 + excel.marginPercent);
    const excelWithMarkupMargin = excelTotalCost * (1 + 0.2) * (1 + 0.3); // Assumindo markup 20% e margem 30%
    
    console.log(`   3. Possíveis Fórmulas da Planilha:`);
    console.log(`      A) Apenas Margem 300%: €${excelTotalCost.toFixed(2)} × 4.00 = €${excelWithOnlyMargin.toFixed(2)}`);
    console.log(`      B) Markup 20% + Margem 30%: €${excelTotalCost.toFixed(2)} × 1.20 × 1.30 = €${excelWithMarkupMargin.toFixed(2)}`);
    console.log(`      C) Valor Real da Planilha: €${excel.finalPrice.toFixed(2)}`);
    console.log();
    
    console.log();
  }
  
  console.log("=".repeat(120));
  console.log("📝 CONCLUSÕES:");
  console.log("=".repeat(120));
  console.log();
  console.log("1. A planilha Excel parece usar uma fórmula simples: Custo Total × (1 + % Lucro)");
  console.log("2. O sistema usa: Subtotal × (1 + Markup) × (1 + Margem + Ajuste Dinâmico)");
  console.log("3. A diferença pode ser devido a:");
  console.log("   - Fórmulas diferentes (apenas margem vs markup+margem)");
  console.log("   - Valores de custo diferentes (materiais/impressões atualizados)");
  console.log("   - Ajustes dinâmicos aplicados no sistema mas não na planilha");
  console.log("   - Estratégias de arredondamento diferentes");
  console.log();
  
  await prisma.$disconnect();
}

main().catch(console.error);

