import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');
const OUTPUT_FILE = path.resolve(process.cwd(), 'data', 'normalized', 'products.folders-a4.json');

/**
 * Extrai dados de Pastas A4 do Excel e normaliza para JSON
 */

function normalizePrice(value: any): string {
  if (!value) return "0.0000";
  const str = String(value).replace(/[€\s]/g, '').replace(',', '.');
  const num = Number(str);
  return isNaN(num) ? "0.0000" : num.toFixed(4);
}

interface FolderProduct {
  name: string;
  widthMm: number;
  heightMm: number;
  printing: {
    technology: "DIGITAL";
    formatLabel: string;
    unitPrice: string;
  };
  material: {
    name: string;
    gramagem: number;
    unitCost: string;
  };
  finishes: Array<{
    name: string;
    baseCost: string;
  }>;
  suggestedQuantities: number[];
}

function extractFoldersA4(): FolderProduct[] {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheet = workbook.Sheets['PASTAS PARA A4'];
  
  if (!sheet) {
    throw new Error('Aba "PASTAS PARA A4" não encontrada no Excel');
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][];
  
  // Encontrar linha de cabeçalho (linha 2)
  let headerRow = -1;
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const firstCell = String(row[0] || '').toUpperCase().trim();
    // Procurar por "FORMATO" ou "IMPRESSÃO" na primeira coluna
    if (firstCell.includes('FORMATO') || (firstCell.includes('IMPRESSÃO') && row[3] && String(row[3]).toUpperCase().includes('PAPEL'))) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    // Tentar linha 2 diretamente
    if (data[1] && data[1][0]) {
      headerRow = 1;
    } else {
      throw new Error('Cabeçalho não encontrado na aba PASTAS PARA A4');
    }
  }

  // Extrair dados de impressão e papel (linhas 3-5)
  let printingFormat = "SRA3 CMYK SÓ FRENTE";
  let printingPrice = "0.0900";
  const paperOptions: Array<{ format: string; gramagem: number; unitCost: string }> = [];

  for (let i = headerRow + 1; i < Math.min(headerRow + 10, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    const firstCell = String(row[0] || '').trim();
    const formatCell = String(row[3] || '').trim();
    const gramagemCell = row[4];
    const costCell = row[5];

    // Impressão
    if (firstCell && firstCell.includes('SRA3')) {
      printingFormat = firstCell;
      printingPrice = normalizePrice(row[1] || "0.09");
    }

    // Papel
    if (formatCell && formatCell.includes('SRA3') && gramagemCell && costCell) {
      const gramagem = Number(gramagemCell);
      if (!isNaN(gramagem) && gramagem > 0) {
        paperOptions.push({
          format: formatCell,
          gramagem: gramagem,
          unitCost: normalizePrice(costCell)
        });
      }
    }

    // Parar quando encontrar "BOLSA" ou "CLIENTE"
    if (firstCell.includes('BOLSA') || firstCell.includes('CLIENTE')) {
      break;
    }
  }

  // Se não encontrou papel, usar padrão
  if (paperOptions.length === 0) {
    paperOptions.push({
      format: "SRA3",
      gramagem: 250,
      unitCost: "0.0900"
    });
  }

  // Extrair produtos únicos da seção de cálculos (linha 13+)
  const productsMap = new Map<string, FolderProduct>();
  const quantitiesByProduct = new Map<string, number[]>();

  let dataHeaderRow = -1;
  for (let i = headerRow + 10; i < Math.min(headerRow + 20, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    const firstCell = String(row[0] || '').toUpperCase().trim();
    if (firstCell === 'CLIENTE') {
      dataHeaderRow = i;
      break;
    }
  }

  if (dataHeaderRow === -1) {
    throw new Error('Cabeçalho de dados não encontrado');
  }

  // Processar linhas de dados
  for (let i = dataHeaderRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0] || !row[1]) continue;

    const cliente = String(row[0] || '').trim();
    const descricao = String(row[1] || '').trim();
    const qty = Number(row[2] || 0);

    if (!descricao || qty <= 0 || !descricao.includes('PASTAS A4')) continue;

    // Extrair características da descrição
    const hasPlast = descricao.includes('PLASTI');
    const hasFoil = descricao.includes('FOIL');
    const hasBolsa = descricao.includes('BOLSA');
    const hasFerragem = descricao.includes('FERRAGEM');
    const hasDobra = descricao.includes('DOBRA') || row[11]; // Col 11 = DOBRA

    // Criar nome do produto baseado nas características
    const parts: string[] = ['Pasta A4'];
    if (hasPlast) parts.push('Plastificação');
    if (hasFoil) parts.push('Foil');
    if (hasBolsa) parts.push('Bolsa');
    if (hasFerragem) parts.push('Ferragem');
    if (hasDobra) parts.push('Dobra');

    const productName = parts.join(' + ');
    const key = productName.toLowerCase();

    // Adicionar quantidade
    if (!quantitiesByProduct.has(key)) {
      quantitiesByProduct.set(key, []);
    }
    quantitiesByProduct.get(key)!.push(qty);

    // Criar produto se não existir
    if (!productsMap.has(key)) {
      const paper = paperOptions[0]; // Usar primeira opção de papel

      const finishes: Array<{ name: string; baseCost: string }> = [];
      
      // Corte
      finishes.push({
        name: "NORMAL",
        baseCost: normalizePrice(row[8] || "0.02")
      });

      // Plastificação
      if (hasPlast) {
        const plastCost = normalizePrice(row[9] || "0.50");
        finishes.push({
          name: "Plastificação 1 Face",
          baseCost: plastCost
        });
      }

      // Foil
      if (hasFoil) {
        const foilCost = normalizePrice(row[10] || "0.85");
        finishes.push({
          name: "Foil 1 Face",
          baseCost: foilCost
        });
      }

      // Dobra
      if (hasDobra) {
        finishes.push({
          name: "Dobra",
          baseCost: normalizePrice(row[11] || "0.07")
        });
      }

      productsMap.set(key, {
        name: productName,
        widthMm: 210, // A4 width
        heightMm: 297, // A4 height
        printing: {
          technology: "DIGITAL",
          formatLabel: printingFormat,
          unitPrice: printingPrice
        },
        material: {
          name: `Papel ${paper.format} ${paper.gramagem}g`,
          gramagem: paper.gramagem,
          unitCost: paper.unitCost
        },
        finishes,
        suggestedQuantities: []
      });
    }
  }

  // Adicionar quantidades sugeridas
  const products: FolderProduct[] = [];
  for (const [key, product] of productsMap.entries()) {
    const quantities = quantitiesByProduct.get(key) || [];
    const sortedQuantities = [...new Set(quantities)].sort((a, b) => a - b);
    
    products.push({
      ...product,
      suggestedQuantities: sortedQuantities.length > 0 
        ? sortedQuantities 
        : [50, 100, 250, 500, 1000]
    });
  }

  return products;
}

function main() {
  console.log('📊 Extraindo Pastas A4 do Excel...\n');
  console.log('='.repeat(120));

  try {
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const products = extractFoldersA4();
    console.log(`✅ ${products.length} tipos de pasta A4 extraídos\n`);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2), 'utf-8');
    console.log(`💾 Arquivo salvo: ${OUTPUT_FILE}\n`);

    if (products.length > 0) {
      console.log('📋 Produtos extraídos:\n');
      products.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.name}`);
        console.log(`     Material: ${p.material.name} - €${p.material.unitCost}`);
        console.log(`     Acabamentos: ${p.finishes.length}`);
        console.log(`     Quantidades: ${p.suggestedQuantities.length}\n`);
      });
    }

    console.log('='.repeat(120));
    console.log('\n✅ Extração concluída!\n');
    console.log('Próximo passo: Execute `npm run import:products:folders-a4`\n');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();

