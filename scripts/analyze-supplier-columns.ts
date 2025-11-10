import * as XLSX from "xlsx";
import * as path from "path";

const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

function main() {
  console.log("🔍 Analisando estrutura das abas para encontrar colunas de fornecedor...\n");

  const workbook = XLSX.readFile(EXCEL_PATH);
  
  const sheetsToCheck = ["VINIL", "ALVEOLAR", "PAPEL"];

  for (const sheetName of sheetsToCheck) {
    if (!workbook.SheetNames.includes(sheetName)) {
      console.log(`⚠️  Aba "${sheetName}" não encontrada\n`);
      continue;
    }

    console.log(`\n${"=".repeat(120)}`);
    console.log(`📋 ABA: ${sheetName}`);
    console.log("=".repeat(120));

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

    // Mostrar primeiras 10 linhas
    console.log("\nPrimeiras 10 linhas:");
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      
      console.log(`\nLinha ${i + 1}:`);
      for (let j = 0; j < Math.min(15, row.length); j++) {
        const cell = String(row[j] || "").trim();
        if (cell) {
          console.log(`  Col ${j + 1}: "${cell}"`);
        }
      }
    }
  }
}

main();

