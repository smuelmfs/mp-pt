import * as XLSX from "xlsx";
import * as path from "path";

const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

function main() {
  console.log("📊 Analisando Margens na Planilha Excel...\n");
  console.log(`Lendo: ${EXCEL_PATH}\n`);

  const workbook = XLSX.readFile(EXCEL_PATH);
  
  // Abas que podem ter informações de margem
  const sheetsToCheck = workbook.SheetNames.filter(name => 
    !name.includes("CONFIG") && 
    !name.includes("MARGEM") &&
    name !== "CONFIGURAÇÕES"
  );

  console.log("=".repeat(120));
  console.log("🔍 Procurando colunas relacionadas a margem/lucro...");
  console.log("=".repeat(120));

  for (const sheetName of sheetsToCheck.slice(0, 10)) { // Limitar a 10 abas para não ficar muito longo
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

    // Procurar cabeçalhos relacionados a margem
    let foundMargin = false;
    const marginColumns: number[] = [];
    const marginRows: number[] = [];

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;

      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "").toUpperCase().trim();
        if (cell.includes("MARGEM") || 
            cell.includes("LUCRO") || 
            cell.includes("% LUCRO") ||
            cell.includes("MARGIN") ||
            cell.includes("MARKUP")) {
          if (!marginColumns.includes(j)) {
            marginColumns.push(j);
            marginRows.push(i);
            foundMargin = true;
          }
        }
      }
    }

    if (foundMargin) {
      console.log(`\n📋 ${sheetName}:`);
      console.log(`  Colunas de margem encontradas: ${marginColumns.map(c => c + 1).join(", ")}`);
      console.log(`  Linhas de cabeçalho: ${marginRows.map(r => r + 1).join(", ")}`);
      
      // Mostrar alguns exemplos de valores
      if (marginColumns.length > 0) {
        console.log(`  Exemplos de valores (primeiras 5 linhas após cabeçalho):`);
        for (let i = Math.max(...marginRows) + 1; i < Math.min(Math.max(...marginRows) + 6, data.length); i++) {
          const row = data[i];
          if (!Array.isArray(row)) continue;
          const values = marginColumns.map(col => String(row[col] || "").trim()).filter(v => v);
          if (values.length > 0) {
            console.log(`    Linha ${i + 1}: ${values.join(", ")}`);
          }
        }
      }
    }
  }

  // Procurar abas específicas de configuração/margem
  console.log("\n" + "=".repeat(120));
  console.log("🔍 Procurando abas de CONFIGURAÇÃO/MARGEM...");
  console.log("=".repeat(120));

  const configSheets = workbook.SheetNames.filter(name => 
    name.toUpperCase().includes("CONFIG") || 
    name.toUpperCase().includes("MARGEM") ||
    name.toUpperCase().includes("MARGIN")
  );

  if (configSheets.length > 0) {
    console.log(`\nAbas encontradas: ${configSheets.join(", ")}`);
    
    for (const sheetName of configSheets) {
      console.log(`\n📋 Analisando aba: ${sheetName}`);
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
      
      // Mostrar primeiras 20 linhas
      for (let i = 0; i < Math.min(20, data.length); i++) {
        const row = data[i];
        if (!Array.isArray(row)) continue;
        const cells = row.slice(0, 10).map(c => String(c || "").trim()).filter(c => c);
        if (cells.length > 0) {
          console.log(`  Linha ${i + 1}: ${cells.join(" | ")}`);
        }
      }
    }
  } else {
    console.log("\n⚠️  Nenhuma aba específica de configuração/margem encontrada");
  }
}

main();

