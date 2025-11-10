import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');
const OUTPUT_FILE = path.resolve(process.cwd(), 'data', 'normalized', 'products.cards-pvc.json');

/**
 * Extrai dados de Cartões PVC do Excel e normaliza para JSON
 */

function normalizePrice(value: any): string {
  if (!value) return "0.0000";
  const str = String(value).replace(/[€\s]/g, '').replace(',', '.');
  const num = Number(str);
  return isNaN(num) ? "0.0000" : num.toFixed(4);
}

function extractCardsPVC() {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheet = workbook.Sheets['CARTOES PVC'];
  
  if (!sheet) {
    throw new Error('Aba "CARTOES PVC" não encontrada no Excel');
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][];
  
  // Encontrar linha de cabeçalho (linha 2 tem "TIPO")
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
    throw new Error('Cabeçalho não encontrado na aba CARTOES PVC');
  }

  // Extrair tipos de cartão e impressões (linhas 3-6)
  // Formato esperado: { printings: [...], materials: [...], products: [...] }
  const printingsMap = new Map<string, any>();
  const materialsMap = new Map<string, any>();
  const products: Array<{
    name: string;
    widthMm: number;
    heightMm: number;
    printing: {
      formatLabel: string;
      colors: string;
      sides: number;
    };
    materials: Array<{
      name: string;
      qtyPerUnit: string;
    }>;
    suggestedQuantities: number[];
  }> = [];
  const seen = new Set<string>();

  for (let i = headerRow + 1; i < Math.min(headerRow + 10, data.length); i++) {
    const row = data[i];
    if (!row || !row[0]) continue;

    const tipo = String(row[0] || '').trim();
    if (!tipo || tipo.toUpperCase().includes('ATENÇÃO') || tipo.toUpperCase().includes('SEGUNDOS')) continue;

    const custoCartao = normalizePrice(row[2]); // Col 2 = CUSTO UNITÁRIO
    const cor = String(row[4] || '').trim().toUpperCase(); // Col 4 = COR
    const custoCartuxo = normalizePrice(row[5]); // Col 5 = CUSTO CARTUXO
    const custoUnitImpressao = normalizePrice(row[7]); // Col 7 = CUSTO UNITÁRIO (impressão)
    const faces = String(row[9] || '').trim().toUpperCase(); // Col 9 = FACES

    if (!tipo || !cor || cor === 'ATENÇÃO!') continue;

    // Determinar lados da impressão
    const sides = faces.includes('VERSO') ? 2 : 1;
    const colors = cor === 'CMYK' ? 'CMYK' : cor === 'K' ? 'K' : 'CMYK';

    // Criar chaves únicas
    const materialName = `Cartão PVC ${tipo}`;
    const printingKey = `PVC ${colors} ${sides === 2 ? 'F/V' : 'Frente'}`;
    const productKey = `${tipo}_${colors}_${sides}`.toLowerCase();

    if (seen.has(productKey)) continue;
    seen.add(productKey);

    // Adicionar material
    if (!materialsMap.has(materialName.toLowerCase())) {
      materialsMap.set(materialName.toLowerCase(), {
        name: materialName,
        unitCost: custoCartao,
        active: true
      });
    }

    // Adicionar impressão
    if (!printingsMap.has(printingKey.toLowerCase())) {
      printingsMap.set(printingKey.toLowerCase(), {
        formatLabel: printingKey,
        colors,
        sides,
        unitPrice: custoUnitImpressao || custoCartuxo
      });
    }

    // Adicionar produto (formato esperado pelo script)
    products.push({
      name: `Cartão PVC ${tipo} ${colors} ${sides === 2 ? 'F/V' : 'Frente'}`,
      widthMm: 85.6, // Dimensão padrão de cartão PVC (CR80)
      heightMm: 53.98,
      printing: {
        formatLabel: printingKey,
        colors,
        sides
      },
      materials: [{
        name: materialName,
        qtyPerUnit: "1.0000"
      }],
      suggestedQuantities: [25, 50, 100, 250, 500, 1000]
    });
  }

  return {
    printings: Array.from(printingsMap.values()),
    materials: Array.from(materialsMap.values()),
    products
  };
}

function main() {
  console.log('📊 Extraindo Cartões PVC do Excel...\n');
  console.log('='.repeat(120));

  try {
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const data = extractCardsPVC();
    console.log(`✅ ${data.products.length} tipos de cartão PVC extraídos\n`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`💾 Arquivo salvo: ${OUTPUT_FILE}\n`);

    if (data.products.length > 0) {
      console.log('📋 Resumo:\n');
      console.log(`  Impressões: ${data.printings.length}`);
      console.log(`  Materiais: ${data.materials.length}`);
      console.log(`  Produtos: ${data.products.length}\n`);
      
      console.log('📋 Amostra (primeiros 3 produtos):\n');
      data.products.slice(0, 3).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name}`);
        console.log(`     Material: ${p.materials[0]?.name || 'N/A'}`);
        console.log(`     Impressão: ${p.printing.colors} ${p.printing.sides === 2 ? 'F/V' : 'Frente'}\n`);
      });
    }

    console.log('='.repeat(120));
    console.log('\n✅ Extração concluída!\n');
    console.log('Próximo passo: Execute `npm run import:products:cards-pvc`\n');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();

