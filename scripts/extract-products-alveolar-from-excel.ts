import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');
const OUTPUT_FILE = path.resolve(process.cwd(), 'data', 'normalized', 'products.alveolar.json');

/**
 * Extrai dados de produtos Alveolar do Excel e normaliza para JSON
 */

function normalizePrice(value: any): string {
  if (!value) return "0.0000";
  const str = String(value).replace(/[€\s]/g, '').replace(',', '.');
  const num = Number(str);
  return isNaN(num) ? "0.0000" : num.toFixed(4);
}

function extractAlveolarProducts() {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheet = workbook.Sheets['ALVEOLAR'];
  
  if (!sheet) {
    throw new Error('Aba "ALVEOLAR" não encontrada no Excel');
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][];
  
  // Encontrar linha de cabeçalho (linha 3 tem "TIPO")
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const firstCell = String(row[0] || '').toUpperCase().trim();
    if (firstCell === 'TIPO') {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error('Cabeçalho não encontrado na aba ALVEOLAR');
  }

  // Estrutura: Col 0 = TIPO, Col 5 = LARGURA (M), Col 6 = ALTURA (M), Col 4 = CUSTO M/2
  // Formato esperado pelo script: { material: {...}, product: {...} }
  const products: Array<{
    material: {
      name: string;
      unitCostM2: string;
    };
    product: {
      name: string;
      widthMm: number;
      heightMm: number;
    };
    suggestedQuantities: number[];
  }> = [];
  const seen = new Set<string>();

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;

    const tipo = String(row[0] || '').trim();
    if (!tipo || tipo.toUpperCase() === 'TIPO') continue;

    // Extrair dimensões (Col 5 = LARGURA, Col 6 = ALTURA)
    const largura = row[5] ? Number(String(row[5]).replace(',', '.')) : null;
    const altura = row[6] ? Number(String(row[6]).replace(',', '.')) : null;
    const custoM2 = row[4] || row[11]; // Col 4 = CUSTO M/2 ou Col 11 = CUSTO

    if (!largura || !altura || !custoM2) continue;

    // Converter de metros para mm
    const widthMm = Math.round(largura * 1000);
    const heightMm = Math.round(altura * 1000);
    const unitCostM2 = normalizePrice(custoM2);

    // Criar nome do produto
    const productName = `Placa Alveolar ${tipo.split('\n')[0].trim()} (${widthMm}x${heightMm}mm)`;
    const key = `${tipo}_${widthMm}_${heightMm}`.toLowerCase();

    if (seen.has(key)) continue;
    seen.add(key);

    products.push({
      material: {
        name: tipo.split('\n')[0].trim(),
        unitCostM2
      },
      product: {
        name: productName,
        widthMm,
        heightMm
      },
      suggestedQuantities: [1, 5, 10, 25, 50, 100]
    });
  }

  return products;
}

function main() {
  console.log('📊 Extraindo Produtos Alveolar do Excel...\n');
  console.log('='.repeat(120));

  try {
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const products = extractAlveolarProducts();
    console.log(`✅ ${products.length} produtos Alveolar extraídos\n`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2), 'utf-8');
    console.log(`💾 Arquivo salvo: ${OUTPUT_FILE}\n`);

    if (products.length > 0) {
      console.log('📋 Amostra (primeiros 3 produtos):\n');
      products.slice(0, 3).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.product.name}`);
        console.log(`     Material: ${p.material.name} - €${p.material.unitCostM2}/m²`);
        console.log(`     Dimensões: ${p.product.widthMm}x${p.product.heightMm}mm\n`);
      });
    }

    console.log('='.repeat(120));
    console.log('\n✅ Extração concluída!\n');
    console.log('Próximo passo: Execute `npm run import:alveolar`\n');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();

