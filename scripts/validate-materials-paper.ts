import { PrismaClient } from "@prisma/client";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

async function main() {
  console.log('\n📄 VALIDAÇÃO: Materiais de PAPEL (Sistema vs Excel)\n');
  console.log('='.repeat(120));

  // Lê dados do Excel
  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets['PAPEL'];
  if (!worksheet) {
    console.error('❌ Aba PAPEL não encontrada no Excel');
    await prisma.$disconnect();
    return;
  }

  const excelData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: null,
    raw: false 
  }) as any[][];

  // Encontra linha de header
  let headerRow = -1;
  for (let i = 0; i < Math.min(5, excelData.length); i++) {
    const row = excelData[i];
    if (row && String(row[1] || '').toUpperCase() === 'MARCA') {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    console.error('❌ Header não encontrado na aba PAPEL');
    await prisma.$disconnect();
    return;
  }

  const excelMaterials: Array<{
    marca: string;
    tipo: string;
    gramagem: string | number;
    quantidade: number;
    preco: number;
    precoFolha: number;
  }> = [];

  // Lê dados a partir do header
  for (let i = headerRow + 1; i < excelData.length; i++) {
    const row = excelData[i];
    if (!row || row.length < 7) continue;
    
    const marca = String(row[1] || '').trim();
    const tipo = String(row[2] || '').trim();
    const gramagem = row[3];
    const quantidade = Number(row[4]) || 0;
    const precoRaw = row[5];
    const precoFolhaRaw = row[6];
    
    // Ignora linhas sem dados válidos
    if (!marca || marca === 'MARCA' || marca === '') continue;
    
    // Converte preço
    let preco = 0;
    if (typeof precoRaw === 'number') {
      preco = precoRaw;
    } else if (precoRaw) {
      preco = Number(String(precoRaw).replace(/[€\s]/g, '').replace(',', '.')) || 0;
    }
    
    // Converte preço por folha
    let precoFolha = 0;
    if (typeof precoFolhaRaw === 'number') {
      precoFolha = precoFolhaRaw;
    } else if (precoFolhaRaw) {
      const precoFolhaStr = String(precoFolhaRaw).trim();
      if (precoFolhaStr === '#DIV/0!' || precoFolhaStr === '' || precoFolhaStr === 'null') continue;
      precoFolha = Number(precoFolhaStr.replace(/[€\s]/g, '').replace(',', '.')) || 0;
    }
    
    if (quantidade === 0 || preco === 0 || precoFolha === 0 || isNaN(precoFolha)) continue;

    // Monta nome do material
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

    excelMaterials.push({
      marca,
      tipo: nome,
      gramagem: gramagem || '',
      quantidade,
      preco,
      precoFolha,
    });
  }

  console.log(`\n📊 Excel: ${excelMaterials.length} materiais de papel encontrados\n`);

  // Busca materiais no sistema
  const systemMaterials = await prisma.material.findMany({
    where: { type: { equals: 'papel', mode: 'insensitive' } },
    include: {
      supplier: { select: { name: true } },
      variants: { where: { isCurrent: true } },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`📊 Sistema: ${systemMaterials.length} materiais de papel encontrados\n`);

  // Comparação
  console.log('='.repeat(120));
  console.log('COMPARAÇÃO: EXCEL vs SISTEMA');
  console.log('='.repeat(120));
  console.log(
    'MATERIAL'.padEnd(50) +
    'FORNECEDOR'.padEnd(15) +
    'EXCEL (€)'.padEnd(15) +
    'SISTEMA (€)'.padEnd(15) +
    'STATUS'.padEnd(20)
  );
  console.log('-'.repeat(120));

  let ok = 0;
  let diff = 0;
  let missing = 0;
  const missingInSystem: typeof excelMaterials = [];
  const missingInExcel: typeof systemMaterials = [];

  // Compara cada material do Excel
  for (const excel of excelMaterials) {
    const searchName = excel.tipo.toLowerCase().replace(/\s+/g, ' ');
    const mat = systemMaterials.find(m => {
      const mName = m.name.toLowerCase().replace('papel ', '').replace(/\s+/g, ' ');
      // Match mais flexível
      const excelWords = searchName.split(/\s+/).filter(w => w.length > 2);
      const systemWords = mName.split(/\s+/).filter(w => w.length > 2);
      const commonWords = excelWords.filter(w => systemWords.some(sw => sw.includes(w) || w.includes(sw)));
      return commonWords.length >= Math.min(2, excelWords.length) || 
             mName.includes(searchName) || 
             searchName.includes(mName) ||
             (excel.gramagem && mName.includes(String(excel.gramagem)));
    });

    const nomeDisplay = excel.tipo.substring(0, 48).padEnd(50);
    const fornecedorDisplay = excel.marca.padEnd(15);
    const excelDisplay = `€${excel.precoFolha.toFixed(4)}`.padEnd(15);

    if (mat) {
      const systemCost = Number(mat.unitCost);
      const sistDisplay = `€${systemCost.toFixed(4)}`.padEnd(15);
      const diffValue = Math.abs(systemCost - excel.precoFolha);
      const supplierMatch = mat.supplier?.name === excel.marca;
      
      if (diffValue < 0.01 && supplierMatch) {
        console.log(nomeDisplay + fornecedorDisplay + excelDisplay + sistDisplay + '✅ OK'.padEnd(20));
        ok++;
      } else {
        let status = '⚠️ DIFERENÇA';
        if (!supplierMatch) status += ' FORN';
        if (diffValue >= 0.01) status += ` (${((diffValue/excel.precoFolha)*100).toFixed(1)}%)`;
        console.log(nomeDisplay + fornecedorDisplay + excelDisplay + sistDisplay + status.padEnd(20));
        diff++;
      }
    } else {
      console.log(nomeDisplay + fornecedorDisplay + excelDisplay + '❌ NÃO ENCONTRADO'.padEnd(15) + '❌ FALTANDO'.padEnd(20));
      missing++;
      missingInSystem.push(excel);
    }
  }

  // Materiais no sistema que não estão no Excel
  for (const mat of systemMaterials) {
    const found = excelMaterials.find(e => {
      const eName = e.tipo.toLowerCase();
      const mName = mat.name.toLowerCase().replace('papel ', '');
      return mName.includes(eName) || eName.includes(mName);
    });
    if (!found) {
      missingInExcel.push(mat);
    }
  }

  console.log('\n' + '='.repeat(120));
  console.log('\n📊 RESUMO:');
  console.log(`  ✅ OK (coerente): ${ok}`);
  console.log(`  ⚠️  Diferenças encontradas: ${diff}`);
  console.log(`  ❌ Faltando no sistema: ${missing}`);

  if (missingInSystem.length > 0) {
    console.log('\n❌ MATERIAIS NO EXCEL QUE NÃO ESTÃO NO SISTEMA:');
    missingInSystem.forEach(m => {
      console.log(`  - ${m.tipo} (${m.marca}) - €${m.precoFolha.toFixed(4)}/folha - Qty: ${m.quantidade}`);
    });
  }

  if (missingInExcel.length > 0) {
    console.log('\n📝 MATERIAIS NO SISTEMA QUE NÃO ESTÃO NO EXCEL:');
    missingInExcel.forEach(m => {
      console.log(`  - ${m.name} (${m.supplier?.name || '-'}) - €${Number(m.unitCost).toFixed(4)}/folha`);
    });
  }

  console.log('\n');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

