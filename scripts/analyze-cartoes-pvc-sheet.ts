import * as XLSX from 'xlsx';
import * as path from 'path';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

function main() {
  console.log('📊 Analisando aba CARTOES PVC do Excel\n');
  console.log('='.repeat(120));

  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheet = workbook.Sheets['CARTOES PVC'];
  
  if (!sheet) {
    console.error('❌ Aba "CARTOES PVC" não encontrada');
    return;
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][];
  
  console.log(`📋 Total de linhas: ${data.length}\n`);

  // Mostrar primeiras 20 linhas
  console.log('📋 Primeiras 20 linhas:\n');
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row || row.every(c => !c)) continue;
    
    console.log(`Linha ${i + 1}:`);
    row.forEach((cell, j) => {
      if (cell) {
        console.log(`  Col ${j}: "${String(cell).substring(0, 60)}"`);
      }
    });
    console.log('');
  }
}

main();

