import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Script para extrair TODOS os preços por cliente de TODAS as abas do Excel
 */

interface CustomerPrice {
  cliente: string;
  tipo: 'material' | 'impressao' | 'acabamento';
  nome: string;
  preco: number;
  unidade?: string;
  observacoes?: string;
  aba: string;
}

function extractAllCustomerPrices(): CustomerPrice[] {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const prices: CustomerPrice[] = [];

  // Aba PRODUTOS PUBLICITÁRIOS
  const produtosSheet = workbook.Sheets['PRODUTOS PUBLICITÁRIOS'];
  if (produtosSheet) {
    const data = XLSX.utils.sheet_to_json(produtosSheet, { header: 1, defval: null, raw: false }) as any[][];
    
    let headerRow = -1;
    for (let i = 0; i < Math.min(5, data.length); i++) {
      if (data[i] && String(data[i][0] || '').toUpperCase() === 'CLIENTE') {
        headerRow = i;
        break;
      }
    }

    if (headerRow !== -1) {
      for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 8) continue;

        const cliente = String(row[0] || '').trim();
        const suporte = String(row[3] || '').trim();
        const custoSuporteRaw = row[4];
        const impressao = String(row[5] || '').trim();
        const custoImpressaoRaw = row[6];

        if (!cliente || cliente === 'CLIENTE') continue;

        // Material (suporte)
        if (suporte && custoSuporteRaw) {
          let custo = 0;
          if (typeof custoSuporteRaw === 'number') {
            custo = custoSuporteRaw;
          } else {
            const custoStr = String(custoSuporteRaw).replace(/[€\s]/g, '').replace(',', '.');
            custo = Number(custoStr) || 0;
          }
          if (custo > 0) {
            const suporteLimpo = suporte.replace(/\n/g, ' ').replace(/\s+/g, ' ').replace(/-\s*\d+[.,]?\d*\s*€/g, '').trim();
            prices.push({
              cliente,
              tipo: 'material',
              nome: suporteLimpo,
              preco: custo,
              unidade: 'UNIT',
              aba: 'PRODUTOS PUBLICITÁRIOS',
            });
          }
        }

        // Impressão
        if (impressao && custoImpressaoRaw) {
          let custo = 0;
          if (typeof custoImpressaoRaw === 'number') {
            custo = custoImpressaoRaw;
          } else {
            const custoStr = String(custoImpressaoRaw).replace(/[€\s]/g, '').replace(',', '.');
            custo = Number(custoStr) || 0;
          }
          if (custo > 0) {
            const impressaoLimpa = impressao.replace(/\n/g, ' ').replace(/\s+/g, ' ').replace(/-\s*\d+[.,]?\d*\s*€/g, '').trim();
            prices.push({
              cliente,
              tipo: 'impressao',
              nome: impressaoLimpa,
              preco: custo,
              aba: 'PRODUTOS PUBLICITÁRIOS',
            });
          }
        }
      }
    }
  }

  // Aba FLEX - pode ter preços por cliente
  const flexSheet = workbook.Sheets['FLEX'];
  if (flexSheet) {
    const data = XLSX.utils.sheet_to_json(flexSheet, { header: 1, defval: null, raw: false }) as any[][];
    
    // Procura por coluna CLIENTE
    let headerRow = -1;
    let clienteCol = -1;
    
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row) continue;
      
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').toUpperCase().trim();
        if (cell === 'CLIENTE') {
          headerRow = i;
          clienteCol = j;
          break;
        }
      }
      if (headerRow !== -1) break;
    }

    if (headerRow !== -1 && clienteCol !== -1) {
      // Procura coluna de preço/custo
      let precoCol = -1;
      const headerRowData = data[headerRow];
      for (let j = 0; j < headerRowData.length; j++) {
        const cell = String(headerRowData[j] || '').toUpperCase().trim();
        if (cell.includes('CUSTO') || cell.includes('PREÇO') || cell.includes('PREÇO')) {
          precoCol = j;
          break;
        }
      }

      if (precoCol !== -1) {
        for (let i = headerRow + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[clienteCol]) continue;

          const cliente = String(row[clienteCol]).trim();
          const precoRaw = row[precoCol];

          if (!cliente || cliente === 'CLIENTE' || !precoRaw) continue;

          let preco = 0;
          if (typeof precoRaw === 'number') {
            preco = precoRaw;
          } else {
            const precoStr = String(precoRaw).replace(/[€\s]/g, '').replace(',', '.');
            preco = Number(precoStr) || 0;
          }

          if (preco > 0) {
            // Tenta identificar se é material ou impressão baseado no contexto
            // Por padrão, FLEX geralmente são materiais
            prices.push({
              cliente,
              tipo: 'material',
              nome: 'FLEX',
              preco,
              unidade: 'M2',
              aba: 'FLEX',
            });
          }
        }
      }
    }
  }

  return prices;
}

