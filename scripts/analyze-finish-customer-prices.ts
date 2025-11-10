import * as XLSX from 'xlsx';
import * as path from 'path';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Script para analisar preços de acabamentos por cliente no Excel
 */

function analyzeSheetForCustomerFinishPrices(sheetName: string) {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    return null;
  }

  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false }) as any[][];
  
  // Procura por coluna CLIENTE
  let headerRow = -1;
  let clienteCol = -1;
  let finishCols: number[] = [];
  let precoCols: number[] = [];
  
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || '').toUpperCase().trim();
      if (cell === 'CLIENTE') {
        headerRow = i;
        clienteCol = j;
      }
      if (cell.includes('PLASTIFICAÇÃO') || cell.includes('FOIL') || cell.includes('VINCO') || cell.includes('DOBRA') || cell.includes('CORTE')) {
        finishCols.push(j);
      }
      if ((cell.includes('CUSTO') || cell.includes('PREÇO') || cell.includes('VALOR')) && !cell.includes('TOTAL')) {
        precoCols.push(j);
      }
    }
    if (headerRow !== -1) break;
  }

  if (headerRow === -1 || clienteCol === -1) {
    return null;
  }

  const results: Array<{ cliente: string; finish: string; preco: number; linha: number }> = [];

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[clienteCol]) continue;

    const cliente = String(row[clienteCol]).trim();
    if (!cliente || cliente === 'CLIENTE' || cliente.length < 2) continue;

    // Procura preços de acabamentos nas colunas identificadas
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || '').trim();
      if (!cell) continue;

      // Verifica se é um acabamento conhecido
      const finishTypes = ['PLASTIFICAÇÃO', 'FOIL', 'VINCO', 'DOBRA', 'CORTE'];
      const isFinish = finishTypes.some(ft => cell.toUpperCase().includes(ft));
      
      if (isFinish) {
        // Procura preço nas colunas adjacentes
        for (let k = j + 1; k < Math.min(j + 5, row.length); k++) {
          const precoRaw = row[k];
          if (!precoRaw) continue;

          let preco = 0;
          if (typeof precoRaw === 'number') {
            preco = precoRaw;
          } else {
            const precoStr = String(precoRaw).replace(/[€\s]/g, '').replace(',', '.');
            preco = Number(precoStr) || 0;
          }

          if (preco > 0) {
            results.push({
              cliente,
              finish: cell,
              preco,
              linha: i,
            });
            break;
          }
        }
      }
    }
  }

  return results.length > 0 ? results : null;
}

function main() {
  console.log('🔍 Analisando preços de acabamentos por cliente no Excel\n');
  console.log('='.repeat(120));

  const sheetsToCheck = [
    'PRODUTOS PUBLICITÁRIOS',
    'CARTÕES DE VISITA',
    'CÁLCULO CATALOGOS',
    'PASTAS PARA A4',
    'IMPRESSÕES SINGULARES',
  ];

  const allResults: Array<{ cliente: string; finish: string; preco: number; aba: string }> = [];

  for (const sheetName of sheetsToCheck) {
    console.log(`\n📊 Analisando aba: ${sheetName}`);
    const results = analyzeSheetForCustomerFinishPrices(sheetName);
    
    if (results) {
      console.log(`   ✅ Encontrados ${results.length} preços de acabamentos por cliente`);
      results.forEach(r => {
        allResults.push({ ...r, aba: sheetName });
        console.log(`      - ${r.cliente}: ${r.finish} = €${r.preco.toFixed(2)}`);
      });
    } else {
      console.log(`   ⚠️  Nenhum preço de acabamento por cliente encontrado`);
    }
  }

  console.log('\n' + '='.repeat(120));
  console.log('\n📊 RESUMO GERAL:');
  console.log(`  Total de preços encontrados: ${allResults.length}`);

  if (allResults.length > 0) {
    // Agrupa por cliente
    const byCustomer = new Map<string, Array<{ finish: string; preco: number; aba: string }>>();
    for (const r of allResults) {
      const existing = byCustomer.get(r.cliente) || [];
      existing.push({ finish: r.finish, preco: r.preco, aba: r.aba });
      byCustomer.set(r.cliente, existing);
    }

    console.log('\n📋 Preços por cliente:\n');
    for (const [cliente, precos] of Array.from(byCustomer.entries()).sort()) {
      console.log(`👤 ${cliente}:`);
      precos.forEach(p => {
        console.log(`   - ${p.finish}: €${p.preco.toFixed(2)} (${p.aba})`);
      });
      console.log('');
    }
  } else {
    console.log('\n⚠️  Nenhum preço de acabamento específico por cliente encontrado no Excel.');
    console.log('   Os acabamentos usam preços padrão para todos os clientes.\n');
  }
}

main();

