import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const EXCEL_FILE = path.resolve(process.cwd(), 'CÁLCULO DE PRODUÇÃO 2024.xlsx');

/**
 * Script mestre para importar dados do Excel para o sistema
 * 
 * ESTRUTURA DO EXCEL:
 * 
 * 1. IMPRESSÃO - Impressões básicas (formato, cor, preço)
 * 2. PAPEL - Materiais de papel (marca, gramagem, quantidade, preço)
 * 3. ACABAMENTO - Acabamentos/cortes (formato, valor)
 * 4. CARTÕES DE VISITA - Produto específico com quantidades, cortes, plastificação, foil
 * 5. IMPRESSÕES SINGULARES - Impressões com papel, gramagem, cortes, plastificação, vinco
 * 6. CÁLCULO CATALOGOS - Produto catálogo com papel, cortes, plastificação, laminação foil
 * 7. IMP. GRANDE FORMATO - Impressões grande formato (fornecedor, preço m², % lucro)
 * 8. ENVELOPES - Produto envelope (formato, tipo, custo unitário)
 * 9. PASTAS PARA A4 - Produto pasta A4 (papel, gramagem, corte, plastificação, dobra)
 * 10. FLEX - Produto flex (medida, custo unitário, personalização)
 * 11. CARTOES PVC - Produto cartão PVC (tipo, cartuxo, tempo produção)
 * 12. ALVEOLAR - Materiais alveolares (tipo, dimensões, custo fornecedor, custo m²)
 * 13. VINIL - Materiais vinil (tipo, dimensões, custo fornecedor, custo m²)
 * 14. IMPRESSÃO UV - Impressões UV (material, custo unitário, cálculo m², suporte)
 * 15. PRODUTOS PUBLICITÁRIOS - Produtos com clientes, suportes, impressões, % lucro
 */

interface ExcelData {
  [sheetName: string]: any[][];
}

function readExcelFile(): ExcelData {
  if (!fs.existsSync(EXCEL_FILE)) {
    throw new Error(`Arquivo não encontrado: ${EXCEL_FILE}`);
  }

  const workbook = XLSX.readFile(EXCEL_FILE);
  const data: ExcelData = {};

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      defval: null,
      raw: false 
    });
    data[sheetName] = jsonData as any[][];
  }

  return data;
}

function main() {
  console.log('📊 Importação Mestre do Excel\n');
  console.log('Este script lê o arquivo Excel e prepara dados para importação.\n');
  
  try {
    const data = readExcelFile();
    
    console.log('✅ Arquivo lido com sucesso!\n');
    console.log(`📋 Abas encontradas: ${Object.keys(data).length}\n`);
    
    // Salva dados brutos para análise
    const outputDir = path.resolve(process.cwd(), 'data', 'excel-raw');
    fs.mkdirSync(outputDir, { recursive: true });
    
    for (const [sheetName, sheetData] of Object.entries(data)) {
      const safeName = sheetName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const outputFile = path.join(outputDir, `${safeName}.json`);
      fs.writeFileSync(outputFile, JSON.stringify(sheetData, null, 2), 'utf-8');
      console.log(`  ✓ ${sheetName} → ${outputFile}`);
    }
    
    console.log('\n✅ Dados brutos salvos em: data/excel-raw/\n');
    console.log('📝 PRÓXIMOS PASSOS:');
    console.log('   1. Analisar cada aba e criar scripts de importação específicos');
    console.log('   2. Mapear colunas do Excel para o schema do Prisma');
    console.log('   3. Criar seeds/patches para cada tipo de dado\n');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

main();

