import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

interface SheetInfo {
  name: string;
  rowCount: number;
  colCount: number;
  headers: string[];
  sampleRows: any[][];
  dataTypes: Record<string, string[]>;
}

function analyzeSheet(worksheet: XLSX.WorkSheet, sheetName: string): SheetInfo {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const rowCount = range.e.r + 1;
  const colCount = range.e.c + 1;
  
  // Primeira linha como headers
  const headers: string[] = [];
  for (let col = 0; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    const cell = worksheet[cellAddress];
    headers.push(cell ? String(cell.v || '').trim() : `Col${col + 1}`);
  }
  
  // Amostra das primeiras 5 linhas (após header)
  const sampleRows: any[][] = [];
  const maxSampleRows = Math.min(5, rowCount - 1);
  for (let row = 1; row <= maxSampleRows; row++) {
    const rowData: any[] = [];
    for (let col = 0; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      rowData.push(cell ? cell.v : null);
    }
    sampleRows.push(rowData);
  }
  
  // Analisa tipos de dados por coluna
  const dataTypes: Record<string, string[]> = {};
  headers.forEach((header, colIdx) => {
    const types = new Set<string>();
    for (let row = 1; row < Math.min(100, rowCount); row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: colIdx });
      const cell = worksheet[cellAddress];
      if (cell) {
        const value = cell.v;
        if (value === null || value === undefined) {
          types.add('null');
        } else if (typeof value === 'number') {
          types.add('number');
        } else if (typeof value === 'boolean') {
          types.add('boolean');
        } else if (typeof value === 'string') {
          if (value.trim() === '') {
            types.add('empty');
          } else {
            types.add('string');
          }
        } else if (value instanceof Date) {
          types.add('date');
        }
      } else {
        types.add('null');
      }
    }
    dataTypes[header] = Array.from(types);
  });
  
  return {
    name: sheetName,
    rowCount,
    colCount,
    headers,
    sampleRows,
    dataTypes,
  };
}

function main() {
  console.log('📊 Analisando arquivo Excel...\n');
  console.log(`Arquivo: ${EXCEL_FILE}\n`);
  
  if (!fs.existsSync(EXCEL_FILE)) {
    console.error(`❌ Arquivo não encontrado: ${EXCEL_FILE}`);
    process.exit(1);
  }
  
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheetNames = workbook.SheetNames;
  
  console.log(`📋 Total de abas: ${sheetNames.length}\n`);
  console.log('='.repeat(100));
  
  const allSheetsInfo: SheetInfo[] = [];
  
  for (const sheetName of sheetNames) {
    console.log(`\n📄 ABA: "${sheetName}"`);
    console.log('-'.repeat(100));
    
    const worksheet = workbook.Sheets[sheetName];
    const info = analyzeSheet(worksheet, sheetName);
    allSheetsInfo.push(info);
    
    console.log(`   Linhas: ${info.rowCount}`);
    console.log(`   Colunas: ${info.colCount}`);
    console.log(`   Headers (${info.headers.length}):`);
    info.headers.forEach((h, i) => {
      if (h && h.trim()) {
        console.log(`     ${i + 1}. ${h}`);
      }
    });
    
    if (info.sampleRows.length > 0) {
      console.log(`\n   Amostra de dados (primeiras ${info.sampleRows.length} linhas):`);
      console.log(`   ${info.headers.map(h => h.substring(0, 15).padEnd(15)).join(' | ')}`);
      info.sampleRows.forEach((row, idx) => {
        const rowStr = row.map((cell: any) => {
          if (cell === null || cell === undefined) return 'null'.padEnd(15);
          const str = String(cell).substring(0, 15);
          return str.padEnd(15);
        }).join(' | ');
        console.log(`   ${rowStr}`);
      });
    }
    
    console.log(`\n   Tipos de dados por coluna:`);
    Object.entries(info.dataTypes).forEach(([header, types]) => {
      if (header && header.trim()) {
        console.log(`     ${header}: ${types.join(', ')}`);
      }
    });
  }
  
  // Resumo geral
  console.log('\n' + '='.repeat(100));
  console.log('\n📊 RESUMO GERAL:\n');
  console.log('Abas encontradas:');
  allSheetsInfo.forEach((info, idx) => {
    console.log(`  ${idx + 1}. ${info.name} (${info.rowCount} linhas, ${info.colCount} colunas)`);
  });
  
  // Salva um relatório JSON
  const reportPath = path.resolve(process.cwd(), 'data', 'excel-analysis.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(allSheetsInfo, null, 2), 'utf-8');
  console.log(`\n✅ Relatório detalhado salvo em: ${reportPath}`);
}

main();

