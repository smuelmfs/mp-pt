import * as XLSX from "xlsx";
import * as path from "path";

const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

function analyzeSheet(sheetName: string) {
  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes(sheetName)) {
    console.log(`⚠️  Aba "${sheetName}" não encontrada`);
    return;
  }

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  console.log(`\n${"=".repeat(120)}`);
  console.log(`📋 ${sheetName}`);
  console.log("=".repeat(120));

  // Mostrar primeiras 30 linhas
  console.log("\nPrimeiras 30 linhas:");
  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    const cells = row.slice(0, 20).map(c => {
      const str = String(c || "").trim();
      return str.length > 25 ? str.substring(0, 25) + "..." : str;
    });
    if (cells.some(c => c)) {
      console.log(`Linha ${(i + 1).toString().padStart(3, " ")}: ${cells.join(" | ")}`);
    }
  }
}

function main() {
  console.log("=".repeat(120));
  console.log("🔍 Análise de Estrutura das Abas");
  console.log("=".repeat(120));

  const sheets = [
    "IMP. GRANDE FORMATO",
    "CÁLCULO CATALOGOS",
    "IMPRESSÕES SINGULARES",
    "IMPRESSAO UV ROLO"
  ];

  for (const sheetName of sheets) {
    analyzeSheet(sheetName);
  }
}

main();

