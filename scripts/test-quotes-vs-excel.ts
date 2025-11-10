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
  materials?: string[];
  printing?: string;
  finishes?: string[];
}

interface SystemQuote {
  productId: number;
  productName: string;
  quantity: number;
  subtotal: number;
  finalPrice: number;
  margin: number;
  dynamic: number;
  breakdown: any;
}

interface Comparison {
  excel: ExcelQuote;
  system: SystemQuote | null;
  difference: number;
  differencePercent: number;
  status: "OK" | "DIFERENTE" | "PRODUTO_NAO_ENCONTRADO" | "ERRO";
  error?: string;
}

function normalizeProductName(name: string): string {
  return name
    .replace(/\n/g, " ")
    .replace(/\\+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

async function findProductByName(name: string, categoryName?: string): Promise<number | null> {
  const normalized = normalizeProductName(name);
  
  // Buscar por nome exato
  let product = await prisma.product.findFirst({
    where: {
      name: { equals: normalized, mode: "insensitive" },
      ...(categoryName ? {
        category: { name: { equals: categoryName, mode: "insensitive" } }
      } : {})
    },
    select: { id: true }
  });

  if (product) return product.id;

  // Buscar por palavras-chave
  const keywords = normalized.split(" ").filter(w => w.length > 3).slice(0, 3);
  if (keywords.length > 0) {
    product = await prisma.product.findFirst({
      where: {
        AND: keywords.map(k => ({
          name: { contains: k, mode: "insensitive" }
        })),
        ...(categoryName ? {
          category: { name: { equals: categoryName, mode: "insensitive" } }
        } : {})
      },
      select: { id: true }
    });

    if (product) return product.id;
  }

  return null;
}

function extractQuotesFromSheet(sheetName: string, categoryName?: string): ExcelQuote[] {
  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes(sheetName)) return [];

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const quotes: ExcelQuote[] = [];
  
  // Encontrar colunas
  let headerRow = -1;
  const colMap: Record<string, number> = {};

  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toUpperCase().trim();
      
      if (cell.includes("TOTAL UNITÁRIO") || cell.includes("TOTAL") || cell.includes("PREÇO")) {
        colMap.totalPrice = j;
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
      if (cell.includes("% LUCRO") || cell.includes("LUCRO") || cell.includes("MARGEM")) {
        colMap.margin = j;
      }
    }

    if (colMap.totalPrice !== undefined && headerRow !== -1) break;
  }

  if (headerRow === -1 || colMap.totalPrice === undefined) return [];

  // Extrair cotações
  for (let i = headerRow + 1; i < Math.min(headerRow + 50, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const productName = colMap.product !== undefined 
      ? String(row[colMap.product] || "").trim()
      : "";

    if (!productName) continue;

    const quantity = colMap.quantity !== undefined
      ? Number(String(row[colMap.quantity] || "").replace(/[^\d.,]/g, "").replace(",", ".")) || undefined
      : undefined;

    const totalPrice = colMap.totalPrice !== undefined
      ? Number(String(row[colMap.totalPrice] || "").replace(/[€\s,]/g, "").replace(",", ".")) || undefined
      : undefined;

    const margin = colMap.margin !== undefined
      ? Number(String(row[colMap.margin] || "").replace(/[%€\s,]/g, "").replace(",", ".")) || undefined
      : undefined;

    if (productName && quantity && totalPrice) {
      quotes.push({
        sheetName,
        productName: normalizeProductName(productName),
        quantity,
        totalPrice,
        marginPercent: margin ? (margin > 1 ? margin / 100 : margin) : undefined
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
      dynamic: Number(result.dynamic),
      breakdown: result
    };
  } catch (error: any) {
    console.error(`Erro ao calcular cotação para produto ${productId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log("=".repeat(120));
  console.log("🧪 TESTE DE COTAÇÕES: Sistema vs Planilha Excel");
  console.log("=".repeat(120));
  console.log();

  const comparisons: Comparison[] = [];

  // Abas para testar
  const sheets = [
    { name: "ENVELOPES", category: "Papelaria" },
    { name: "PASTAS PARA A4", category: "Pastas A4" },
    { name: "FLEX", category: "Grande Formato — Flex/Postes/Tendas" },
    { name: "CARTOES PVC", category: "Cartões PVC" },
    { name: "CARTÕES DE VISITA", category: "Papelaria" },
  ];

  for (const { name: sheetName, category } of sheets) {
    console.log(`\n📋 Testando aba: ${sheetName}...`);
    
    const excelQuotes = extractQuotesFromSheet(sheetName, category);
    console.log(`  ✅ ${excelQuotes.length} cotações extraídas da planilha`);

    // Testar primeiras 5 cotações de cada aba
    const testQuotes = excelQuotes.slice(0, 5);

    for (const excelQuote of testQuotes) {
      console.log(`\n  📦 Testando: ${excelQuote.productName} (Qtd: ${excelQuote.quantity})`);
      
      const productId = await findProductByName(excelQuote.productName, category);
      
      if (!productId) {
        comparisons.push({
          excel: excelQuote,
          system: null,
          difference: 0,
          differencePercent: 0,
          status: "PRODUTO_NAO_ENCONTRADO",
          error: `Produto não encontrado no sistema`
        });
        console.log(`    ⚠️  Produto não encontrado no sistema`);
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
          error: `Erro ao calcular cotação`
        });
        console.log(`    ❌ Erro ao calcular cotação`);
        continue;
      }

      const difference = systemQuote.finalPrice - (excelQuote.totalPrice || 0);
      const differencePercent = excelQuote.totalPrice 
        ? (difference / excelQuote.totalPrice) * 100 
        : 0;

      const status: "OK" | "DIFERENTE" = Math.abs(differencePercent) < 5 ? "OK" : "DIFERENTE";

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
  }

  // Resumo
  console.log("\n" + "=".repeat(120));
  console.log("📊 RESUMO DOS TESTES");
  console.log("=".repeat(120));

  const ok = comparisons.filter(c => c.status === "OK").length;
  const different = comparisons.filter(c => c.status === "DIFERENTE").length;
  const notFound = comparisons.filter(c => c.status === "PRODUTO_NAO_ENCONTRADO").length;
  const errors = comparisons.filter(c => c.status === "ERRO").length;

  console.log(`\n✅ OK (diferença < 5%): ${ok}`);
  console.log(`⚠️  DIFERENTE (diferença >= 5%): ${different}`);
  console.log(`❓ PRODUTO NÃO ENCONTRADO: ${notFound}`);
  console.log(`❌ ERROS: ${errors}`);
  console.log(`\n📊 Total testado: ${comparisons.length}`);

  // Detalhes das diferenças
  if (different > 0) {
    console.log("\n" + "=".repeat(120));
    console.log("⚠️  COTAÇÕES COM DIFERENÇAS SIGNIFICATIVAS:");
    console.log("=".repeat(120));

    for (const comp of comparisons.filter(c => c.status === "DIFERENTE")) {
      console.log(`\n📦 ${comp.excel.productName} (Qtd: ${comp.excel.quantity})`);
      console.log(`   Planilha: €${comp.excel.totalPrice?.toFixed(2) || "N/A"}`);
      console.log(`   Sistema:  €${comp.system?.finalPrice.toFixed(2) || "N/A"}`);
      console.log(`   Diferença: €${comp.difference.toFixed(2)} (${comp.differencePercent.toFixed(2)}%)`);
      if (comp.system) {
        console.log(`   Subtotal sistema: €${comp.system.subtotal.toFixed(2)}`);
        console.log(`   Margem sistema: ${(comp.system.margin * 100).toFixed(0)}%`);
        console.log(`   Ajuste dinâmico: ${(comp.system.dynamic * 100).toFixed(0)}%`);
      }
    }
  }

  // Produtos não encontrados
  if (notFound > 0) {
    console.log("\n" + "=".repeat(120));
    console.log("❓ PRODUTOS NÃO ENCONTRADOS NO SISTEMA:");
    console.log("=".repeat(120));

    const uniqueNotFound = [...new Set(comparisons
      .filter(c => c.status === "PRODUTO_NAO_ENCONTRADO")
      .map(c => c.excel.productName))];

    for (const name of uniqueNotFound) {
      console.log(`  - ${name}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);

