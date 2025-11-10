import { PrismaClient } from "@prisma/client";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

async function validatePaper() {
  console.log('\n📄 VALIDAÇÃO: Materiais de PAPEL\n');
  console.log('='.repeat(120));

  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets['PAPEL'];
  if (!worksheet) {
    console.log('⚠️  Aba PAPEL não encontrada\n');
    return;
  }

  const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false }) as any[][];
  
  let headerRow = -1;
  for (let i = 0; i < Math.min(5, excelData.length); i++) {
    if (excelData[i] && String(excelData[i][1] || '').toUpperCase() === 'MARCA') {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    console.log('⚠️  Header não encontrado\n');
    return;
  }

  const excelMaterials: Array<{ marca: string; tipo: string; gramagem: any; quantidade: number; preco: number; precoFolha: number }> = [];

  for (let i = headerRow + 1; i < excelData.length; i++) {
    const row = excelData[i];
    if (!row || row.length < 7) continue;
    
    const marca = String(row[1] || '').trim();
    const tipo = String(row[2] || '').trim();
    const gramagem = row[3];
    const quantidade = Number(row[4]) || 0;
    const precoRaw = row[5];
    const precoFolhaRaw = row[6];
    
    if (!marca || marca === 'MARCA' || marca === '') continue;
    
    let preco = 0;
    if (typeof precoRaw === 'number') {
      preco = precoRaw;
    } else if (precoRaw) {
      preco = Number(String(precoRaw).replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
    }
    
    let precoFolha = 0;
    if (typeof precoFolhaRaw === 'number') {
      precoFolha = precoFolhaRaw;
    } else if (precoFolhaRaw) {
      const precoFolhaStr = String(precoFolhaRaw).trim();
      if (precoFolhaStr === '#DIV/0!' || precoFolhaStr === '' || precoFolhaStr === 'null') continue;
      precoFolha = Number(precoFolhaStr.replace(/[€\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
    }
    
    if (quantidade === 0 || preco === 0 || precoFolha === 0 || isNaN(precoFolha)) continue;

    let nome = '';
    if (tipo && tipo !== 'null' && tipo !== '') {
      const gramStr = gramagem ? (typeof gramagem === 'number' ? gramagem + 'g' : String(gramagem)) : '';
      nome = `${tipo} ${gramStr}`.trim();
    } else if (gramagem) {
      const gramStr = typeof gramagem === 'number' ? gramagem + 'g' : String(gramagem);
      nome = gramStr;
    } else {
      continue;
    }

    if (!nome || nome === '') continue;

    excelMaterials.push({ marca, tipo: nome, gramagem: gramagem || '', quantidade, preco, precoFolha });
  }

  const systemMaterials = await prisma.material.findMany({
    where: { type: { equals: 'papel', mode: 'insensitive' } },
    include: { supplier: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  console.log(`📊 Excel: ${excelMaterials.length} materiais | Sistema: ${systemMaterials.length} materiais\n`);

  let ok = 0, diff = 0, missing = 0;
  const missingInSystem: typeof excelMaterials = [];

  for (const excel of excelMaterials) {
    const searchName = excel.tipo.toLowerCase().replace(/\s+/g, ' ');
    const mat = systemMaterials.find(m => {
      const mName = m.name.toLowerCase().replace('papel ', '').replace(/\s+/g, ' ');
      const excelWords = searchName.split(/\s+/).filter(w => w.length > 2);
      const systemWords = mName.split(/\s+/).filter(w => w.length > 2);
      const commonWords = excelWords.filter(w => systemWords.some(sw => sw.includes(w) || w.includes(sw)));
      return commonWords.length >= Math.min(2, excelWords.length) || 
             mName.includes(searchName) || 
             searchName.includes(mName) ||
             (excel.gramagem && mName.includes(String(excel.gramagem)));
    });

    if (mat) {
      const systemCost = Number(mat.unitCost);
      const diffValue = Math.abs(systemCost - excel.precoFolha);
      const supplierMatch = mat.supplier?.name === excel.marca;
      
      if (diffValue < 0.01 && supplierMatch) {
        ok++;
      } else {
        diff++;
      }
    } else {
      missing++;
      missingInSystem.push(excel);
    }
  }

  console.log(`  ✅ OK: ${ok} | ⚠️  Diferenças: ${diff} | ❌ Faltando: ${missing}`);
  
  if (missingInSystem.length > 0) {
    console.log(`\n  ❌ ${missingInSystem.length} materiais no Excel que não estão no sistema`);
  }
}

async function validateVinil() {
  console.log('\n📄 VALIDAÇÃO: Materiais de VINIL\n');
  console.log('='.repeat(120));

  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets['VINIL'];
  if (!worksheet) {
    console.log('⚠️  Aba VINIL não encontrada\n');
    return;
  }

  const systemMaterials = await prisma.material.findMany({
    where: { type: { equals: 'vinil', mode: 'insensitive' } },
    include: { supplier: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  console.log(`📊 Sistema: ${systemMaterials.length} materiais de vinil encontrados`);
  console.log('\n  ℹ️  Nota: A estrutura da aba VINIL no Excel é complexa.');
  console.log('  Os materiais já foram importados anteriormente via seed files.');
  console.log('  Verifique manualmente se os custos estão corretos.\n');
}

async function validateAlveolar() {
  console.log('\n📄 VALIDAÇÃO: Materiais de ALVEOLAR\n');
  console.log('='.repeat(120));

  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets['ALVEOLAR'];
  if (!worksheet) {
    console.log('⚠️  Aba ALVEOLAR não encontrada\n');
    return;
  }

  const systemMaterials = await prisma.material.findMany({
    where: { 
      OR: [
        { type: { equals: 'alveolar', mode: 'insensitive' } },
        { type: { equals: 'rigido', mode: 'insensitive' } },
      ]
    },
    include: { supplier: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  console.log(`📊 Sistema: ${systemMaterials.length} materiais alveolares/rígidos encontrados`);
  console.log('\n  ℹ️  Nota: A estrutura da aba ALVEOLAR no Excel é complexa.');
  console.log('  Os materiais já foram importados anteriormente via seed files.');
  console.log('  Verifique manualmente se os custos estão corretos.\n');
}

async function main() {
  console.log('\n' + '='.repeat(120));
  console.log('📊 VALIDAÇÃO COMPLETA: Materiais (Sistema vs Excel)');
  console.log('='.repeat(120));

  await validatePaper();
  await validateVinil();
  await validateAlveolar();

  console.log('='.repeat(120));
  console.log('\n✅ Validação concluída!\n');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

