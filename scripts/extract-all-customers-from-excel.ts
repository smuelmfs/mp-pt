import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Script para extrair TODOS os clientes de TODAS as abas do Excel
 */

function extractCustomersFromAllSheets(): Map<string, { sheet: string; count: number }> {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const customers = new Map<string, { sheet: string; count: number }>();

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      defval: null,
      raw: false 
    }) as any[][];

    // Procura por coluna "CLIENTE" em qualquer linha
    let headerRow = -1;
    let clienteCol = -1;
    
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row) continue;
      
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').toUpperCase().trim();
        if (cell === 'CLIENTE' || cell === 'CUSTOMER') {
          headerRow = i;
          clienteCol = j;
          break;
        }
      }
      if (headerRow !== -1) break;
    }

    if (headerRow !== -1 && clienteCol !== -1) {
      for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[clienteCol]) continue;
        
        const cliente = String(row[clienteCol]).trim();
        if (cliente && cliente !== 'CLIENTE' && cliente !== '' && cliente.length > 1) {
          const existing = customers.get(cliente);
          if (existing) {
            existing.count++;
          } else {
            customers.set(cliente, { sheet: sheetName, count: 1 });
          }
        }
      }
    }
  }

  return customers;
}

function main() {
  console.log('\n🔍 Extraindo TODOS os clientes de TODAS as abas do Excel\n');
  console.log('='.repeat(120));

  const customers = extractCustomersFromAllSheets();
  
  console.log(`\n📊 Total de clientes únicos encontrados: ${customers.size}\n`);
  console.log('CLIENTE'.padEnd(50) + 'ABA'.padEnd(30) + 'OCORRÊNCIAS');
  console.log('-'.repeat(120));

  const sorted = Array.from(customers.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  
  for (const [cliente, info] of sorted) {
    console.log(cliente.padEnd(50) + info.sheet.padEnd(30) + String(info.count));
  }

  console.log('\n' + '='.repeat(120));
  console.log('\n📋 Lista de clientes para importar:\n');
  sorted.forEach(([cliente]) => {
    console.log(`  - ${cliente}`);
  });
  console.log('');

  // Salva em arquivo JSON
  const output = {
    total: customers.size,
    customers: sorted.map(([name, info]) => ({ name, ...info })),
  };

  const outputPath = path.resolve(process.cwd(), 'data', 'all-customers-from-excel.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`✅ Dados salvos em: ${outputPath}\n`);
}

main();

