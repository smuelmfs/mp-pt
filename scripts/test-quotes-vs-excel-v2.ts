import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";
import { calcQuote } from "../lib/calc-quote";

const prisma = new PrismaClient();
const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface ExcelQuote {
  sheetName: string;
  productName: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  marginPercent?: number;
}

interface SystemQuote {
  productId: number;
  productName: string;
  quantity: number;
  subtotal: number;
  finalPrice: number;
  margin: number;
  dynamic: number;
}

interface Comparison {
  excel: ExcelQuote;
  system: SystemQuote | null;
  difference: number;
  differencePercent: number;
  status: "OK" | "DIFERENTE" | "PRODUTO_NAO_ENCONTRADO" | "ERRO";
  error?: string;
}

async function findProductByKeywords(keywords: string[], categoryName?: string): Promise<number | null> {
  // Buscar produtos por palavras-chave
  const allProducts = await prisma.product.findMany({
    where: categoryName ? {
      category: { name: { equals: categoryName, mode: "insensitive" } }
    } : {},
    include: { category: { select: { name: true } } },
    select: { id: true, name: true }
  });

  for (const product of allProducts) {
    const productNameUpper = product.name.toUpperCase();
    // Verificar se todas as palavras-chave importantes estão no nome do produto
    const importantKeywords = keywords.filter(k => k.length > 3);
    if (importantKeywords.length === 0) continue;
    
    const matches = importantKeywords.filter(k => productNameUpper.includes(k.toUpperCase()));
    if (matches.length === importantKeywords.length || matches.length >= importantKeywords.length * 0.7) {
      return product.id;
    }
  }

  return null;
}

function extractQuotesFromEnvelopes(): ExcelQuote[] {
  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes("ENVELOPES")) return [];

  const worksheet = workbook.Sheets["ENVELOPES"];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const quotes: ExcelQuote[] = [];
  
  // Encontrar linha de cabeçalho
  let headerRow = -1;
  for (let i = 0; i < 20; i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    const rowStr = row.join(" ").toUpperCase();
    if (rowStr.includes("FORMATO") && rowStr.includes("TOTAL")) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) return [];

  // Encontrar colunas
  const header = data[headerRow];
  let formatCol = -1;
  let qtyCol = -1;
  let totalCol = -1;

  for (let j = 0; j < header.length; j++) {
    const cell = String(header[j] || "").toUpperCase();
    if (cell.includes("FORMATO") || cell.includes("TIPO")) formatCol = j;
    if (cell.includes("QUANT") || cell.includes("QTD")) qtyCol = j;
    if (cell.includes("TOTAL UNITÁRIO") || cell.includes("TOTAL")) totalCol = j;
  }

  if (formatCol === -1 || totalCol === -1) return [];

  // Extrair cotações
  for (let i = headerRow + 1; i < Math.min(headerRow + 30, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const format = String(row[formatCol] || "").trim();
    const qty = qtyCol !== -1 ? Number(String(row[qtyCol] || "").replace(/[^\d.,]/g, "").replace(",", ".")) : undefined;
    const total = Number(String(row[totalCol] || "").replace(/[€\s,]/g, "").replace(",", "."));

    if (format && qty && !isNaN(total) && total > 0) {
      quotes.push({
        sheetName: "ENVELOPES",
        productName: `Envelope ${format}`,
        quantity: Math.round(qty),
        totalPrice: total
      });
    }
  }

  return quotes;
}

function extractQuotesFromPastasA4(): ExcelQuote[] {
  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes("PASTAS PARA A4")) return [];

  const worksheet = workbook.Sheets["PASTAS PARA A4"];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const quotes: ExcelQuote[] = [];
  
  // Encontrar linha de cabeçalho
  let headerRow = -1;
  for (let i = 0; i < 20; i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    const rowStr = row.join(" ").toUpperCase();
    if (rowStr.includes("FORMATO") && (rowStr.includes("QUANT") || rowStr.includes("TOTAL"))) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) return [];

  // Encontrar colunas
  const header = data[headerRow];
  let formatCol = -1;
  let qtyCol = -1;
  let totalCol = -1;

  for (let j = 0; j < header.length; j++) {
    const cell = String(header[j] || "").toUpperCase();
    if (cell.includes("FORMATO")) formatCol = j;
    if (cell.includes("QUANT") || cell.includes("QTD")) qtyCol = j;
    if (cell.includes("TOTAL UNITÁRIO") || cell.includes("TOTAL")) totalCol = j;
  }

  if (formatCol === -1 || totalCol === -1) return [];

  // Extrair cotações
  for (let i = headerRow + 1; i < Math.min(headerRow + 30, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const format = String(row[formatCol] || "").trim();
    const qty = qtyCol !== -1 ? Number(String(row[qtyCol] || "").replace(/[^\d.,]/g, "").replace(",", ".")) : undefined;
    const total = Number(String(row[totalCol] || "").replace(/[€\s,]/g, "").replace(",", "."));

    if (format && qty && !isNaN(total) && total > 0) {
      quotes.push({
        sheetName: "PASTAS PARA A4",
        productName: `Pasta A4 ${format}`,
        quantity: Math.round(qty),
        totalPrice: total
      });
    }
  }

  return quotes;
}

