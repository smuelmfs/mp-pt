import * as XLSX from 'xlsx';
import * as path from 'path';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Script para analisar acabamentos (plastificação, vinco, dobra, foil) nas abas do Excel
 */

function analyzeSheet(sheetName: string) {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    console.log(`⚠️  Aba "${sheetName}" não encontrada`);
    return null;
  }

  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: false }) as any[][];
  
  console.log(`\n📊 Analisando aba: ${sheetName}`);
  console.log(`   Total de linhas: ${data.length}`);
  
  // Mostra primeiras linhas para entender estrutura
  console.log(`\n   Primeiras 10 linhas:`);
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (row && row.some(cell => cell !== null && cell !== '')) {
      console.log(`   Linha ${i}:`, row.slice(0, 15).map((c: any) => String(c || '').substring(0, 20)).join(' | '));
    }
  }
  
  return data;
}

function findColumnIndex(data: any[][], searchTerms: string[], maxRows = 10): number {
  for (let i = 0; i < Math.min(maxRows, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || '').toUpperCase().trim();
      for (const term of searchTerms) {
        if (cell.includes(term)) {
          return j;
        }
      }
    }
  }
  return -1;
}

function extractPlastificacao(data: any[][]) {
  console.log('\n🔍 Procurando dados de PLASTIFICAÇÃO...');
  
  const plastCol = findColumnIndex(data, ['PLASTIFICAÇÃO', 'PLASTIFICACAO', 'PLAST'], 10);
  const precoCol = findColumnIndex(data, ['PREÇO', 'PRECO', 'CUSTO', 'VALOR'], 10);
  
  if (plastCol === -1) {
    console.log('   ⚠️  Coluna de plastificação não encontrada');
    return [];
  }
  
  console.log(`   ✅ Coluna de plastificação encontrada: ${plastCol}`);
  if (precoCol !== -1) console.log(`   ✅ Coluna de preço encontrada: ${precoCol}`);
  
  const results: Array<{ tipo: string; preco: number; linha: number }> = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const plast = String(row[plastCol] || '').trim();
    if (!plast || plast === 'PLASTIFICAÇÃO' || plast.length < 2) continue;
    
    let preco = 0;
    if (precoCol !== -1 && row[precoCol]) {
      const precoStr = String(row[precoCol]).replace(/[€\s]/g, '').replace(',', '.');
      preco = Number(precoStr) || 0;
    }
    
    if (plast && (preco > 0 || plast.toLowerCase().includes('face'))) {
      results.push({ tipo: plast, preco, linha: i });
    }
  }
  
  return results;
}

function extractFoil(data: any[][]) {
  console.log('\n🔍 Procurando dados de FOIL/LAMINAÇÃO...');
  
  const foilCol = findColumnIndex(data, ['FOIL', 'LAMINAÇÃO', 'LAMINACAO'], 10);
  const precoCol = findColumnIndex(data, ['PREÇO', 'PRECO', 'CUSTO', 'VALOR'], 10);
  
  if (foilCol === -1) {
    console.log('   ⚠️  Coluna de foil não encontrada');
    return [];
  }
  
  console.log(`   ✅ Coluna de foil encontrada: ${foilCol}`);
  
  const results: Array<{ tipo: string; preco: number; linha: number }> = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const foil = String(row[foilCol] || '').trim();
    if (!foil || foil === 'FOIL' || foil.length < 2) continue;
    
    let preco = 0;
    if (precoCol !== -1 && row[precoCol]) {
      const precoStr = String(row[precoCol]).replace(/[€\s]/g, '').replace(',', '.');
      preco = Number(precoStr) || 0;
    }
    
    if (foil && (preco > 0 || foil.toLowerCase().includes('face'))) {
      results.push({ tipo: foil, preco, linha: i });
    }
  }
  
  return results;
}

function extractVinco(data: any[][]) {
  console.log('\n🔍 Procurando dados de VINCO...');
  
  const vincoCol = findColumnIndex(data, ['VINCO', 'VINCO'], 10);
  const precoCol = findColumnIndex(data, ['PREÇO', 'PRECO', 'CUSTO', 'VALOR'], 10);
  
  if (vincoCol === -1) {
    console.log('   ⚠️  Coluna de vinco não encontrada');
    return [];
  }
  
  console.log(`   ✅ Coluna de vinco encontrada: ${vincoCol}`);
  
  const results: Array<{ tipo: string; preco: number; linha: number }> = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const vinco = String(row[vincoCol] || '').trim();
    if (!vinco || vinco === 'VINCO' || vinco.length < 2) continue;
    
    let preco = 0;
    if (precoCol !== -1 && row[precoCol]) {
      const precoStr = String(row[precoCol]).replace(/[€\s]/g, '').replace(',', '.');
      preco = Number(precoStr) || 0;
    }
    
    if (vinco && preco > 0) {
      results.push({ tipo: vinco, preco, linha: i });
    }
  }
  
  return results;
}

