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

function isValidCustomer(name: string): boolean {
  const normalized = normalizeName(name).toUpperCase();
  
  // Filtrar cabeçalhos e valores inválidos
  const invalid = [
    "CLIENTE", "DESCRIÇÃO", "QUANT", "QTD", "QUANTIDADE",
    "CUSTO", "TOTAL", "FORMATO", "TIPO", "PRODUTO",
    "IMPRESSÃO", "IMPRESSAO", "PAPEL", "MATERIAL",
    "CÁLCULO", "CALCULO", "DE", "PARA", "A4", "DL",
    "ENVELOPES", "PASTAS", "CARTOES", "CARTÕES",
    "VISITA", "PVC", "GRANDE", "FORMATO", "SINGULARES",
    "CATALOGOS", "CATÁLOGOS", "UV", "ROLO", "FLEX",
    "VINIL", "ALVEOLAR", "TÊXTEIS", "TEXTIL"
  ];

  if (invalid.some(i => normalized === i || normalized.includes(i) && normalized.length < 10)) {
    return false;
  }

  // Deve ter pelo menos 3 caracteres
  if (normalized.length < 3) return false;

  // Não deve ser só números
  if (/^\d+$/.test(normalized)) return false;

  // Não deve ser só símbolos
  if (!/[A-Z]/.test(normalized)) return false;

  return true;
}

async function extractCustomersFromSheet(sheetName: string): Promise<string[]> {
  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes(sheetName)) return [];

  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const customers = new Set<string>();

  // Procurar coluna CLIENTE
  let headerRow = -1;
  let clienteCol = -1;

  for (let i = 0; i < Math.min(50, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || "").toUpperCase().trim();
      if (cell === "CLIENTE") {
        clienteCol = j;
        headerRow = i;
        break;
      }
    }

    if (clienteCol !== -1) break;
  }

  if (clienteCol === -1) return [];

  // Extrair clientes (após cabeçalho)
  for (let i = headerRow + 1; i < Math.min(headerRow + 500, data.length); i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const cliente = String(row[clienteCol] || "").trim();
    if (isValidCustomer(cliente)) {
      customers.add(normalizeName(cliente));
    }
  }

  return Array.from(customers);
}

async function main() {
  console.log("=".repeat(120));
  console.log("👥 Extração Refinada de Clientes da Planilha");
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
    "FLEX",
    "CARTÕES DE VISITA"
  ];

  const allCustomers = new Set<string>();

  for (const sheetName of sheetsToAnalyze) {
    const customers = await extractCustomersFromSheet(sheetName);
    customers.forEach(c => allCustomers.add(c));
    if (customers.length > 0) {
      console.log(`📋 ${sheetName}: ${customers.length} clientes`);
      customers.slice(0, 5).forEach(c => console.log(`   - ${c}`));
      if (customers.length > 5) {
        console.log(`   ... e mais ${customers.length - 5}`);
      }
    }
  }

  const uniqueCustomers = Array.from(allCustomers).sort();

  console.log(`\n${"=".repeat(120)}`);
  console.log(`✅ Total de clientes únicos encontrados: ${uniqueCustomers.length}`);
  console.log("=".repeat(120));

  // Salvar JSON
  const outputPath = path.resolve(process.cwd(), "data", "customers-from-excel.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(uniqueCustomers, null, 2), "utf-8");
  console.log(`\n✅ Clientes salvos em: ${outputPath}`);

  // Listar todos
  console.log(`\n📋 Lista completa de clientes:`);
  uniqueCustomers.forEach((c, i) => {
    console.log(`${(i + 1).toString().padStart(3, " ")}. ${c}`);
  });
}

main().catch(console.error);