async function calculateSystemQuote(productId: number, quantity: number): Promise<SystemQuote | null> {
  try {
    const result = await calcQuote(productId, quantity, {}, {});
    
    return {
      productId,
      productName: result.product.name,
      quantity: result.quantity,
      subtotal: Number(result.subtotal.toFixed(2)),
      finalPrice: Number(result.final.toFixed(2)),
      margin: Number(result.margin),
      dynamic: Number(result.dynamic)
    };
  } catch (error: any) {
    return null;
  }
}

async function main() {
  console.log("=".repeat(120));
  console.log("🧪 TESTE DE COTAÇÕES: Sistema vs Planilha Excel (v2)");
  console.log("=".repeat(120));
  console.log();

  const comparisons: Comparison[] = [];

  // 1. Testar ENVELOPES
  console.log("📮 Testando ENVELOPES...");
  const envelopeQuotes = extractQuotesFromEnvelopes();
  console.log(`  ✅ ${envelopeQuotes.length} cotações extraídas`);

  // Buscar produtos de envelope no sistema
  const envelopeProducts = await prisma.product.findMany({
    where: {
      category: { name: { equals: "Papelaria", mode: "insensitive" } },
      name: { contains: "envelope", mode: "insensitive" }
    },
    select: { id: true, name: true }
  });

  console.log(`  📦 Produtos encontrados no sistema: ${envelopeProducts.map(p => p.name).join(", ")}`);

  // Testar primeiras 3 cotações
  for (const excelQuote of envelopeQuotes.slice(0, 3)) {
    console.log(`\n  📦 Testando: ${excelQuote.productName} (Qtd: ${excelQuote.quantity})`);
    
    // Tentar encontrar produto
    let productId: number | null = null;
    
    // Tentar por nome exato
    const exactMatch = envelopeProducts.find(p => 
      p.name.toUpperCase().includes("ENVELOPE") && 
      excelQuote.productName.toUpperCase().includes("DL")
    );
    if (exactMatch) {
      productId = exactMatch.id;
    } else if (envelopeProducts.length > 0) {
      // Usar o primeiro produto de envelope encontrado
      productId = envelopeProducts[0].id;
    }

    if (!productId) {
      comparisons.push({
        excel: excelQuote,
        system: null,
        difference: 0,
        differencePercent: 0,
        status: "PRODUTO_NAO_ENCONTRADO"
      });
      console.log(`    ⚠️  Produto não encontrado`);
      continue;
    }

    const systemQuote = await calculateSystemQuote(productId, excelQuote.quantity);
    
    if (!systemQuote) {
      comparisons.push({
        excel: excelQuote,
        system: null,
        difference: 0,
        differencePercent: 0,
        status: "ERRO",
        error: "Erro ao calcular"
      });
      console.log(`    ❌ Erro ao calcular`);
      continue;
    }

    const difference = systemQuote.finalPrice - (excelQuote.totalPrice || 0);
    const differencePercent = excelQuote.totalPrice 
      ? (difference / excelQuote.totalPrice) * 100 
      : 0;

    const status: "OK" | "DIFERENTE" = Math.abs(differencePercent) < 10 ? "OK" : "DIFERENTE";

    comparisons.push({
      excel: excelQuote,
      system: systemQuote,
      difference,
      differencePercent,
      status
    });

    console.log(`    Planilha: €${excelQuote.totalPrice?.toFixed(2) || "N/A"}`);
    console.log(`    Sistema:  €${systemQuote.finalPrice.toFixed(2)}`);
    console.log(`    Diferença: €${difference.toFixed(2)} (${differencePercent.toFixed(2)}%)`);
    console.log(`    Status: ${status === "OK" ? "✅" : "⚠️"}`);
  }

  // 2. Testar PASTAS A4
  console.log("\n📁 Testando PASTAS A4...");
  const pastasQuotes = extractQuotesFromPastasA4();
  console.log(`  ✅ ${pastasQuotes.length} cotações extraídas`);

  const pastasProducts = await prisma.product.findMany({
    where: {
      category: { name: { equals: "Pastas A4", mode: "insensitive" } }
    },
    select: { id: true, name: true }
  });

  console.log(`  📦 Produtos encontrados: ${pastasProducts.map(p => p.name).join(", ")}`);

  for (const excelQuote of pastasQuotes.slice(0, 3)) {
    console.log(`\n  📦 Testando: ${excelQuote.productName} (Qtd: ${excelQuote.quantity})`);
    
    let productId: number | null = null;
    if (pastasProducts.length > 0) {
      productId = pastasProducts[0].id; // Usar o primeiro produto
    }

    if (!productId) {
      comparisons.push({
        excel: excelQuote,
        system: null,
        difference: 0,
        differencePercent: 0,
        status: "PRODUTO_NAO_ENCONTRADO"
      });
      continue;
    }

    const systemQuote = await calculateSystemQuote(productId, excelQuote.quantity);
    
    if (!systemQuote) {
      comparisons.push({
        excel: excelQuote,
        system: null,
        difference: 0,
        differencePercent: 0,
        status: "ERRO"
      });
      continue;
    }

    const difference = systemQuote.finalPrice - (excelQuote.totalPrice || 0);
    const differencePercent = excelQuote.totalPrice 
      ? (difference / excelQuote.totalPrice) * 100 
      : 0;

    const status: "OK" | "DIFERENTE" = Math.abs(differencePercent) < 10 ? "OK" : "DIFERENTE";

    comparisons.push({
      excel: excelQuote,
      system: systemQuote,
      difference,
      differencePercent,
      status
    });

    console.log(`    Planilha: €${excelQuote.totalPrice?.toFixed(2) || "N/A"}`);
    console.log(`    Sistema:  €${systemQuote.finalPrice.toFixed(2)}`);
    console.log(`    Diferença: €${difference.toFixed(2)} (${differencePercent.toFixed(2)}%)`);
    console.log(`    Status: ${status === "OK" ? "✅" : "⚠️"}`);
  }

  // Resumo
  console.log("\n" + "=".repeat(120));
  console.log("📊 RESUMO DOS TESTES");
  console.log("=".repeat(120));

  const ok = comparisons.filter(c => c.status === "OK").length;
  const different = comparisons.filter(c => c.status === "DIFERENTE").length;
  const notFound = comparisons.filter(c => c.status === "PRODUTO_NAO_ENCONTRADO").length;
  const errors = comparisons.filter(c => c.status === "ERRO").length;

  console.log(`\n✅ OK (diferença < 10%): ${ok}`);
  console.log(`⚠️  DIFERENTE (diferença >= 10%): ${different}`);
  console.log(`❓ PRODUTO NÃO ENCONTRADO: ${notFound}`);
  console.log(`❌ ERROS: ${errors}`);
  console.log(`\n📊 Total testado: ${comparisons.length}`);

  // Detalhes
  if (comparisons.length > 0) {
    console.log("\n" + "=".repeat(120));
    console.log("📋 DETALHES DAS COMPARAÇÕES:");
    console.log("=".repeat(120));

    for (const comp of comparisons.filter(c => c.system)) {
      console.log(`\n📦 ${comp.excel.productName} (Qtd: ${comp.excel.quantity})`);
      console.log(`   Planilha: €${comp.excel.totalPrice?.toFixed(2) || "N/A"}`);
      console.log(`   Sistema:  €${comp.system?.finalPrice.toFixed(2) || "N/A"}`);
      console.log(`   Diferença: €${comp.difference.toFixed(2)} (${comp.differencePercent.toFixed(2)}%)`);
      if (comp.system) {
        console.log(`   Subtotal sistema: €${comp.system.subtotal.toFixed(2)}`);
        console.log(`   Margem: ${(comp.system.margin * 100).toFixed(0)}%`);
        console.log(`   Ajuste dinâmico: ${(comp.system.dynamic * 100).toFixed(0)}%`);
      }
      console.log(`   Status: ${comp.status === "OK" ? "✅" : "⚠️"}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);

