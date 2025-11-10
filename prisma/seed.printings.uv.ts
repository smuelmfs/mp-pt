import { PrismaClient, PrintingTech } from "@prisma/client";
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Seed para importar impressões UV da aba "IMPRESSÃO UV"
 * 
 * Estrutura do Excel:
 * - Material (ex: DTF Uv, Impressão UV)
 * - Custo Unitário
 * - Calculo m² placas
 * - Medida m²
 * - Un. por gabarito
 * - CALCULO suporte imp. (PVC 3050x1220x3)
 * - Nr. Placas
 * - tamanho corte
 * - qt. por placa
 * - preço corte
 * - total
 * 
 * Mapeamento:
 * - formatLabel = Material
 * - technology = UV
 * - unitPrice = Custo Unitário (ou calculado por m²)
 */

interface ExcelUV {
  material: string;
  custoUnitario: number;
  medidaM2?: number;
  unPorGabarito?: number;
  suporte?: string;
  nrPlacas?: number;
  tamanhoCorte?: string;
  qtPorPlaca?: number;
  precoCorte?: number;
  total?: number;
}

function loadExcelData(): ExcelUV[] {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets['IMPRESSÃO UV'];
  
  if (!worksheet) {
    throw new Error('Aba IMPRESSÃO UV não encontrada no Excel');
  }

  const excelData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: null,
    raw: false 
  }) as any[][];

  const printings: ExcelUV[] = [];
  
  // Encontra header (procura por "Material" e "Custo Unitário")
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, excelData.length); i++) {
    const row = excelData[i];
    if (row && String(row[0] || '').toUpperCase().includes('MATERIAL') &&
        String(row[2] || '').toUpperCase().includes('CUSTO')) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error('Header não encontrado na aba IMPRESSÃO UV');
  }

  // Processa dados
  for (let i = headerRow + 1; i < excelData.length; i++) {
    const row = excelData[i];
    if (!row || row.length < 3) continue;

    const material = String(row[0] || '').trim();
    const custoUnitarioRaw = row[2];

    if (!material || material === 'Material' || !custoUnitarioRaw) continue;

    // Converte custo unitário
    let custoUnitario = 0;
    if (typeof custoUnitarioRaw === 'number') {
      custoUnitario = custoUnitarioRaw;
    } else if (custoUnitarioRaw) {
      const custoStr = String(custoUnitarioRaw).replace(/[€\s]/g, '').replace(',', '.');
      custoUnitario = Number(custoStr) || 0;
    }

    if (custoUnitario === 0 || isNaN(custoUnitario)) continue;

    // Campos opcionais
    const medidaM2 = row[5] ? Number(row[5]) || undefined : undefined;
    const unPorGabarito = row[7] ? Number(row[7]) || undefined : undefined;
    const suporte = row[11] ? String(row[11]).trim() : undefined;
    const nrPlacas = row[13] ? Number(row[13]) || undefined : undefined;
    const tamanhoCorte = row[14] ? String(row[14]).trim() : undefined;
    const qtPorPlaca = row[15] ? Number(row[15]) || undefined : undefined;
    const precoCorte = row[16] ? Number(row[16]) || undefined : undefined;
    const total = row[17] ? Number(row[17]) || undefined : undefined;

    printings.push({
      material,
      custoUnitario,
      medidaM2,
      unPorGabarito,
      suporte,
      nrPlacas,
      tamanhoCorte,
      qtPorPlaca,
      precoCorte,
      total,
    });
  }

  return printings;
}

async function upsertPrinting(excel: ExcelUV) {
  const formatLabel = excel.material.trim();
  
  // Busca impressão existente
  const existing = await prisma.printing.findFirst({
    where: {
      technology: PrintingTech.UV,
      formatLabel: { equals: formatLabel, mode: 'insensitive' },
      isCurrent: true,
    },
  });

  // Se tem medida m², calcula preço por m²
  let unitPrice = excel.custoUnitario;
  if (excel.medidaM2 && excel.medidaM2 > 0) {
    unitPrice = excel.custoUnitario / excel.medidaM2;
  }

  const data = {
    technology: PrintingTech.UV,
    formatLabel,
    unitPrice,
    active: true,
    isCurrent: true,
    setupMinutes: 0,
    minFee: null,
    colors: null,
  };

  if (existing) {
    await prisma.printing.update({
      where: { id: existing.id },
      data,
    });
    console.log(`  ~ Atualizado: ${formatLabel} - €${unitPrice.toFixed(4)}`);
    return existing.id;
  } else {
    const created = await prisma.printing.create({ data });
    console.log(`  + Criado: ${formatLabel} - €${unitPrice.toFixed(4)}`);
    return created.id;
  }
}

async function main() {
  console.log('🚀 Seed — Impressões UV (Aba IMPRESSÃO UV)\n');
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

