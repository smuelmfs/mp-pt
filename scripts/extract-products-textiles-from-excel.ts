import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');
const OUTPUT_FILE = path.resolve(process.cwd(), 'data', 'normalized', 'textiles.customer.json');

/**
 * Extrai dados de produtos Têxteis da aba FLEX do Excel e normaliza para JSON
 * Compatível com scripts/import-products-textiles.ts
 */

function normalizePrice(value: any): string {
  if (!value) return "0.0000";
  const str = String(value).replace(/[€\s]/g, '').replace(',', '.');
  const num = Number(str);
  return isNaN(num) ? "0.0000" : num.toFixed(4);
}

function normalizeProductType(product: string | null | undefined): string {
  if (!product) return "T-SHIRT";
  const p = String(product).toLowerCase().trim();
  if (p.includes("polo")) return "POLO";
  if (p.includes("sweat")) return "SWEAT";
  return "T-SHIRT";
}

function normalizePrintMethod(method: string | null | undefined): string {
  if (!method) return "FLEX";
  const m = String(method).toUpperCase().trim();
  if (m.includes("DTF")) return "DTF";
  if (m.includes("HEV")) return "HEV";
  return "FLEX";
}

function extractTextiles() {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheet = workbook.Sheets['FLEX'];
  
  if (!sheet) {
    throw new Error('Aba "FLEX" não encontrada no Excel');
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][];
  
  // Encontrar linha de cabeçalho de têxteis (linha 10 tem "CLIENTE")
  let headerRow = -1;
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const firstCell = String(row[0] || '').toUpperCase().trim();
    if (firstCell === 'CLIENTE' && row[1] && String(row[1]).toUpperCase().includes('PRODUTO')) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error('Cabeçalho de têxteis não encontrado na aba FLEX');
  }

  // Estrutura: Col 0 = CLIENTE, Col 1 = PRODUTO, Col 2 = MODELO, Col 3 = CUSTO SUPORTE,
  // Col 5 = IMPRESSÃO, Col 6 = FRENTE, Col 7 = VERSO, Col 8 = CUSTO IMPRESSÃO
  const items: Array<{
    customer: { name: string };
    productKey: string;
    productType: string;
    model: string;
    material: {
      name: string;
      unitCost: string;
    };
    printing: {
      formatLabel: string;
      technology: "DIGITAL";
      colors: string;
      sides: number;
      unitPrice: string;
    };
    finish?: {
      name: string;
      baseCost: string;
    };
    marginPct: number;
  }> = [];

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;

    const cliente = String(row[0] || '').trim();
    const produto = String(row[1] || '').trim();
    const modelo = String(row[2] || '').trim();
    const custoSuporte = row[3];
    const impressao = String(row[5] || '').trim().toUpperCase();
    const frente = row[6];
    const verso = row[7];
    const custoImpressao = row[8];
    const margem = row[10] ? Number(String(row[10]).replace('%', '').replace(',', '.')) : 40;

    if (!cliente || !produto || !custoSuporte) continue;
    if (cliente.toUpperCase() === 'CLIENTE') continue;

    const productType = normalizeProductType(produto);
    const printMethod = normalizePrintMethod(impressao);
    const productKey = `${productType}_BASIC`;
    
    // Determinar lados
    const sides = (frente && Number(frente) > 0) && (verso && Number(verso) > 0) ? 2 : 1;
    const colors = printMethod === "DTF" ? "CMYK" : "CMYK";
    
    // Custo de impressão
    const totalPrintCost = custoImpressao ? normalizePrice(custoImpressao) : 
      (frente && verso) ? normalizePrice(Number(frente) + Number(verso)) :
      frente ? normalizePrice(frente) : "0.0000";

    items.push({
      customer: { name: cliente },
      productKey,
      productType,
      model: modelo || "base",
      material: {
        name: `${productType.charAt(0) + productType.slice(1).toLowerCase()} ${modelo || "base"} (branca)`,
        unitCost: normalizePrice(custoSuporte)
      },
      printing: {
        formatLabel: `${printMethod}_UNIT`,
        technology: "DIGITAL",
        colors,
        sides,
        unitPrice: totalPrintCost
      },
      marginPct: margem / 100 // Converter de % para decimal
    });
  }

  return items;
}

function main() {
  console.log('📊 Extraindo Produtos Têxteis do Excel (aba FLEX)...\n');
  console.log('='.repeat(120));

  try {
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const items = extractTextiles();
    console.log(`✅ ${items.length} produtos têxteis extraídos\n`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(items, null, 2), 'utf-8');
    console.log(`💾 Arquivo salvo: ${OUTPUT_FILE}\n`);

    if (items.length > 0) {
      console.log('📋 Amostra (primeiros 3 produtos):\n');
      items.slice(0, 3).forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.productType} ${item.model} - ${item.customer.name}`);
        console.log(`     Material: ${item.material.name} - €${item.material.unitCost}`);
        console.log(`     Impressão: ${item.printing.formatLabel} - €${item.printing.unitPrice}\n`);
      });
    }

    console.log('='.repeat(120));
    console.log('\n✅ Extração concluída!\n');
    console.log('Próximo passo: Execute `npm run import:textiles`\n');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();

