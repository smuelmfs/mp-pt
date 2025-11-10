import { PrismaClient, PrintingTech } from "@prisma/client";
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Seed para importar impressões singulares da aba "IMPRESSÕES SINGULARES"
 * 
 * Estrutura do Excel:
 * - FORMATO DE IMPRESSÃO (ex: SRA3 CMYK FRENTE, BANNER CMYK FRENTE)
 * - CUSTO DE IMPRESSÃO
 * - FORMATO (papel)
 * - GRAMAGEM
 * - CUSTO UNITÁRIO (papel)
 * - CORTE
 * - PLASTIFICAÇÃO
 * - VINCO
 * 
 * Mapeamento:
 * - formatLabel = FORMATO DE IMPRESSÃO
 * - technology = DIGITAL
 * - unitPrice = CUSTO DE IMPRESSÃO
 * - Nota: Papel, gramagem, cortes e acabamentos são associados via produtos
 */

interface ExcelSingular {
  formatoImpressao: string;
  custoImpressao: number;
  formatoPapel?: string;
  gramagem?: number;
  custoUnitarioPapel?: number;
  corte?: string;
  plastificacao?: string;
  vinco?: string;
}

function loadExcelData(): ExcelSingular[] {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets['IMPRESSÕES SINGULARES'];
  
  if (!worksheet) {
    throw new Error('Aba IMPRESSÕES SINGULARES não encontrada no Excel');
  }

  const excelData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: null,
    raw: false 
  }) as any[][];

  const printings: ExcelSingular[] = [];
  
  // Encontra header (procura por "FORMATO DE IMPRESSÃO")
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, excelData.length); i++) {
    const row = excelData[i];
    if (row && String(row[0] || '').toUpperCase().includes('FORMATO') && 
        String(row[0] || '').toUpperCase().includes('IMPRESSÃO')) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error('Header não encontrado na aba IMPRESSÕES SINGULARES');
  }

  // Processa dados
  for (let i = headerRow + 1; i < excelData.length; i++) {
    const row = excelData[i];
    if (!row || row.length < 2) continue;

    const formatoImpressao = String(row[0] || '').trim();
    const custoImpressaoRaw = row[1];

    if (!formatoImpressao || formatoImpressao === 'FORMATO DE IMPRESSÃO' || !custoImpressaoRaw) continue;

    // Converte custo de impressão
    let custoImpressao = 0;
    if (typeof custoImpressaoRaw === 'number') {
      custoImpressao = custoImpressaoRaw;
    } else if (custoImpressaoRaw) {
      const custoStr = String(custoImpressaoRaw).replace(/[€\s]/g, '').replace(',', '.');
      custoImpressao = Number(custoStr) || 0;
    }

    if (custoImpressao === 0 || isNaN(custoImpressao)) continue;

    // Campos opcionais
    const formatoPapel = row[3] ? String(row[3]).trim() : undefined;
    const gramagem = row[4] ? Number(row[4]) || undefined : undefined;
    const custoUnitarioPapel = row[5] ? Number(row[5]) || undefined : undefined;
    const corte = row[7] ? String(row[7]).trim() : undefined;
    const plastificacao = row[10] ? String(row[10]).trim() : undefined;
    const vinco = row[15] ? String(row[15]).trim() : undefined;

    printings.push({
      formatoImpressao,
      custoImpressao,
      formatoPapel,
      gramagem,
      custoUnitarioPapel,
      corte,
      plastificacao,
      vinco,
    });
  }

  return printings;
}

async function upsertPrinting(excel: ExcelSingular) {
  const formatLabel = excel.formatoImpressao.trim();
  
  // Determina cores baseado no nome
  let colors = '4x4'; // default CMYK
  if (formatLabel.toUpperCase().includes('K') && !formatLabel.toUpperCase().includes('CMYK')) {
    colors = '1x0';
  } else if (formatLabel.toUpperCase().includes('CMYK') || formatLabel.toUpperCase().includes('4')) {
    colors = '4x4';
  }

  // Busca impressão existente
  const existing = await prisma.printing.findFirst({
    where: {
      technology: PrintingTech.DIGITAL,
      formatLabel: { equals: formatLabel, mode: 'insensitive' },
      isCurrent: true,
    },
  });

  const data = {
    technology: PrintingTech.DIGITAL,
    formatLabel,
    colors,
    unitPrice: excel.custoImpressao,
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
    console.log(`  ~ Atualizado: ${formatLabel} - €${excel.custoImpressao.toFixed(4)}`);
    return existing.id;
  } else {
    const created = await prisma.printing.create({ data });
    console.log(`  + Criado: ${formatLabel} - €${excel.custoImpressao.toFixed(4)}`);
    return created.id;
  }
}

async function main() {
  console.log('🚀 Seed — Impressões Singulares (Aba IMPRESSÕES SINGULARES)\n');
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

