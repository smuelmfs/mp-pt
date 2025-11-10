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
  console.log(`📋 Analisando: ${sheetName}`);
  console.log("=".repeat(120));

  // Mostrar primeiras 20 linhas
  console.log("\nPrimeiras 20 linhas:");
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    const cells = row.slice(0, 15).map(c => {
      const str = String(c || "").trim();
      return str.length > 20 ? str.substring(0, 20) + "..." : str;
    });
    if (cells.some(c => c)) {
      console.log(`Linha ${i + 1}: ${cells.join(" | ")}`);
    }
  }

  // Procurar linha de cabeçalho
  let headerRow = -1;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    const rowStr = row.join(" ").toUpperCase();
    if (rowStr.includes("FORMATO") && (rowStr.includes("QUANT") || rowStr.includes("TOTAL"))) {
      headerRow = i;
      break;
    }
  }

  if (headerRow !== -1) {
    console.log(`\n✅ Cabeçalho encontrado na linha ${headerRow + 1}:`);
    const header = data[headerRow];
    for (let j = 0; j < Math.min(15, header.length); j++) {
      const cell = String(header[j] || "").trim();
      if (cell) {
        console.log(`  Col ${j + 1}: ${cell}`);
      }
    }

    // Mostrar algumas linhas de dados
    console.log(`\nPrimeiras 5 linhas de dados (após cabeçalho):`);
    for (let i = headerRow + 1; i < Math.min(headerRow + 6, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      const cells = row.slice(0, 15).map(c => String(c || "").trim());
      if (cells.some(c => c)) {
        console.log(`Linha ${i + 1}: ${cells.join(" | ")}`);
      }
    }
  }
}

function main() {
  console.log("=".repeat(120));
  console.log("🔍 Análise da Estrutura da Planilha Excel");
  console.log("=".repeat(120));

  analyzeSheet("PASTAS PARA A4");
  analyzeSheet("ENVELOPES");
  analyzeSheet("FLEX");
  analyzeSheet("CARTOES PVC");
}

main();

