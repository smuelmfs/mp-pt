import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface MarginInfo {
  sheetName: string;
  category?: string;
  product?: string;
  marginPercent: number; // em decimal (0.30 = 30%)
  type: "FIXA" | "DINAMICA";
  condition?: {
    minQuantity?: number;
    minSubtotal?: number;
  };
}

function normalizeMargin(value: any): number | null {
  if (!value) return null;
  const str = String(value).replace(/[€\s%]/g, "").replace(",", ".");
  const num = Number(str);
  if (isNaN(num)) return null;
  
  // Se o valor for > 1, provavelmente está em percentual (ex: 300 = 300%)
  // Se for < 1, está em decimal (ex: 0.3 = 30%)
  if (num > 1) {
    return num / 100; // Converter 300% para 3.0 (300% de margem = multiplicador de 3)
  }
  return num;
}

function extractMarginsFromSheet(sheetName: string, data: any[][]): MarginInfo[] {
  const margins: MarginInfo[] = [];
  
  // Procurar coluna de "% LUCRO" ou "MARGEM"
  let marginCol = -1;
  let headerRow = -1;
  let productCol = -1;
  let categoryCol = -1;

  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toUpperCase().trim();
      if (cell.includes("% LUCRO") || cell.includes("LUCRO") || cell.includes("MARGEM")) {
        marginCol = j;
        headerRow = i;
      }
      if (cell.includes("TIPO") || cell.includes("PRODUTO") || cell.includes("DESCRIÇÃO")) {
        productCol = j;
        if (headerRow === -1) headerRow = i;
      }
      if (cell.includes("CATEGORIA") || cell.includes("TIPO DE PRODUTO")) {
        categoryCol = j;
      }
    }

    if (marginCol !== -1 && headerRow !== -1) break;
  }

  if (marginCol === -1) {
    return margins; // Não encontrou coluna de margem
  }

  // Extrair margens
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const marginValue = normalizeMargin(row[marginCol]);
    if (marginValue === null || marginValue === 0) continue;

    const productName = productCol !== -1 ? String(row[productCol] || "").trim() : "";
    const categoryName = categoryCol !== -1 ? String(row[categoryCol] || "").trim() : "";

    // Determinar categoria baseado no nome da aba
    let category = categoryName || "";
    if (!category) {
      if (sheetName.includes("VINIL")) category = "Grande Formato — Flex/Postes/Tendas";
      else if (sheetName.includes("ALVEOLAR")) category = "Placas rígidas";
      else if (sheetName.includes("ENVELOPE")) category = "Papelaria";
      else if (sheetName.includes("PASTAS")) category = "Pastas A4";
      else if (sheetName.includes("FLEX")) category = "Grande Formato — Flex/Postes/Tendas";
      else if (sheetName.includes("PVC")) category = "Cartões PVC";
      else if (sheetName.includes("TÊXTEIS") || sheetName.includes("TEXTIL")) category = "Têxteis Personalizados";
      else if (sheetName.includes("CARTÕES") || sheetName.includes("CARTÃO")) category = "Papelaria";
    }

    margins.push({
      sheetName,
      category: category || undefined,
      product: productName || undefined,
      marginPercent: marginValue,
      type: "FIXA"
    });
  }

  return margins;
}

function main() {
  console.log("📊 Extraindo Margens da Planilha Excel...\n");
  console.log(`Lendo: ${EXCEL_PATH}\n`);

  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`❌ Arquivo não encontrado: ${EXCEL_PATH}`);
    process.exit(1);
  }

  const workbook = XLSX.readFile(EXCEL_PATH);
  const allMargins: MarginInfo[] = [];

  // Abas que podem ter margens
  const sheetsToCheck = [
    "VINIL",
    "ALVEOLAR",
    "ENVELOPES",
    "PASTAS PARA A4",
    "FLEX",
    "CARTOES PVC",
    "CARTÕES DE VISITA",
    "IMPRESSÕES SINGULARES",
    "IMP. GRANDE FORMATO"
  ];

  for (const sheetName of sheetsToCheck) {
    if (!workbook.SheetNames.includes(sheetName)) {
      console.log(`⚠️  Aba "${sheetName}" não encontrada`);
      continue;
    }

    console.log(`\n📋 Analisando: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

    const margins = extractMarginsFromSheet(sheetName, data);
    if (margins.length > 0) {
      console.log(`  ✅ ${margins.length} margens encontradas`);
      
      // Agrupar por valor de margem
      const byMargin = margins.reduce((acc, m) => {
        const key = (m.marginPercent * 100).toFixed(0) + "%";
        if (!acc[key]) acc[key] = [];
        acc[key].push(m);
        return acc;
      }, {} as Record<string, MarginInfo[]>);

      for (const [margin, items] of Object.entries(byMargin)) {
        console.log(`    ${margin}: ${items.length} ocorrências`);
      }

      allMargins.push(...margins);
    } else {
      console.log(`  ⚠️  Nenhuma margem encontrada`);
    }
  }

  console.log("\n" + "=".repeat(120));
  console.log(`📊 RESUMO GERAL:`);
  console.log(`Total de margens encontradas: ${allMargins.length}`);

  // Agrupar por valor de margem
  const byMarginValue = allMargins.reduce((acc, m) => {
    const key = (m.marginPercent * 100).toFixed(0) + "%";
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {} as Record<string, MarginInfo[]>);

  console.log("\nMargens encontradas (agrupadas por valor):");
  for (const [margin, items] of Object.entries(byMarginValue).sort((a, b) => 
    Number(b[0].replace("%", "")) - Number(a[0].replace("%", ""))
  )) {
    const categories = [...new Set(items.map(i => i.category).filter(Boolean))];
    console.log(`\n  ${margin} (${items.length} ocorrências):`);
    if (categories.length > 0) {
      console.log(`    Categorias: ${categories.join(", ")}`);
    }
    console.log(`    Abas: ${[...new Set(items.map(i => i.sheetName))].join(", ")}`);
  }

  // Agrupar por categoria
  const byCategory = allMargins.reduce((acc, m) => {
    const cat = m.category || "Sem categoria";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {} as Record<string, MarginInfo[]>);

  console.log("\n" + "=".repeat(120));
  console.log("Margens por Categoria:");
  for (const [category, items] of Object.entries(byCategory)) {
    const margins = [...new Set(items.map(i => (i.marginPercent * 100).toFixed(0) + "%"))];
    console.log(`\n  ${category}:`);
    console.log(`    Margens: ${margins.join(", ")}`);
    console.log(`    Total: ${items.length} ocorrências`);
  }

  // Salvar JSON
  const outputPath = path.resolve(process.cwd(), "data", "margins-from-excel.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(allMargins, null, 2), "utf-8");
  console.log(`\n✅ Dados salvos em: ${outputPath}`);

  return allMargins;
}

main();

