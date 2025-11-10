import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');
const OUTPUT_FILE = path.resolve(process.cwd(), 'data', 'normalized', 'envelopes.json');

/**
 * Extrai dados de Envelopes do Excel e normaliza para JSON
 */

interface EnvelopeData {
  printing: {
    technology: "DIGITAL";
    formatLabel: string;
    unitPrice: string;
  };
  items: Array<{
    name: string;
    format: string;
    type: "JANELA" | "S_JANELA";
    unitCost: string;
  }>;
}

function normalizePrice(value: any): string {
  if (!value) return "0.0000";
  const str = String(value).replace(/[€\s]/g, '').replace(',', '.');
  const num = Number(str);
  return isNaN(num) ? "0.0000" : num.toFixed(4);
}

function extractEnvelopes(): EnvelopeData {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheet = workbook.Sheets['ENVELOPES'];
  
  if (!sheet) {
    throw new Error('Aba "ENVELOPES" não encontrada no Excel');
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][];
  
  // Encontrar linha de cabeçalho (linha 2 tem FORMATO DE IMPRESSÃO, FORMATO, TIPO, etc.)
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const firstCell = String(row[0] || '').toUpperCase().trim();
    if (firstCell.includes('FORMATO DE IMPRESSÃO') || (firstCell.includes('FORMATO') && row[3] && String(row[3]).toUpperCase().includes('FORMATO'))) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error('Cabeçalho não encontrado na aba ENVELOPES');
  }

  // Procurar preço de impressão DL (linha 3 tem "IMPRESSÃO DL" na col 0 e preço na col 1)
  let printingPrice = "0.1200"; // Default
  for (let i = headerRow; i < Math.min(headerRow + 5, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const cell = String(row[0] || '').toUpperCase().trim();
    if (cell.includes('IMPRESSÃO DL')) {
      const price = row[1];
      if (price) {
        printingPrice = normalizePrice(price);
        break;
      }
    }
  }

  // Extrair itens de envelope (começando na linha 3, após o cabeçalho)
  // Estrutura: 
  // - Linha com formato: Col 3 = FORMATO (DL 90, DL 120), Col 4 = TIPO (JANELA), Col 5 = custo, Col 6 = qty, Col 7 = custo unit
  // - Linha sem formato: Col 4 = TIPO (S JANELA), Col 5 = custo, Col 6 = qty, Col 7 = custo unit
  const items: Array<{ name: string; format: string; type: "JANELA" | "S_JANELA"; unitCost: string }> = [];
  const seen = new Set<string>();
  let currentFormat = "";

  for (let i = headerRow + 1; i < Math.min(headerRow + 20, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    const formatRaw = String(row[3] || '').trim(); // Col 3 = FORMATO
    const typeRaw = String(row[4] || '').trim().toUpperCase(); // Col 4 = TIPO
    
    // Se tiver formato na linha, atualiza o formato atual
    if (formatRaw && formatRaw.match(/^DL\s+\d+/i)) {
      currentFormat = formatRaw;
    }
    
    // Se não tiver formato nem tipo, pula
    if (!currentFormat || !typeRaw) continue;
    
    // Tipo deve ser JANELA ou S JANELA
    if (!typeRaw.includes('JANELA')) continue;

    // Custo unitário está na col 7 (última coluna de custo)
    const costRaw = row[7] || row[5]; // Tenta col 7 primeiro, depois col 5
    if (!costRaw) continue;

    const format = currentFormat; // ex: "DL 90", "DL 120"
    const type = typeRaw.includes('S JANELA') || typeRaw.includes('S_JANELA') ? "S_JANELA" : "JANELA";
    const unitCost = normalizePrice(costRaw);
    
    // Validar se o custo faz sentido (não pode ser muito alto, que provavelmente é quantidade)
    if (Number(unitCost) > 10) continue; // Pula valores muito altos (provavelmente quantidades ou custos totais)
    
    const name = `Envelope ${format} ${type}`;
    const key = `${format}_${type}`;

    if (seen.has(key)) continue;
    seen.add(key);

    items.push({ name, format, type, unitCost });
  }

  return {
    printing: {
      technology: "DIGITAL",
      formatLabel: "DL",
      unitPrice: printingPrice
    },
    items,
    suggestedQuantities: [50, 100, 250, 500, 1000, 2000, 5000] // Quantidades sugeridas padrão
  };
}

function main() {
  console.log('📊 Extraindo Envelopes do Excel...\n');
  console.log('='.repeat(120));

  try {
    // Criar diretório se não existir
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Diretório criado: ${dir}\n`);
    }

    const data = extractEnvelopes();
    console.log(`✅ ${data.items.length} tipos de envelope extraídos\n`);
    console.log(`✅ Preço de impressão DL: €${data.printing.unitPrice}\n`);

    // Salvar JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 Arquivo salvo: ${OUTPUT_FILE}\n`);

    // Mostrar amostra
    console.log('📋 Amostra (primeiros 5 itens):\n');
    data.items.slice(0, 5).forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.name} - €${item.unitCost}`);
    });

    console.log('\n' + '='.repeat(120));
    console.log('\n✅ Extração concluída!\n');
    console.log('Próximo passo: Execute `npm run import:envelopes`\n');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();

