import { PrismaClient, PrintingTech } from "@prisma/client";
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Script para validar/atualizar impressões de Grande Formato da aba "IMP. GRANDE FORMATO"
 * 
 * Estrutura do Excel:
 * - IMPRESSÃO (ex: Caixas de Luz, Impressão de Lona, Vinil Microperfurado)
 * - FORNECEDOR (ex: Leiripantone, NHM, BE EXPO.)
 * - Preço m²
 * - Quant. m²
 * - CUSTO PRODUÇÃO
 * - % LUCRO
 * - TOTAL
 * 
 * Mapeamento:
 * - formatLabel = IMPRESSÃO
 * - technology = GRANDE_FORMATO
 * - unitPrice = Preço m² (convertido para preço por m²)
 * - Nota: Fornecedor pode ser armazenado em notes ou criar relação futura
 */

interface ExcelGrandeFormato {
  impressao: string;
  fornecedor: string;
  precoM2: number;
  quantidadeM2?: number;
  custoProducao?: number;
  percentualLucro?: number;
  total?: number;
  maoObra?: string;
}

function loadExcelData(): ExcelGrandeFormato[] {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets['IMP. GRANDE FORMATO'];
  
  if (!worksheet) {
    throw new Error('Aba IMP. GRANDE FORMATO não encontrada no Excel');
  }

  const excelData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: null,
    raw: false 
  }) as any[][];

  const printings: ExcelGrandeFormato[] = [];
  
  // Encontra header
  let headerRow = -1;
  for (let i = 0; i < Math.min(5, excelData.length); i++) {
    if (excelData[i] && String(excelData[i][0] || '').toUpperCase().includes('IMPRESSÃO')) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error('Header não encontrado na aba IMP. GRANDE FORMATO');
  }

  // Processa dados
  for (let i = headerRow + 1; i < excelData.length; i++) {
    const row = excelData[i];
    if (!row || row.length < 3) continue;

    const impressao = String(row[0] || '').trim();
    const fornecedor = String(row[1] || '').trim();
    const precoM2Raw = row[2];

    if (!impressao || impressao === 'IMPRESSÃO' || !fornecedor || !precoM2Raw) continue;

    // Converte preço m²
    let precoM2 = 0;
    if (typeof precoM2Raw === 'number') {
      precoM2 = precoM2Raw;
    } else if (precoM2Raw) {
      const precoStr = String(precoM2Raw).replace(/[€\s]/g, '').replace(',', '.');
      precoM2 = Number(precoStr) || 0;
    }

    if (precoM2 === 0 || isNaN(precoM2)) continue;

    // Campos opcionais
    const quantidadeM2 = row[3] ? Number(row[3]) || undefined : undefined;
    const custoProducao = row[5] ? Number(row[5]) || undefined : undefined;
    const percentualLucro = row[6] ? Number(String(row[6]).replace('%', '').replace(',', '.')) || undefined : undefined;
    const total = row[7] ? Number(row[7]) || undefined : undefined;
    const maoObra = row[9] ? String(row[9]).trim() : undefined;

    printings.push({
      impressao,
      fornecedor,
      precoM2,
      quantidadeM2,
      custoProducao,
      percentualLucro,
      total,
      maoObra,
    });
  }

  return printings;
}

async function upsertPrinting(excel: ExcelGrandeFormato) {
  const formatLabel = excel.impressao.trim();
  
  // Busca impressão existente
  const existing = await prisma.printing.findFirst({
    where: {
      technology: PrintingTech.GRANDE_FORMATO,
      formatLabel: { equals: formatLabel, mode: 'insensitive' },
      isCurrent: true,
    },
  });

  // Monta formatLabel com fornecedor se necessário
  const fullLabel = excel.fornecedor 
    ? `${formatLabel} – ${excel.fornecedor}`
    : formatLabel;

  const data = {
    technology: PrintingTech.GRANDE_FORMATO,
    formatLabel: fullLabel,
    unitPrice: excel.precoM2,
    active: true,
    isCurrent: true,
    setupMinutes: 0,
    minFee: null,
    // Nota: Podemos armazenar informações adicionais em um campo JSON futuro
  };

  if (existing) {
    await prisma.printing.update({
      where: { id: existing.id },
      data,
    });
    console.log(`  ~ Atualizado: ${fullLabel} - €${excel.precoM2.toFixed(2)}/m²`);
    return existing.id;
  } else {
    const created = await prisma.printing.create({ data });
    console.log(`  + Criado: ${fullLabel} - €${excel.precoM2.toFixed(2)}/m²`);
    return created.id;
  }
}

async function main() {
  console.log('🚀 Patch — Impressões Grande Formato (Aba IMP. GRANDE FORMATO)\n');
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

