import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

function normalizeName(name: string): string {
  return name
    .replace(/\n/g, " ")
    .replace(/\\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidPrinting(name: string): boolean {
  const normalized = normalizeName(name).toUpperCase();
  
  // Filtrar cabeçalhos
  const invalid = [
    "FORMATO DE IMPRESSÃO", "CUSTO DE IMPRESSÃO", "IMPRESSÃO",
    "IMPRESSAO", "CLIENTE", "DESCRIÇÃO", "QUANT", "QTD",
    "CÁLCULO", "CALCULO", "DE", "PARA", "TOTAL", "CUSTO"
  ];

  if (invalid.some(i => normalized === i)) {
    return false;
  }

  // Deve ter pelo menos 3 caracteres
  if (normalized.length < 3) return false;

  // Não deve ser só números
  if (/^\d+$/.test(normalized)) return false;

  return true;
}

async function extractPrintingsFromSheet(sheetName: string): Promise<string[]> {
  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes(sheetName)) return [];

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const printings = new Set<string>();

  // Procurar coluna de impressão
  let headerRow = -1;
  let printingCol = -1;

  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toUpperCase().trim();
      if (cell.includes("FORMATO DE IMPRESSÃO") || 
          (cell.includes("IMPRESSÃO") && !cell.includes("CUSTO") && !cell.includes("TOTAL"))) {
        printingCol = j;
        headerRow = i;
        break;
      }
    }

    if (printingCol !== -1) break;
  }

  if (printingCol === -1) return [];

  // Extrair impressões
  for (let i = headerRow + 1; i < Math.min(headerRow + 200, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const printing = String(row[printingCol] || "").trim();
    if (isValidPrinting(printing)) {
      printings.add(normalizeName(printing));
    }
  }

  return Array.from(printings);
}

async function main() {
  console.log("=".repeat(120));
  console.log("🖨️  Extração de Impressões da Planilha");
  console.log("=".repeat(120));
  console.log();

  const sheetsToAnalyze = [
    "ENVELOPES",
    "IMP. GRANDE FORMATO",
    "CÁLCULO CATALOGOS",
    "IMPRESSÕES SINGULARES",
    "PASTAS PARA A4",
    "CARTOES PVC",
    "IMPRESSAO UV ROLO",
    "ALVEOLAR",
    "FLEX"
  ];

  const allPrintings = new Set<string>();

  for (const sheetName of sheetsToAnalyze) {
    const printings = await extractPrintingsFromSheet(sheetName);
    printings.forEach(p => allPrintings.add(p));
    if (printings.length > 0) {
      console.log(`📋 ${sheetName}: ${printings.length} impressões`);
      printings.slice(0, 5).forEach(p => console.log(`   - ${p}`));
      if (printings.length > 5) {
        console.log(`   ... e mais ${printings.length - 5}`);
      }
    }
  }

  const uniquePrintings = Array.from(allPrintings).sort();

  console.log(`\n${"=".repeat(120)}`);
  console.log(`✅ Total de impressões únicas encontradas: ${uniquePrintings.length}`);
  console.log("=".repeat(120));

  // Salvar JSON
  const outputPath = path.resolve(process.cwd(), "data", "printings-from-excel.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(uniquePrintings, null, 2), "utf-8");
  console.log(`\n✅ Impressões salvas em: ${outputPath}`);

  // Listar todas
  console.log(`\n📋 Lista completa de impressões:`);
  uniquePrintings.forEach((p, i) => {
    console.log(`${(i + 1).toString().padStart(3, " ")}. ${p}`);
  });
}

main().catch(console.error);