function main() {
  console.log('\n🔍 Extraindo TODOS os preços por cliente de TODAS as abas\n');
  console.log('='.repeat(120));

  const prices = extractAllCustomerPrices();
  
  console.log(`\n📊 Total de preços encontrados: ${prices.length}\n`);
  
  // Agrupa por cliente
  const byCustomer = new Map<string, CustomerPrice[]>();
  for (const price of prices) {
    const existing = byCustomer.get(price.cliente) || [];
    existing.push(price);
    byCustomer.set(price.cliente, existing);
  }

  console.log('CLIENTE'.padEnd(30) + 'MATERIAIS'.padEnd(10) + 'IMPRESSÕES'.padEnd(10) + 'ACABAMENTOS'.padEnd(10) + 'TOTAL');
  console.log('-'.repeat(120));

  for (const [cliente, preços] of Array.from(byCustomer.entries()).sort()) {
    const materiais = preços.filter(p => p.tipo === 'material').length;
    const impressoes = preços.filter(p => p.tipo === 'impressao').length;
    const acabamentos = preços.filter(p => p.tipo === 'acabamento').length;
    const total = preços.length;
    
    console.log(
      cliente.padEnd(30) +
      String(materiais).padEnd(10) +
      String(impressoes).padEnd(10) +
      String(acabamentos).padEnd(10) +
      String(total)
    );
  }

  console.log('\n' + '='.repeat(120));
  console.log('\n📋 Detalhes por cliente:\n');

  for (const [cliente, preços] of Array.from(byCustomer.entries()).sort()) {
    console.log(`\n👤 ${cliente}:`);
    const materiais = preços.filter(p => p.tipo === 'material');
    const impressoes = preços.filter(p => p.tipo === 'impressao');
    const acabamentos = preços.filter(p => p.tipo === 'acabamento');

    if (materiais.length > 0) {
      console.log(`  📦 Materiais (${materiais.length}):`);
      materiais.forEach(m => {
        console.log(`     - ${m.nome}: €${m.preco.toFixed(2)} (${m.aba})`);
      });
    }

    if (impressoes.length > 0) {
      console.log(`  🖨️  Impressões (${impressoes.length}):`);
      impressoes.forEach(i => {
        console.log(`     - ${i.nome}: €${i.preco.toFixed(2)} (${i.aba})`);
      });
    }

    if (acabamentos.length > 0) {
      console.log(`  ✂️  Acabamentos (${acabamentos.length}):`);
      acabamentos.forEach(a => {
        console.log(`     - ${a.nome}: €${a.preco.toFixed(2)} (${a.aba})`);
      });
    }

    if (materiais.length === 0 && impressoes.length === 0 && acabamentos.length === 0) {
      console.log(`  ⚠️  Sem preços específicos encontrados`);
    }
  }

  // Salva em arquivo JSON
  const output = {
    total: prices.length,
    byCustomer: Object.fromEntries(byCustomer),
    allPrices: prices,
  };

  const outputPath = path.resolve(process.cwd(), 'data', 'all-customer-prices-from-excel.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\n✅ Dados salvos em: ${outputPath}\n`);
}

main();

