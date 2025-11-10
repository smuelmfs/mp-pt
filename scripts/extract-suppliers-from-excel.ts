import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface MaterialSupplier {
  materialName: string;
  supplierName: string | null;
  sheetName: string;
}

async function main() {
  console.log("📊 Extraindo Fornecedores da Planilha Excel...\n");
  console.log(`Lendo: ${EXCEL_PATH}\n`);

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ Arquivo não encontrado: ${EXCEL_PATH}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(EXCEL_PATH);
  const suppliers: MaterialSupplier[] = [];

  // Abas que podem ter materiais com fornecedores
  const sheetsToCheck = [
    "PAPEL",
    "VINIL",
    "ALVEOLAR",
    "RIGIDOS",
    "ENVELOPES",
    "CARTOES PVC",
    "TÊXTEIS",
    "FLEX"
  ];

  for (const sheetName of sheetsToCheck) {
    if (!workbook.SheetNames.includes(sheetName)) {
      console.log(`⚠️  Aba "${sheetName}" não encontrada`);
      continue;
    }

    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

    console.log(`\n📋 Analisando aba: ${sheetName}`);

    // Procurar cabeçalho com "FORNECEDOR" ou similar
    let headerRow = -1;
    let supplierCol = -1;
    let materialCol = -1;

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;

      // Procurar coluna de fornecedor
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "").toUpperCase();
        if (cell.includes("FORNECEDOR") || cell.includes("SUPPLIER")) {
          supplierCol = j;
          headerRow = i;
          console.log(`  ✅ Coluna de fornecedor encontrada na coluna ${j + 1} (linha ${i + 1})`);
          break;
        }
      }

      // Procurar coluna de material/nome
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "").toUpperCase();
        if (cell.includes("MATERIAL") || cell.includes("NOME") || cell.includes("NOME DO MATERIAL") || 
            cell.includes("DESCRIÇÃO") || cell.includes("PRODUTO")) {
          materialCol = j;
          if (headerRow === -1) headerRow = i;
          break;
        }
      }

      if (supplierCol !== -1 && materialCol !== -1) break;
    }

    if (supplierCol === -1) {
      console.log(`  ⚠️  Coluna de fornecedor não encontrada`);
      continue;
    }

    if (materialCol === -1) {
      console.log(`  ⚠️  Coluna de material não encontrada`);
      continue;
    }

    // Extrair dados
    let extracted = 0;
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;

      const materialName = String(row[materialCol] || "").trim();
      const supplierName = String(row[supplierCol] || "").trim();

      if (!materialName || materialName === "") continue;

      if (supplierName && supplierName !== "") {
        suppliers.push({
          materialName,
          supplierName,
          sheetName
        });
        extracted++;
      }
    }

    console.log(`  ✅ ${extracted} materiais com fornecedor encontrados`);
  }

  console.log("\n" + "=".repeat(120));
  console.log(`📊 RESUMO:`);
  console.log(`Total de materiais com fornecedor encontrados: ${suppliers.length}`);
  
  // Agrupar por fornecedor
  const bySupplier = suppliers.reduce((acc, s) => {
    if (!acc[s.supplierName!]) acc[s.supplierName!] = [];
    acc[s.supplierName!].push(s.materialName);
    return acc;
  }, {} as Record<string, string[]>);

  console.log(`\nFornecedores encontrados: ${Object.keys(bySupplier).length}`);
  for (const [supplier, materials] of Object.entries(bySupplier)) {
    console.log(`\n  ${supplier}: ${materials.length} materiais`);
    console.log(`    Exemplos: ${materials.slice(0, 3).join(", ")}`);
  }

  // Salvar JSON
  const outputPath = path.resolve(process.cwd(), "data", "suppliers-from-excel.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(suppliers, null, 2), "utf-8");
  console.log(`\n✅ Dados salvos em: ${outputPath}`);

  return suppliers;
}

main()
  .then(() => {
    console.log("\n🏁 Concluído!");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

