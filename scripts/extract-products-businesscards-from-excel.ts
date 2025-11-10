import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');
const OUTPUT_FILE = path.resolve(process.cwd(), 'data', 'normalized', 'products.businesscards.json');

/**
 * Extrai dados de Cartões de Visita do Excel e normaliza para JSON
 */

interface BusinessCardRow {
  name: string;
  format: string;
  widthMm: number;
  heightMm: number;
  printing: {
    technology: "DIGITAL";
    colors: string;
    unitPrice: string;
    sides: number;
    yield: null;
  };
  finishes: Array<{ name: string; active?: boolean; baseCost: string }>;
  suggested: number[];
  totals: { qty: number; total: string; unit: string };
}

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

function extractBusinessCards(): BusinessCardRow[] {
  const workbook = XLSX.readFile(EXCEL_FILE);
  const sheet = workbook.Sheets['CARTÕES DE VISITA'];
  
  if (!sheet) {
    throw new Error('Aba "CARTÕES DE VISITA" não encontrada no Excel');
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false }) as any[][];
  
  // Encontrar linha de cabeçalho (linha 12 tem CLIENTE, DESCRIÇÃO, QUANT., etc.)
  let headerRow = -1;
  const headerMap: Record<string, number> = {};
  
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    
    const firstCell = String(row[0] || '').toUpperCase().trim();
    if (firstCell === 'CLIENTE') {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    throw new Error('Cabeçalho não encontrado na aba CARTÕES DE VISITA');
  }

  // Mapear colunas baseado na estrutura real
  // Col 0: CLIENTE, Col 1: DESCRIÇÃO, Col 3: QUANT., Col 4: CUSTO IMPRESSÃO, 
  // Col 6: CORTE, Col 7: PLAST., Col 8: FOIL, Col 9: CUSTO TOTAL, Col 10: TOTAL UNITÁRIO
  headerMap['cliente'] = 0;
  headerMap['descricao'] = 1;
  headerMap['qty'] = 3;
  headerMap['custo_impressao'] = 4;
  headerMap['quant_folhas'] = 5;
  headerMap['corte'] = 6;
  headerMap['plast'] = 7;
  headerMap['foil'] = 8;
  headerMap['custo_total'] = 9;
  headerMap['total_unitario'] = 10;

  // Agrupar por tipo de produto (SIMPLES, PLASTIFICAÇÃO, etc.)
  const productsByType = new Map<string, BusinessCardRow>();
  const quantitiesByProduct = new Map<string, number[]>();

  // Processar linhas de dados (começando na linha 13)
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[headerMap['qty']]) continue;

    const cliente = String(row[headerMap['cliente']] || '').trim();
    const descricao = String(row[headerMap['descricao']] || '').trim();
    const qty = normalizeNumber(row[headerMap['qty']]);
    
    if (qty <= 0 || !descricao) continue;

    // Extrair formato da descrição (ex: "FORMATO 85X55mm IMPRESSÃO 4/4;")
    const formatoMatch = descricao.match(/(\d+X\d+mm?)/i);
    const formato = formatoMatch ? formatoMatch[1] : "85x55mm";
    
    // Extrair impressão da descrição (ex: "4/4", "4/0")
    const impressaoMatch = descricao.match(/(\d+\/\d+)/);
    const impressao = impressaoMatch ? impressaoMatch[1] : "4/4";
    const colors = impressao === "4/4" ? "CMYK" : impressao === "4/0" ? "CMYK" : "K";

    // Criar chave única do produto (tipo + formato + impressão)
    const tipo = cliente || "SIMPLES";
    const productKey = `${tipo}_${formato}_${impressao}`;
    
    // Adicionar quantidade à lista de quantidades deste produto
    if (!quantitiesByProduct.has(productKey)) {
      quantitiesByProduct.set(productKey, []);
    }
    quantitiesByProduct.get(productKey)!.push(qty);

    // Dimensões do formato
    const dimMatch = formato.match(/(\d+)X(\d+)/i);
    const widthMm = dimMatch ? Number(dimMatch[1]) : 85;
    const heightMm = dimMatch ? Number(dimMatch[2]) : 55;

    // Impressão
    const custoImpressao = normalizePrice(row[headerMap['custo_impressao']]);
    const printing = {
      technology: "DIGITAL" as const,
      colors,
      unitPrice: custoImpressao,
      sides: 1,
      yield: null
    };

    // Acabamentos
    const finishes: Array<{ name: string; active?: boolean; baseCost: string }> = [];
    
    const corte = normalizePrice(row[headerMap['corte']]);
    if (corte !== "0.0000") {
      // Determinar qual corte usar baseado na quantidade
      const corteName = qty <= 1000 
        ? "CARTÕES DE VISITA (ATÉ 1000 UNID.)"
        : "CORTE";
      finishes.push({
        name: corteName,
        active: true,
        baseCost: corte
      });
    }

    const plast = normalizePrice(row[headerMap['plast']]);
    if (plast !== "0.0000") {
      // Determinar se é 1 ou 2 faces baseado no valor
      // Se for ~0.50 = 1 face, se for ~1.00 = 2 faces
      const plastValue = Number(plast);
      if (plastValue >= 0.90) {
        finishes.push({
          name: "Plastificação 2 Faces",
          active: true,
          baseCost: plast
        });
      } else {
        finishes.push({
          name: "Plastificação 1 Face",
          active: true,
          baseCost: plast
        });
      }
    }

    const foil = normalizePrice(row[headerMap['foil']]);
    if (foil !== "0.0000") {
      const foilValue = Number(foil);
      if (foilValue >= 1.50) {
        finishes.push({
          name: "Foil 2 Faces",
          active: true,
          baseCost: foil
        });
      } else {
        finishes.push({
          name: "Foil 1 Face",
          active: true,
          baseCost: foil
        });
      }
    }

    // Se ainda não existe produto para esta chave, criar
    if (!productsByType.has(productKey)) {
      const name = `Cartão de Visita ${tipo} - ${formato} ${impressao}`;
      
      productsByType.set(productKey, {
        name,
        format: formato,
        widthMm,
        heightMm,
        printing,
        finishes,
        suggested: [],
        totals: {
          qty: 0,
          total: "0.0000",
          unit: "UNIT"
        }
      });
    }
  }

  // Processar quantidades sugeridas para cada produto
  const products: BusinessCardRow[] = [];
  for (const [productKey, product] of productsByType.entries()) {
    const quantities = quantitiesByProduct.get(productKey) || [];
    const sortedQuantities = [...new Set(quantities)].sort((a, b) => a - b);
    
    // Quantidades sugeridas baseadas nas quantidades encontradas
    const suggested = sortedQuantities.length > 0 
      ? sortedQuantities 
      : [50, 100, 250, 500, 1000, 2000, 5000];
    
    products.push({
      ...product,
      suggested
    });
  }

  return products;
}

function main() {
  console.log('📊 Extraindo Cartões de Visita do Excel...\n');
  console.log('='.repeat(120));

  try {
    // Criar diretório se não existir
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Diretório criado: ${dir}\n`);
    }

    const products = extractBusinessCards();
    console.log(`✅ ${products.length} produtos extraídos\n`);

    // Salvar JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2), 'utf-8');
    console.log(`💾 Arquivo salvo: ${OUTPUT_FILE}\n`);

    // Mostrar amostra
    console.log('📋 Amostra (primeiros 3 produtos):\n');
    products.slice(0, 3).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name}`);
      console.log(`     Formato: ${p.format} | Impressão: ${p.printing.colors} | Preço: €${p.printing.unitPrice}`);
      console.log(`     Acabamentos: ${p.finishes.length}`);
      console.log('');
    });

    console.log('='.repeat(120));
    console.log('\n✅ Extração concluída!\n');
    console.log('Próximo passo: Execute `npm run import:products:businesscards`\n');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();

