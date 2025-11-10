import { PrismaClient, PrintingTech, Unit } from "@prisma/client";
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Seed para importar impressões básicas da aba "IMPRESSÃO" do Excel
 * 
 * Estrutura do Excel:
 * - FORMATO IMPRESSÃO (ex: A4, SRA4, A3, SRA3, 33x48, BANNER)
 * - COR (ex: K, CMYK)
 * - PREÇO POR IMPRESSÃO (ex: 0.05 €)
 * 
 * Mapeamento:
 * - formatLabel = FORMATO IMPRESSÃO
 * - technology = DIGITAL
 * - colors = COR (K = "1x0", CMYK = "4x4")
 * - unitPrice = PREÇO POR IMPRESSÃO
 */

interface ExcelPrinting {
  formato: string;
  cor: string;
  preco: number;
}

function parseColor(cor: string): string {
  const c = cor.toUpperCase().trim();
  if (c === 'K' || c === '1') return '1x0';
  if (c === 'CMYK' || c === '4') return '4x4';
  if (c.includes('4')) return '4x4';
  if (c.includes('1')) return '1x0';
  return '1x0'; // default
}

function loadExcelData(): ExcelPrinting[] {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets['IMPRESSÃO'];
  
  if (!worksheet) {
    throw new Error('Aba IMPRESSÃO não encontrada no Excel');
  }

  const excelData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: null,
    raw: false 
  }) as any[][];

  const printings: ExcelPrinting[] = [];
  
  // Encontra header
  let headerRow = -1;
  for (let i = 0; i < Math.min(5, excelData.length); i++) {
    if (excelData[i] && String(excelData[i][0] || '').toUpperCase().includes('FORMATO')) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error('Header não encontrado na aba IMPRESSÃO');
  }

  // Processa dados
  for (let i = headerRow + 1; i < excelData.length; i++) {
    const row = excelData[i];
    if (!row || row.length < 3) continue;

    const formato = String(row[0] || '').trim();
    const cor = String(row[1] || '').trim();
    const precoRaw = row[2];

    if (!formato || formato === 'FORMATO IMPRESSÃO' || !cor || !precoRaw) continue;

    // Converte preço
    let preco = 0;
    if (typeof precoRaw === 'number') {
      preco = precoRaw;
    } else if (precoRaw) {
      const precoStr = String(precoRaw).replace(/[€\s]/g, '').replace(',', '.');
      preco = Number(precoStr) || 0;
    }

    if (preco === 0 || isNaN(preco)) continue;

    printings.push({
      formato,
      cor,
      preco,
    });
  }

  return printings;
}

async function upsertPrinting(excel: ExcelPrinting) {
  const formatLabel = excel.formato.trim();
  const colors = parseColor(excel.cor);
  
  // Busca impressão existente
  const existing = await prisma.printing.findFirst({
    where: {
      technology: PrintingTech.DIGITAL,
      formatLabel: { equals: formatLabel, mode: 'insensitive' },
      colors: { equals: colors },
      isCurrent: true,
    },
  });

  const data = {
    technology: PrintingTech.DIGITAL,
    formatLabel,
    colors,
    unitPrice: excel.preco,
    active: true,
    isCurrent: true,
    setupMinutes: 0,
    minFee: null,
  };

  if (existing) {
    await prisma.printing.update({
      where: { id: existing.id },
      data,
    });
    console.log(`  ~ Atualizado: ${formatLabel} (${colors}) - €${excel.preco.toFixed(4)}`);
    return existing.id;
  } else {
    const created = await prisma.printing.create({ data });
    console.log(`  + Criado: ${formatLabel} (${colors}) - €${excel.preco.toFixed(4)}`);
    return created.id;
  }
}

async function main() {
  console.log('🚀 Seed — Impressões Básicas (Aba IMPRESSÃO do Excel)\n');
  console.log('='.repeat(120));

  try {
    const excelPrintings = loadExcelData();
    console.log(`📊 Excel: ${excelPrintings.length} impressões encontradas\n`);

    let created = 0;
    let updated = 0;

    for (const excel of excelPrintings) {
      const id = await upsertPrinting(excel);
      if (id) {
        const existing = await prisma.printing.findUnique({ where: { id } });
        if (existing && existing.createdAt.getTime() > Date.now() - 5000) {
          created++;
        } else {
          updated++;
        }
      }
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n📊 RESUMO:');
    console.log(`  ✅ Criadas: ${created}`);
    console.log(`  ✅ Atualizadas: ${updated}`);
    console.log(`  📋 Total processadas: ${excelPrintings.length}\n`);
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

