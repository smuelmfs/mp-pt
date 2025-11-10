import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

function main() {
  console.log('\n' + '='.repeat(120));
  console.log('📊 RESUMO ESTRUTURADO DO EXCEL "CÁLCULO DE PRODUÇÃO 2024.xlsx"');
  console.log('='.repeat(120) + '\n');

  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`❌ Arquivo não encontrado: ${EXCEL_FILE}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(EXCEL_FILE);
  
  const categories = {
    'MATERIAIS': ['PAPEL', 'VINIL', 'ALVEOLAR'],
    'IMPRESSÕES': ['IMPRESSÃO', 'IMPRESSÕES SINGULARES', 'IMP. GRANDE FORMATO', 'IMPRESSÃO UV'],
    'ACABAMENTOS': ['ACABAMENTO'],
    'PRODUTOS': ['CARTÕES DE VISITA', 'CÁLCULO CATALOGOS', 'ENVELOPES', 'PASTAS PARA A4', 'FLEX', 'CARTOES PVC', 'PRODUTOS PUBLICITÁRIOS'],
  };

  for (const [category, sheets] of Object.entries(categories)) {
    console.log(`\n📁 ${category}:`);
    console.log('-'.repeat(120));
    
    for (const sheetName of sheets) {
      if (!workbook.SheetNames.includes(sheetName)) continue;
      
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      const rowCount = range.e.r + 1;
      const colCount = range.e.c + 1;
      
      // Lê headers
      const headers: string[] = [];
      for (let col = 0; col <= Math.min(range.e.c, 10); col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        const cell = worksheet[cellAddress];
        headers.push(cell ? String(cell.v || '').trim().substring(0, 20) : '');
      }
      
      console.log(`\n  📄 ${sheetName}`);
      console.log(`     Linhas: ${rowCount} | Colunas: ${colCount}`);
      console.log(`     Principais colunas: ${headers.filter(h => h).join(', ')}`);
      
      // Amostra de dados
      const sample: any[] = [];
      for (let row = 1; row <= Math.min(3, rowCount - 1); row++) {
        const rowData: any[] = [];
        for (let col = 0; col <= Math.min(range.e.c, 5); col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          if (cell && cell.v !== null && cell.v !== undefined) {
            const val = String(cell.v).substring(0, 15);
            rowData.push(val);
          }
        }
        if (rowData.length > 0) sample.push(rowData);
      }
      
      if (sample.length > 0) {
        console.log(`     Exemplo de dados:`);
        sample.forEach((row, idx) => {
          console.log(`       ${idx + 1}. ${row.join(' | ')}`);
        });
      }
    }
  }

  console.log('\n' + '='.repeat(120));
  console.log('\n📋 STATUS ATUAL:');
  console.log('  ✅ PAPEL - Parcialmente importado');
  console.log('  ✅ VINIL - Parcialmente importado');
  console.log('  ✅ ALVEOLAR - Parcialmente importado');
  console.log('  ✅ PRODUTOS PUBLICITÁRIOS - Parcialmente importado');
  console.log('  ⏳ Demais abas - Aguardando importação\n');
  
  console.log('💡 PRÓXIMOS PASSOS SUGERIDOS:');
  console.log('  1. Validar dados já importados (PAPEL, VINIL, ALVEOLAR)');
  console.log('  2. Importar IMPRESSÃO (impressões básicas)');
  console.log('  3. Importar ACABAMENTO (cortes)');
  console.log('  4. Importar produtos (CARTÕES DE VISITA, ENVELOPES, etc.)');
  console.log('  5. Importar IMPRESSÃO UV');
  console.log('  6. Validar e atualizar PRODUTOS PUBLICITÁRIOS\n');
}

main();

