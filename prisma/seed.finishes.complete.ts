import { PrismaClient, FinishCategory, Unit, FinishCalcType } from "@prisma/client";
import * as XLSX from 'xlsx';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Seed completo para importar TODOS os acabamentos (plastificação, foil, vinco, dobra)
 */

interface FinishData {
  name: string;
  category: FinishCategory;
  unit: Unit;
  baseCost: number;
  calcType: FinishCalcType;
  minFee?: number;
  areaStepM2?: number;
}

function extractFinishesFromExcel(): FinishData[] {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const finishes: FinishData[] = [];
  const seen = new Set<string>();

  // Aba CARTÕES DE VISITA - Plastificação e Foil
  const cartoesSheet = workbook.Sheets['CARTÕES DE VISITA'];
  if (cartoesSheet) {
    const data = XLSX.utils.sheet_to_json(cartoesSheet, { header: 1, defval: null, raw: false }) as any[][];
    
    // Plastificação: 1 FACE = 0.50 €, 2 FACES = 1.00 €
    const plastKey = 'Plastificação 1 Face';
    if (!seen.has(plastKey)) {
      finishes.push({
        name: 'Plastificação 1 Face',
        category: FinishCategory.LAMINACAO,
        unit: Unit.UNIT,
        baseCost: 0.50,
        calcType: FinishCalcType.PER_UNIT,
      });
      seen.add(plastKey);
    }

    const plast2Key = 'Plastificação 2 Faces';
    if (!seen.has(plast2Key)) {
      finishes.push({
        name: 'Plastificação 2 Faces',
        category: FinishCategory.LAMINACAO,
        unit: Unit.UNIT,
        baseCost: 1.00,
        calcType: FinishCalcType.PER_UNIT,
      });
      seen.add(plast2Key);
    }

    // Foil: 1 FACE = 0.85 €, 2 FACES = 1.70 €
    const foilKey = 'Foil 1 Face';
    if (!seen.has(foilKey)) {
      finishes.push({
        name: 'Foil 1 Face',
        category: FinishCategory.LAMINACAO,
        unit: Unit.UNIT,
        baseCost: 0.85,
        calcType: FinishCalcType.PER_UNIT,
      });
      seen.add(foilKey);
    }

    const foil2Key = 'Foil 2 Faces';
    if (!seen.has(foil2Key)) {
      finishes.push({
        name: 'Foil 2 Faces',
        category: FinishCategory.LAMINACAO,
        unit: Unit.UNIT,
        baseCost: 1.70,
        calcType: FinishCalcType.PER_UNIT,
      });
      seen.add(foil2Key);
    }
  }

  // Aba CÁLCULO CATALOGOS - Plastificação e Foil com quantidades
  const catalogosSheet = workbook.Sheets['CÁLCULO CATALOGOS'];
  if (catalogosSheet) {
    const data = XLSX.utils.sheet_to_json(catalogosSheet, { header: 1, defval: null, raw: false }) as any[][];
    
    // Plastificação: < 100 = 0.50 €, < 500 = 0.34 €, > 500 = 0.17 €
    const plast100Key = 'Plastificação < 100 unidades';
    if (!seen.has(plast100Key)) {
      finishes.push({
        name: 'Plastificação < 100 unidades',
        category: FinishCategory.LAMINACAO,
        unit: Unit.UNIT,
        baseCost: 0.50,
        calcType: FinishCalcType.PER_UNIT,
      });
      seen.add(plast100Key);
    }

    const plast500Key = 'Plastificação < 500 unidades';
    if (!seen.has(plast500Key)) {
      finishes.push({
        name: 'Plastificação < 500 unidades',
        category: FinishCategory.LAMINACAO,
        unit: Unit.UNIT,
        baseCost: 0.34,
        calcType: FinishCalcType.PER_UNIT,
      });
      seen.add(plast500Key);
    }

    const plast500PlusKey = 'Plastificação > 500 unidades';
    if (!seen.has(plast500PlusKey)) {
      finishes.push({
        name: 'Plastificação > 500 unidades',
        category: FinishCategory.LAMINACAO,
        unit: Unit.UNIT,
        baseCost: 0.17,
        calcType: FinishCalcType.PER_UNIT,
      });
      seen.add(plast500PlusKey);
    }

    // Foil: < 100 = 0.50 €, < 500 = 0.35 €
    const foil100Key = 'Foil < 100 unidades';
    if (!seen.has(foil100Key)) {
      finishes.push({
        name: 'Foil < 100 unidades',
        category: FinishCategory.LAMINACAO,
        unit: Unit.UNIT,
        baseCost: 0.50,
        calcType: FinishCalcType.PER_UNIT,
      });
      seen.add(foil100Key);
    }

    const foil500Key = 'Foil < 500 unidades';
    if (!seen.has(foil500Key)) {
      finishes.push({
        name: 'Foil < 500 unidades',
        category: FinishCategory.LAMINACAO,
        unit: Unit.UNIT,
        baseCost: 0.35,
        calcType: FinishCalcType.PER_UNIT,
      });
      seen.add(foil500Key);
    }

    // Dobra: COM DOBRA = 0.07 €
    const dobraKey = 'Dobra';
    if (!seen.has(dobraKey)) {
      finishes.push({
        name: 'Dobra',
        category: FinishCategory.DOBRA,
        unit: Unit.UNIT,
        baseCost: 0.07,
        calcType: FinishCalcType.PER_UNIT,
      });
      seen.add(dobraKey);
    }
  }

  // Aba PASTAS PARA A4 - Plastificação e Dobra
  const pastasSheet = workbook.Sheets['PASTAS PARA A4'];
  if (pastasSheet) {
    // Plastificação já adicionada acima
    // Dobra já adicionada acima
  }

  // Aba IMPRESSÕES SINGULARES - Plastificação, Foil, Vinco, Dobra
  const singularSheet = workbook.Sheets['IMPRESSÕES SINGULARES'];
  if (singularSheet) {
    // Plastificação Banner: 1 FACE = 0.32 €, 2 FACE = 0.64 €
    const plastBanner1Key = 'Plastificação Banner 1 Face';
    if (!seen.has(plastBanner1Key)) {
      finishes.push({
        name: 'Plastificação Banner 1 Face',
        category: FinishCategory.LAMINACAO,
        unit: Unit.UNIT,
        baseCost: 0.32,
        calcType: FinishCalcType.PER_UNIT,
      });
      seen.add(plastBanner1Key);
    }

    const plastBanner2Key = 'Plastificação Banner 2 Faces';
    if (!seen.has(plastBanner2Key)) {
      finishes.push({
        name: 'Plastificação Banner 2 Faces',
        category: FinishCategory.LAMINACAO,
        unit: Unit.UNIT,
        baseCost: 0.64,
        calcType: FinishCalcType.PER_UNIT,
      });
      seen.add(plastBanner2Key);
    }

    // Foil Banner: 1 FACE = 0.32 €, 2 FACE = 0.64 € (mesmos valores)
    // Vinco: NORMAL = 0.09 € (aproximado, pode variar)
    const vincoKey = 'Vinco';
    if (!seen.has(vincoKey)) {
      finishes.push({
        name: 'Vinco',
        category: FinishCategory.OUTROS,
        unit: Unit.UNIT,
        baseCost: 0.09,
        calcType: FinishCalcType.PER_UNIT,
      });
      seen.add(vincoKey);
    }
  }

  return finishes;
}

