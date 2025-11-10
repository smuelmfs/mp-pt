import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');
const OUTPUT_FILE = path.resolve(process.cwd(), 'data', 'normalized', 'products.flex.json');

/**
 * Extrai dados de produtos FLEX do Excel e normaliza para JSON
 * Compatível com scripts/import-products-flex.ts
 */

function normalizePrice(value: any): string {
  if (!value) return "0.0000";
  const str = String(value).replace(/[€\s]/g, '').replace(',', '.');
  const num = Number(str);
  return isNaN(num) ? "0.0000" : num.toFixed(4);
}

function normalizeNumber(value: any): number {
  if (!value) return 0;
  const str = String(value).replace(/[€\s]/g, '').replace(',', '.');
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

function extractFlexProducts() {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheet = workbook.Sheets['FLEX'];
  
  if (!sheet) {
    throw new Error('Aba "FLEX" não encontrada no Excel');
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][];
  
  // Encontrar linha de cabeçalho (linha 2 tem "Medida", "Custo Unitário")
  let headerRow = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const firstCell = String(row[0] || '').toUpperCase().trim();
    if (firstCell === 'MEDIDA' && row[1] && String(row[1]).toUpperCase().includes('CUSTO')) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error('Cabeçalho não encontrado na aba FLEX');
  }

  // Extrair produtos FLEX da primeira seção (linhas 3-8 aproximadamente)
  // Estrutura: Col 0 = Medida (ex: "10 x 10"), Col 1 = Custo Unitário
  const products: Array<{
    name: string;
    widthMm: number;
    heightMm: number;
    material: {
      name: string;
      unitCost: string;
    };
    printing: {
      technology: "GRANDE_FORMATO";
      formatLabel: string;
      unitPrice: string;
    };
    suggestedQuantities: number[];
  }> = [];
  const seen = new Set<string>();

  // Processar até encontrar a linha "CLIENTE" (linha 10)
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;

    // Parar quando encontrar "CLIENTE" (início da segunda seção)
    const firstCell = String(row[0] || '').toUpperCase().trim();
    if (firstCell === 'CLIENTE') break;

    const medida = String(row[0] || '').trim(); // ex: "10 x 10", "21 x 10"
    const custoUnit = row[1]; // Col 1 = Custo Unitário

    if (!medida || !custoUnit) continue;

    // Extrair dimensões da medida (ex: "10 x 10" = 1000mm x 1000mm)
    const dimMatch = medida.match(/(\d+)\s*[xX]\s*(\d+)/);
    if (!dimMatch) continue;

    const width = Number(dimMatch[1]) * 100; // Converter de cm para mm
    const height = Number(dimMatch[2]) * 100;
    const unitCost = normalizePrice(custoUnit);

    // Validar custo
    if (Number(unitCost) === 0) continue;

    // Criar nome do produto
    const name = `Flex ${medida.replace(/\s+/g, '')}cm`; // Remove espaços: "10x10cm"
    const key = medida.replace(/\s+/g, '').toLowerCase();

    if (seen.has(key)) continue;
    seen.add(key);

    products.push({
      name,
      widthMm: width,
      heightMm: height,
      material: {
        name: "Vinil FLEX BRANCO",
        unitCost: unitCost
      },
      printing: {
        technology: "GRANDE_FORMATO",
        formatLabel: `FLEX ${medida.replace(/\s+/g, '')}cm`,
        unitPrice: "0.0000" // Preço vem do material
      },
      suggestedQuantities: [1, 5, 10, 25, 50, 100]
    });
  }

  return products;
}

function main() {
  console.log('📊 Extraindo Produtos FLEX do Excel...\n');
  console.log('='.repeat(120));

  try {
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const products = extractFlexProducts();
    console.log(`✅ ${products.length} produtos FLEX extraídos\n`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2), 'utf-8');
    console.log(`💾 Arquivo salvo: ${OUTPUT_FILE}\n`);

    if (products.length > 0) {
      console.log('📋 Amostra (primeiros 3 produtos):\n');
      products.slice(0, 3).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name} (${p.widthMm}x${p.heightMm}mm) - €${p.material.unitCost}`);
      });
    }

    console.log('\n' + '='.repeat(120));
    console.log('\n✅ Extração concluída!\n');
    console.log('Próximo passo: Execute `npm run import:flex`\n');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();

