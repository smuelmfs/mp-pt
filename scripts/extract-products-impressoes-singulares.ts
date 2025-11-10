import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface SingularProduct {
  customer?: string;
  description: string;
  quantity: number;
  quantityPerPlano?: number;
  paperQuantity?: number;
  printingUnitCost: number;
  printingCost: number;
  paperUnitCost: number;
  paperCost: number;
  cutCost?: number;
  plastCost?: number;
  foilCost?: number;
  totalCost: number;
  marginPercent: number;
  finalTotal: number;
  finalUnit?: number;
}

function normalizeNumber(value: any): number {
  if (!value) return 0;
  const str = String(value).replace(/[€\s,]/g, "").replace(",", ".");
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

async function main() {
  console.log("=".repeat(120));
  console.log("📄 Extração de Produtos - IMPRESSÕES SINGULARES");
  console.log("=".repeat(120));
  console.log();

  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes("IMPRESSÕES SINGULARES")) {
    console.error("❌ Aba 'IMPRESSÕES SINGULARES' não encontrada");
    return;
  }

  const worksheet = workbook.Sheets["IMPRESSÕES SINGULARES"];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const products: SingularProduct[] = [];

  // Encontrar linha de cabeçalho (linha 16 tem "CLIENTE | DESCRIÇÃO | QUANT. | ...")
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

    // Se não tem descrição, pode ser continuação da linha anterior
    if (!description || description.length < 3) {
      // Verificar se tem quantidade (pode ser continuação)
      const qty = normalizeNumber(row[2]);
      if (qty > 0 && products.length > 0) {
        // Adicionar como variação de quantidade do último produto
        const lastProduct = products[products.length - 1];
        // Criar nova entrada com mesma descrição mas quantidade diferente
        products.push({
          ...lastProduct,
          quantity: qty,
          printingCost: normalizeNumber(row[5]),
          paperCost: normalizeNumber(row[8]),
          totalCost: normalizeNumber(row[13]),
          finalTotal: normalizeNumber(row[15]),
          finalUnit: normalizeNumber(row[16])
        });
      }
      continue;
    }

    const quantity = normalizeNumber(row[2]);
    const quantityPerPlano = normalizeNumber(row[3]);
    const paperQuantity = normalizeNumber(row[4]);
    const printingUnitCost = normalizeNumber(row[5]);
    const printingCost = normalizeNumber(row[6]);
    const paperUnitCost = normalizeNumber(row[7]);
    const paperCost = normalizeNumber(row[8]);
    const cutCost = normalizeNumber(row[9]);
    const plastCost = normalizeNumber(row[10]);
    const foilCost = normalizeNumber(row[11]);
    const totalCost = normalizeNumber(row[13]);
    const marginPercent = normalizeNumber(row[14]);
    const finalTotal = normalizeNumber(row[15]);
    const finalUnit = normalizeNumber(row[16]);

    if (quantity === 0 || totalCost === 0) continue;

    products.push({
      customer: customer || undefined,
      description,
      quantity,
      quantityPerPlano: quantityPerPlano || undefined,
      paperQuantity: paperQuantity || undefined,
      printingUnitCost,
      printingCost,
      paperUnitCost,
      paperCost,
      cutCost: cutCost || undefined,
      plastCost: plastCost || undefined,
      foilCost: foilCost || undefined,
      totalCost,
      marginPercent: marginPercent > 1 ? marginPercent / 100 : marginPercent,
      finalTotal,
      finalUnit: finalUnit || undefined
    });
  }

  console.log(`✅ ${products.length} produtos de impressões singulares extraídos\n`);

  // Agrupar por descrição
  const byDescription = new Map<string, SingularProduct[]>();
  for (const p of products) {
    const key = p.description.toUpperCase();
    if (!byDescription.has(key)) {
      byDescription.set(key, []);
    }
    byDescription.get(key)!.push(p);
  }

  console.log(`📊 Produtos únicos: ${byDescription.size}\n`);

  // Mostrar exemplos
  console.log("Exemplos de produtos encontrados:");
  let count = 0;
  for (const [desc, prods] of byDescription.entries()) {
    if (count >= 10) break;
    console.log(`\n  ${desc}:`);
    console.log(`    Quantidades: ${prods.map(p => p.quantity).join(", ")}`);
    console.log(`    Preço unitário: €${prods[0].finalUnit?.toFixed(2) || "N/A"}`);
    count++;
  }

  // Salvar JSON
  const outputPath = path.resolve(process.cwd(), "data", "products-impressoes-singulares.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2), "utf-8");
  console.log(`\n✅ Dados salvos em: ${outputPath}`);
}

main().catch(console.error);

