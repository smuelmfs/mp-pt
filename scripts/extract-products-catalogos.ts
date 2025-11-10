import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface CatalogProduct {
  customer: string;
  description: string;
  quantity: number;
  pages: number;
  printedFaces: number;
  printingCost: number;
  paperSheets: number;
  paperUnitCost: number;
  paperCost: number;
  cutCost?: number;
  plastCost?: number;
  foilCost?: number;
  agrafoCost?: number;
  glueCost?: number;
  totalCost: number;
  unitCost: number;
  marginPercent: number;
  finalTotal: number;
  finalUnit: number;
}

function normalizeNumber(value: any): number {
  if (!value) return 0;
  const str = String(value).replace(/[€\s,]/g, "").replace(",", ".");
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

async function main() {
  console.log("=".repeat(120));
  console.log("📚 Extração de Produtos - CÁLCULO CATALOGOS");
  console.log("=".repeat(120));
  console.log();

  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes("CÁLCULO CATALOGOS")) {
    console.error("❌ Aba 'CÁLCULO CATALOGOS' não encontrada");
    return;
  }

  const worksheet = workbook.Sheets["CÁLCULO CATALOGOS"];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const products: CatalogProduct[] = [];

  // Encontrar linha de cabeçalho (linha 14 tem "CLIENTE | DESCRIÇÃO | QUANT. | ...")
  let headerRow = -1;
  for (let i = 0; i < 20; i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;
    const firstCell = String(row[0] || "").toUpperCase().trim();
    if (firstCell === "CLIENTE") {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    console.error("❌ Cabeçalho não encontrado");
    return;
  }

  console.log(`✅ Cabeçalho encontrado na linha ${headerRow + 1}\n`);

  // Extrair produtos
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const customer = String(row[0] || "").trim();
    const description = String(row[1] || "").trim();

    if (!customer || !description || customer.length < 3) continue;

    const quantity = normalizeNumber(row[2]);
    const pages = normalizeNumber(row[3]);
    const printedFaces = normalizeNumber(row[4]);
    const printingCost = normalizeNumber(row[5]);
    const paperSheets = normalizeNumber(row[6]);
    const paperUnitCost = normalizeNumber(row[7]);
    const paperCost = normalizeNumber(row[8]);
    const cutCost = normalizeNumber(row[9]);
    const plastCost = normalizeNumber(row[10]);
    const foilCost = normalizeNumber(row[11]);
    const agrafoCost = normalizeNumber(row[12]);
    const glueCost = normalizeNumber(row[13]);
    const totalCost = normalizeNumber(row[14]);
    const unitCost = normalizeNumber(row[15]);
    const marginPercent = normalizeNumber(row[16]);
    const finalTotal = normalizeNumber(row[17]);
    const finalUnit = normalizeNumber(row[18]);

    if (quantity === 0 || totalCost === 0) continue;

    products.push({
      customer,
      description,
      quantity,
      pages,
      printedFaces,
      printingCost,
      paperSheets,
      paperUnitCost,
      paperCost,
      cutCost: cutCost || undefined,
      plastCost: plastCost || undefined,
      foilCost: foilCost || undefined,
      agrafoCost: agrafoCost || undefined,
      glueCost: glueCost || undefined,
      totalCost,
      unitCost,
      marginPercent: marginPercent > 1 ? marginPercent / 100 : marginPercent,
      finalTotal,
      finalUnit
    });
  }

  console.log(`✅ ${products.length} produtos de catálogo extraídos\n`);

  // Agrupar por cliente
  const byCustomer = new Map<string, CatalogProduct[]>();
  for (const p of products) {
    if (!byCustomer.has(p.customer)) {
      byCustomer.set(p.customer, []);
    }
    byCustomer.get(p.customer)!.push(p);
  }

  console.log(`📊 Clientes únicos: ${byCustomer.size}\n`);

  // Mostrar exemplos
  console.log("Exemplos de produtos encontrados:");
  let count = 0;
  for (const [customer, prods] of byCustomer.entries()) {
    if (count >= 5) break;
    console.log(`\n  ${customer} (${prods.length} produtos):`);
    prods.slice(0, 3).forEach(p => {
      console.log(`    - ${p.description.substring(0, 50)}... (Qtd: ${p.quantity}, Páginas: ${p.pages})`);
    });
    count++;
  }

  // Salvar JSON
  const outputPath = path.resolve(process.cwd(), "data", "products-catalogos.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2), "utf-8");
  console.log(`\n✅ Dados salvos em: ${outputPath}`);
}

main().catch(console.error);