function extractDobra(data: any[][]) {
  console.log('\n🔍 Procurando dados de DOBRA...');
  
  const dobraCol = findColumnIndex(data, ['DOBRA', 'DOBRA'], 10);
  const precoCol = findColumnIndex(data, ['PREÇO', 'PRECO', 'CUSTO', 'VALOR'], 10);
  
  if (dobraCol === -1) {
    console.log('   ⚠️  Coluna de dobra não encontrada');
    return [];
  }
  
  console.log(`   ✅ Coluna de dobra encontrada: ${dobraCol}`);
  
  const results: Array<{ tipo: string; preco: number; linha: number }> = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;
    
    const dobra = String(row[dobraCol] || '').trim();
    if (!dobra || dobra === 'DOBRA' || dobra.length < 2) continue;
    
    let preco = 0;
    if (precoCol !== -1 && row[precoCol]) {
      const precoStr = String(row[precoCol]).replace(/[€\s]/g, '').replace(',', '.');
      preco = Number(precoStr) || 0;
    }
    
    if (dobra && preco > 0) {
      results.push({ tipo: dobra, preco, linha: i });
    }
  }
  
  return results;
}

function main() {
  console.log('🔍 Análise de Acabamentos do Excel\n');
  console.log('='.repeat(120));

  const sheetsToAnalyze = [
    'CARTÕES DE VISITA',
    'CÁLCULO CATALOGOS',
    'PASTAS PARA A4',
    'IMPRESSÕES SINGULARES',
  ];

  for (const sheetName of sheetsToAnalyze) {
    const data = analyzeSheet(sheetName);
    if (!data) continue;

    const plast = extractPlastificacao(data);
    const foil = extractFoil(data);
    const vinco = extractVinco(data);
    const dobra = extractDobra(data);

    if (plast.length > 0) {
      console.log(`\n   📦 PLASTIFICAÇÃO encontrada (${plast.length} itens):`);
      const unique = new Map<string, number>();
      plast.forEach(p => {
        const key = p.tipo.toLowerCase();
        if (!unique.has(key) || unique.get(key)! < p.preco) {
          unique.set(key, p.preco);
        }
      });
      unique.forEach((preco, tipo) => {
        console.log(`      - ${tipo}: €${preco.toFixed(2)}`);
      });
    }

    if (foil.length > 0) {
      console.log(`\n   ✨ FOIL encontrado (${foil.length} itens):`);
      const unique = new Map<string, number>();
      foil.forEach(f => {
        const key = f.tipo.toLowerCase();
        if (!unique.has(key) || unique.get(key)! < f.preco) {
          unique.set(key, f.preco);
        }
      });
      unique.forEach((preco, tipo) => {
        console.log(`      - ${tipo}: €${preco.toFixed(2)}`);
      });
    }

    if (vinco.length > 0) {
      console.log(`\n   📐 VINCO encontrado (${vinco.length} itens):`);
      const unique = new Map<string, number>();
      vinco.forEach(v => {
        const key = v.tipo.toLowerCase();
        if (!unique.has(key) || unique.get(key)! < v.preco) {
          unique.set(key, v.preco);
        }
      });
      unique.forEach((preco, tipo) => {
        console.log(`      - ${tipo}: €${preco.toFixed(2)}`);
      });
    }

    if (dobra.length > 0) {
      console.log(`\n   📄 DOBRA encontrada (${dobra.length} itens):`);
      const unique = new Map<string, number>();
      dobra.forEach(d => {
        const key = d.tipo.toLowerCase();
        if (!unique.has(key) || unique.get(key)! < d.preco) {
          unique.set(key, d.preco);
        }
      });
      unique.forEach((preco, tipo) => {
        console.log(`      - ${tipo}: €${preco.toFixed(2)}`);
      });
    }
  }

  console.log('\n' + '='.repeat(120));
  console.log('\n✅ Análise concluída!\n');
}

main();

