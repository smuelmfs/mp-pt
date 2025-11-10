import { PrismaClient } from "@prisma/client";
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Script para adicionar preços por cliente para impressões baseado no Excel
 * 
 * Extrai preços de impressão por cliente da aba "PRODUTOS PUBLICITÁRIOS"
 */

interface CustomerPrintingPrice {
  cliente: string;
  impressao: string;
  custoImpressao: number;
}

function loadExcelData(): CustomerPrintingPrice[] {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets['PRODUTOS PUBLICITÁRIOS'];
  
  if (!worksheet) {
    throw new Error('Aba PRODUTOS PUBLICITÁRIOS não encontrada no Excel');
  }

  const excelData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: null,
    raw: false 
  }) as any[][];

  const prices: CustomerPrintingPrice[] = [];
  
  // Encontra header
  let headerRow = -1;
  for (let i = 0; i < Math.min(5, excelData.length); i++) {
    if (excelData[i] && String(excelData[i][0] || '').toUpperCase() === 'CLIENTE') {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error('Header não encontrado na aba PRODUTOS PUBLICITÁRIOS');
  }

  // Processa dados
  for (let i = headerRow + 1; i < excelData.length; i++) {
    const row = excelData[i];
    if (!row || row.length < 7) continue;

    const cliente = String(row[0] || '').trim();
    const impressao = String(row[5] || '').trim();
    const custoImpressaoRaw = row[6];

    if (!cliente || cliente === 'CLIENTE' || !impressao || !custoImpressaoRaw) continue;

    // Converte custo de impressão
    let custoImpressao = 0;
    if (typeof custoImpressaoRaw === 'number') {
      custoImpressao = custoImpressaoRaw;
    } else if (custoImpressaoRaw) {
      const custoStr = String(custoImpressaoRaw).replace(/[€\s]/g, '').replace(',', '.');
      custoImpressao = Number(custoStr) || 0;
    }

    if (custoImpressao === 0 || isNaN(custoImpressao)) continue;

    // Limpa nome da impressão (remove quebras de linha e valores)
    const impressaoLimpa = impressao
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/-\s*\d+[.,]?\d*\s*€/g, '')
      .trim();

    prices.push({
      cliente,
      impressao: impressaoLimpa,
      custoImpressao,
    });
  }

  return prices;
}

async function upsertPrintingCustomerPrice(
  customerId: number,
  printingId: number,
  unitPrice: number
) {
  const existing = await prisma.printingCustomerPrice.findFirst({
    where: {
      customerId,
      printingId,
      isCurrent: true,
    },
  });

  if (existing) {
    await prisma.printingCustomerPrice.update({
      where: { id: existing.id },
      data: { unitPrice },
    });
    return existing.id;
  } else {
    const created = await prisma.printingCustomerPrice.create({
      data: {
        customerId,
        printingId,
        unitPrice,
        priority: 100,
        isCurrent: true,
      },
    });
    return created.id;
  }
}

async function main() {
  console.log('🚀 Patch — Preços de Impressão por Cliente (do Excel)\n');
  console.log('='.repeat(120));

  try {
    const excelPrices = loadExcelData();
    console.log(`📊 Excel: ${excelPrices.length} preços encontrados\n`);

    let created = 0;
    let updated = 0;
    let notFound = 0;

    for (const price of excelPrices) {
      // Busca cliente
      const customer = await prisma.customer.findFirst({
        where: { name: { equals: price.cliente, mode: 'insensitive' } },
      });

      if (!customer) {
        console.log(`  ⚠️  Cliente não encontrado: ${price.cliente}`);
        notFound++;
        continue;
      }

      // Busca impressão (tenta match flexível)
      const printing = await prisma.printing.findFirst({
        where: {
          formatLabel: { 
            contains: price.impressao.split(' ')[0], // Primeira palavra
            mode: 'insensitive' 
          },
          isCurrent: true,
        },
      });

      if (!printing) {
        console.log(`  ⚠️  Impressão não encontrada: ${price.impressao} (cliente: ${price.cliente})`);
        notFound++;
        continue;
      }

      const existingPrice = await prisma.printingCustomerPrice.findFirst({
        where: {
          customerId: customer.id,
          printingId: printing.id,
          isCurrent: true,
        },
      });

      if (existingPrice) {
        await prisma.printingCustomerPrice.update({
          where: { id: existingPrice.id },
          data: { unitPrice: price.custoImpressao },
        });
        updated++;
        console.log(`  ~ ${customer.name} → ${printing.formatLabel}: €${price.custoImpressao.toFixed(2)}`);
      } else {
        await prisma.printingCustomerPrice.create({
          data: {
            customerId: customer.id,
            printingId: printing.id,
            unitPrice: price.custoImpressao,
            priority: 100,
            isCurrent: true,
          },
        });
        created++;
        console.log(`  + ${customer.name} → ${printing.formatLabel}: €${price.custoImpressao.toFixed(2)}`);
      }
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n📊 RESUMO:');
    console.log(`  ✅ Criados: ${created}`);
    console.log(`  ✅ Atualizados: ${updated}`);
    console.log(`  ⚠️  Não encontrados: ${notFound}`);
    console.log(`  📋 Total processados: ${excelPrices.length}\n`);
  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

