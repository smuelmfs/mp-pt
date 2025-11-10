import { PrismaClient, FinishCategory, Unit, FinishCalcType } from "@prisma/client";
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Seed para importar acabamentos (cortes) da aba "ACABAMENTO" do Excel
 * 
 * Estrutura do Excel:
 * - FORMATO (ex: NORMAL, A5, A4, A3, etc.)
 * - VALOR (ex: 0.02 €)
 * - QUANTIDADE
 * - VALOR TOTAL
 * 
 * Mapeamento:
 * - name = FORMATO
 * - category = CORTE
 * - unit = SHEET (assumir)
 * - baseCost = VALOR
 * - calcType = PER_UNIT
 */

interface ExcelFinish {
  formato: string;
  valor: number;
  quantidade?: number;
}

function loadExcelData(): ExcelFinish[] {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets['ACABAMENTO'];
  
  if (!worksheet) {
    throw new Error('Aba ACABAMENTO não encontrada no Excel');
  }

  const excelData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: null,
    raw: false 
  }) as any[][];

  const finishes: ExcelFinish[] = [];
  
  // Encontra header (procura por "FORMATO")
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, excelData.length); i++) {
    const row = excelData[i];
    if (row && String(row[0] || '').toUpperCase().trim() === 'FORMATO') {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error('Header não encontrado na aba ACABAMENTO');
  }

  // Processa dados
  for (let i = headerRow + 1; i < excelData.length; i++) {
    const row = excelData[i];
    if (!row || row.length < 2) continue;

    const formato = String(row[0] || '').trim();
    const valorRaw = row[1];
    const quantidadeRaw = row[2];

    if (!formato || formato === 'FORMATO' || !valorRaw) continue;

    // Converte valor
    let valor = 0;
    if (typeof valorRaw === 'number') {
      valor = valorRaw;
    } else if (valorRaw) {
      const valorStr = String(valorRaw).replace(/[€\s]/g, '').replace(',', '.');
      valor = Number(valorStr) || 0;
    }

    if (valor === 0 || isNaN(valor)) continue;

    // Converte quantidade (opcional)
    let quantidade: number | undefined = undefined;
    if (quantidadeRaw) {
      if (typeof quantidadeRaw === 'number') {
        quantidade = quantidadeRaw;
      } else {
        quantidade = Number(quantidadeRaw) || undefined;
      }
    }

    finishes.push({
      formato,
      valor,
      quantidade,
    });
  }

  return finishes;
}

async function upsertFinish(excel: ExcelFinish) {
  const name = excel.formato.trim();
  
  // Busca acabamento existente
  const existing = await prisma.finish.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      category: FinishCategory.CORTE,
      isCurrent: true,
    },
  });

  const data = {
    name,
    category: FinishCategory.CORTE,
    unit: Unit.SHEET,
    baseCost: excel.valor,
    calcType: FinishCalcType.PER_UNIT,
    active: true,
    isCurrent: true,
    marginDefault: null,
    minFee: null,
    areaStepM2: null,
    minPerPiece: null,
    lossFactor: null,
  };

  if (existing) {
    await prisma.finish.update({
      where: { id: existing.id },
      data,
    });
    console.log(`  ~ Atualizado: ${name} - €${excel.valor.toFixed(4)}`);
    return existing.id;
  } else {
    const created = await prisma.finish.create({ data });
    console.log(`  + Criado: ${name} - €${excel.valor.toFixed(4)}`);
    return created.id;
  }
}

async function main() {
  console.log('🚀 Seed — Acabamentos (Cortes) - Aba ACABAMENTO do Excel\n');
  console.log('='.repeat(120));

  try {
    const excelFinishes = loadExcelData();
    console.log(`📊 Excel: ${excelFinishes.length} acabamentos encontrados\n`);

    let created = 0;
    let updated = 0;

    for (const excel of excelFinishes) {
      const id = await upsertFinish(excel);
      if (id) {
        const existing = await prisma.finish.findUnique({ where: { id } });
        if (existing && existing.createdAt.getTime() > Date.now() - 5000) {
          created++;
        } else {
          updated++;
        }
      }
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n📊 RESUMO:');
    console.log(`  ✅ Criados: ${created}`);
    console.log(`  ✅ Atualizados: ${updated}`);
    console.log(`  📋 Total processados: ${excelFinishes.length}\n`);
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