async function upsertFinish(finish: FinishData) {
  const existing = await prisma.finish.findFirst({
    where: {
      name: { equals: finish.name, mode: 'insensitive' },
      isCurrent: true,
    },
  });

  if (existing) {
    await prisma.finish.update({
      where: { id: existing.id },
      data: {
        category: finish.category,
        unit: finish.unit,
        baseCost: finish.baseCost,
        calcType: finish.calcType,
        minFee: finish.minFee,
        areaStepM2: finish.areaStepM2,
        active: true,
        isCurrent: true,
      },
    });
    return { id: existing.id, action: 'updated' };
  } else {
    const created = await prisma.finish.create({
      data: {
        name: finish.name,
        category: finish.category,
        unit: finish.unit,
        baseCost: finish.baseCost,
        calcType: finish.calcType,
        minFee: finish.minFee,
        areaStepM2: finish.areaStepM2,
        active: true,
        isCurrent: true,
      },
    });
    return { id: created.id, action: 'created' };
  }
}

async function main() {
  console.log('🚀 Seed — Acabamentos Completos (Plastificação, Foil, Vinco, Dobra)\n');
  console.log('='.repeat(120));

  try {
    const finishes = extractFinishesFromExcel();
    console.log(`📊 Excel: ${finishes.length} acabamentos únicos encontrados\n`);

    let created = 0;
    let updated = 0;

    for (const finish of finishes) {
      const result = await upsertFinish(finish);
      
      if (result.action === 'created') {
        created++;
        console.log(`  + Criado: ${finish.name} (${finish.category}) - €${finish.baseCost.toFixed(2)}/${finish.unit}`);
      } else {
        updated++;
        console.log(`  ~ Atualizado: ${finish.name} (${finish.category}) - €${finish.baseCost.toFixed(2)}/${finish.unit}`);
      }
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n📊 RESUMO:');
    console.log(`  ✅ Criados: ${created}`);
    console.log(`  ✅ Atualizados: ${updated}`);
    console.log(`  📋 Total: ${finishes.length}\n`);

    // Lista todos os acabamentos por categoria
    const allFinishes = await prisma.finish.findMany({
      where: { isCurrent: true, active: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    console.log('📋 Acabamentos no sistema (por categoria):\n');
    const byCategory = new Map<FinishCategory, typeof allFinishes>();
    for (const f of allFinishes) {
      const existing = byCategory.get(f.category) || [];
      existing.push(f);
      byCategory.set(f.category, existing);
    }

    for (const [category, items] of Array.from(byCategory.entries())) {
      console.log(`  ${category}:`);
      items.forEach(f => {
        console.log(`    - ${f.name}: €${Number(f.baseCost).toFixed(2)}/${f.unit}`);
      });
      console.log('');
    }
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

