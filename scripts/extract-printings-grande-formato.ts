import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

interface PrintingInfo {
  name: string;
  supplier?: string;
  pricePerM2: number;
  marginPercent: number;
  technology: "GRANDE_FORMATO" | "DIGITAL" | "UV";
}

function normalizePrice(value: any): number {
  if (!value) return 0;
  const str = String(value).replace(/[€\s,]/g, "").replace(",", ".");
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

function normalizeMargin(value: any): number {
  if (!value) return 0;
  const str = String(value).replace(/[%€\s,]/g, "").replace(",", ".");
  const num = Number(str);
  if (isNaN(num)) return 0;
  // Se > 1, provavelmente é percentual (ex: 20 = 20%)
  // Se < 1, é decimal (ex: 0.2 = 20%)
  return num > 1 ? num / 100 : num;
}

function determineTechnology(name: string): "GRANDE_FORMATO" | "DIGITAL" | "UV" {
  const upper = name.toUpperCase();
  if (upper.includes("UV")) return "UV";
  if (upper.includes("DTF") || upper.includes("DIGITAL")) return "DIGITAL";
  return "GRANDE_FORMATO";
}

async function main() {
  console.log("=".repeat(120));
  console.log("🖨️  Extração de Impressões - IMP. GRANDE FORMATO");
  console.log("=".repeat(120));
  console.log();

  const workbook = XLSX.readFile(EXCEL_PATH);
  if (!workbook.SheetNames.includes("IMP. GRANDE FORMATO")) {
    console.error("❌ Aba 'IMP. GRANDE FORMATO' não encontrada");
    return;
  }

  const worksheet = workbook.Sheets["IMP. GRANDE FORMATO"];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];

  const printings: PrintingInfo[] = [];

  // Estrutura: Linha 1 = cabeçalho
  // Linha 2+: IMPRESSÃO | FORNECEDOR | Preço m2 | Quant. m2 | ... | % LUCRO | TOTAL
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!Array.isArray(row)) continue;

    const name = String(row[0] || "").trim();
    const supplier = String(row[1] || "").trim();
    const pricePerM2 = normalizePrice(row[2]);
    const marginPercent = normalizeMargin(row[6]); // Coluna 6 = % LUCRO

    if (!name || name.length < 3 || pricePerM2 === 0) continue;

    // Filtrar linhas vazias ou inválidas
    if (name.toUpperCase().includes("IMPRESSÃO") && name.toUpperCase().includes("FORNECEDOR")) {
      continue; // É cabeçalho
    }

    printings.push({
      name: name,
      supplier: supplier || undefined,
      pricePerM2,
      marginPercent,
      technology: determineTechnology(name)
    });
  }

  console.log(`✅ ${printings.length} impressões extraídas\n`);

  // Agrupar por nome (pode haver múltiplos fornecedores)
  const byName = new Map<string, PrintingInfo[]>();
  for (const p of printings) {
    if (!byName.has(p.name)) {
      byName.set(p.name, []);
    }
    byName.get(p.name)!.push(p);
  }

  console.log(`📊 Impressões únicas: ${byName.size}\n`);

  // Mostrar exemplos
  console.log("Exemplos de impressões encontradas:");
  let count = 0;
  for (const [name, variants] of byName.entries()) {
    if (count >= 10) break;
    console.log(`\n  ${name}:`);
    variants.forEach(v => {
      console.log(`    - Fornecedor: ${v.supplier || "N/A"}, Preço: €${v.pricePerM2.toFixed(2)}/m², Margem: ${(v.marginPercent * 100).toFixed(0)}%`);
    });
    count++;
  }

  // Salvar JSON
  const outputPath = path.resolve(process.cwd(), "data", "printings-grande-formato.json");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(Array.from(byName.entries()).map(([name, variants]) => ({
    name,
    variants
  })), null, 2), "utf-8");
  console.log(`\n✅ Dados salvos em: ${outputPath}`);
}

main().catch(console.error);

