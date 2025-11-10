import { PrismaClient } from "@prisma/client";
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

async function main() {
  console.log('\n📄 VALIDAÇÃO: Materiais de VINIL (Sistema vs Excel)\n');
  console.log('='.repeat(120));

  // Lê dados do Excel
  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets['VINIL'];
  if (!worksheet) {
    console.error('❌ Aba VINIL não encontrada no Excel');
    await prisma.$disconnect();
    return;
  }

  const excelData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1, 
    defval: null,
    raw: false 
  }) as any[][];

  // Encontra linha de header (procura por "TIPO" na primeira coluna)
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, excelData.length); i++) {
    const row = excelData[i];
    if (row && String(row[0] || '').toUpperCase().trim() === 'TIPO') {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    console.error('❌ Header não encontrado na aba VINIL');
    console.log('Primeiras linhas para debug:');
    for (let i = 0; i < Math.min(5, excelData.length); i++) {
      console.log(`  Linha ${i}:`, excelData[i]?.slice(0, 5));
    }
    await prisma.$disconnect();
    return;
  }

  const excelMaterials: Array<{
    tipo: string;
    largura: number;
    comprimento: number;
    custoFornecedor: number;
    custoM2: number;
  }> = [];

  // Lê dados a partir do header
  for (let i = headerRow + 1; i < excelData.length; i++) {
    const row = excelData[i];
    if (!row || row.length < 6) continue;
    
    const tipo = String(row[0] || '').trim();
    const largura = Number(row[1]) || 0;
    const comprimento = Number(row[2]) || 0;
    const custoFornecedor = Number(row[3]) || 0;
    const custoM2 = Number(row[4]) || 0;

    if (!tipo || tipo === 'TIPO' || largura === 0 || comprimento === 0 || custoFornecedor === 0) continue;

    excelMaterials.push({
      tipo,
      largura,
      comprimento,
      custoFornecedor,
      custoM2,
    });
  }

  console.log(`\n📊 Excel: ${excelMaterials.length} materiais de vinil encontrados\n`);

  // Busca materiais no sistema
  const systemMaterials = await prisma.material.findMany({
    where: { type: { equals: 'vinil', mode: 'insensitive' } },
    include: {
      supplier: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`📊 Sistema: ${systemMaterials.length} materiais de vinil encontrados\n`);

  // Comparação
  console.log('='.repeat(120));
  console.log('COMPARAÇÃO: EXCEL vs SISTEMA');
  console.log('='.repeat(120));
  console.log(
    'MATERIAL'.padEnd(50) +
    'EXCEL (€/m²)'.padEnd(15) +
    'SISTEMA (€/m²)'.padEnd(15) +
    'FORNECEDOR'.padEnd(15) +
    'STATUS'.padEnd(20)
  );
  console.log('-'.repeat(120));

  let ok = 0;
  let diff = 0;
  let missing = 0;
  const missingInSystem: typeof excelMaterials = [];

  for (const excel of excelMaterials) {
    const searchName = excel.tipo.toLowerCase();
    const mat = systemMaterials.find(m => {
      const mName = m.name.toLowerCase().replace('vinil ', '');
      return mName.includes(searchName) || searchName.includes(mName);
    });

    const nomeDisplay = excel.tipo.substring(0, 48).padEnd(50);
    const excelDisplay = `€${excel.custoM2.toFixed(4)}`.padEnd(15);

    if (mat) {
      const systemCost = Number(mat.unitCost);
      const systemSupplierCost = mat.supplierUnitCost ? Number(mat.supplierUnitCost) : null;
      const sistDisplay = `€${systemCost.toFixed(4)}`.padEnd(15);
      const fornecedorDisplay = (mat.supplier?.name || '-').padEnd(15);
      
      // Compara custo m² (pode ser unitCost ou supplierUnitCost)
      const compareCost = systemSupplierCost || systemCost;
      const diffValue = Math.abs(compareCost - excel.custoM2);
      
      if (diffValue < 0.01) {
        console.log(nomeDisplay + excelDisplay + sistDisplay + fornecedorDisplay + '✅ OK'.padEnd(20));
        ok++;
      } else {
        const status = `⚠️ ${((diffValue/excel.custoM2)*100).toFixed(1)}%`.padEnd(20);
        console.log(nomeDisplay + excelDisplay + sistDisplay + fornecedorDisplay + status);
        diff++;
      }
    } else {
      console.log(nomeDisplay + excelDisplay + '❌ NÃO ENCONTRADO'.padEnd(15) + '-'.padEnd(15) + '❌ FALTANDO'.padEnd(20));
      missing++;
      missingInSystem.push(excel);
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
      console.log(`  - ${m.tipo} - €${m.custoM2.toFixed(4)}/m² (${m.largura}m x ${m.comprimento}m)`);
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

