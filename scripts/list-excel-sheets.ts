import * as XLSX from 'xlsx';
import * as path from 'path';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

function main() {
  const workbook = XLSX.readFile(EXCEL_FILE);
  console.log('📋 Abas disponíveis no Excel:\n');
  workbook.SheetNames.forEach((name, i) => {
    console.log(`  ${i + 1}. ${name}`);
  });
}

main();

