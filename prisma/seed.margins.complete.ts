import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import * as path from "path";

const prisma = new PrismaClient();
const EXCEL_PATH = path.resolve(process.cwd(), "CÁLCULO DE PRODUÇÃO 2024.xlsx");

function normalizeMargin(value: any): number | null {
  if (!value) return null;
  const str = String(value).replace(/[€\s%]/g, "").replace(",", ".");
  const num = Number(str);
  if (isNaN(num)) return null;
  
  // Se o valor for > 1, provavelmente está em percentual (ex: 300 = 300%)
  // Se for < 1, está em decimal (ex: 0.3 = 30%)
  if (num > 1 && num <= 10) {
    // Valores entre 1 e 10 são provavelmente percentuais (ex: 3 = 3%)
    return num / 100;
  } else if (num > 10) {
    // Valores > 10 são provavelmente multiplicadores (ex: 300 = 300% = 3.0)
    return num / 100;
  }
  return num;
}

function normalizeProductName(name: string): string {
  return name
    .replace(/\n/g, " ")
    .replace(/\\+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function findProductByName(name: string, categoryId?: number): Promise<number | null> {
  const normalized = normalizeProductName(name);
  
  // Buscar por nome exato
  let product = await prisma.product.findFirst({
    where: {
      name: { equals: normalized, mode: "insensitive" },
      ...(categoryId ? { categoryId } : {})
    },
    select: { id: true }
  });

  if (product) return product.id;

  // Buscar por palavras-chave
  const keywords = normalized.split(" ").filter(w => w.length > 3);
  if (keywords.length > 0) {
    product = await prisma.product.findFirst({
      where: {
        AND: keywords.map(k => ({
          name: { contains: k, mode: "insensitive" }
        })),
        ...(categoryId ? { categoryId } : {})
      },
      select: { id: true }
    });

    if (product) return product.id;
  }

  return null;
}

async function main() {
  console.log("=".repeat(120));
  console.log("📊 Criando Margens Completas (Global, Categoria, Produto, Dinâmicas)");
  console.log("=".repeat(120));
  console.log();

  // 1. Garantir margem GLOBAL
  console.log("🌍 1. Margem GLOBAL...");
  const globalMargin = await prisma.marginRule.findFirst({
    where: { scope: "GLOBAL", active: true }
  });

  if (!globalMargin) {
    await prisma.marginRule.create({
      data: { scope: "GLOBAL", margin: "0.30", active: true }
    });
    console.log("  ✅ Criada: 30%");
  } else {
    console.log("  ℹ️  Já existe: 30%");
  }

  // 2. Garantir margens por CATEGORIA
  console.log("\n📁 2. Margens por CATEGORIA...");
  const categories = await prisma.productCategory.findMany();
  const categoryMap = new Map(categories.map(c => [c.name, c.id]));

  const categoryMargins: Record<string, number> = {
    "Papelaria": 0.30,
    "Pastas A4": 0.30,
    "Grande Formato — Flex/Postes/Tendas": 0.40,
    "Placas rígidas": 0.30,
    "Cartões PVC": 0.04,
    "Têxteis Personalizados": 0.30,
  };

  for (const [catName, margin] of Object.entries(categoryMargins)) {
    const catId = categoryMap.get(catName);
    if (!catId) continue;

    const existing = await prisma.marginRule.findFirst({
      where: { scope: "CATEGORY", categoryId: catId, active: true }
    });

    if (!existing) {
      await prisma.marginRule.create({
        data: { scope: "CATEGORY", categoryId: catId, margin: margin.toFixed(4), active: true }
      });
      console.log(`  ✅ ${catName}: ${(margin * 100).toFixed(0)}%`);
    }
  }

  // 3. Analisar planilha para margens por PRODUTO e DINÂMICAS
  console.log("\n📦 3. Analisando planilha para margens por PRODUTO e DINÂMICAS...");
  
  if (!require("fs").existsSync(EXCEL_PATH)) {
    console.log("  ⚠️  Planilha não encontrada, pulando análise detalhada");
    return;
  }

  const workbook = XLSX.readFile(EXCEL_PATH);
  let productMarginsCreated = 0;
  let dynamicMarginsCreated = 0;

  // Analisar ENVELOPES (tem margens por quantidade)
  if (workbook.SheetNames.includes("ENVELOPES")) {
    console.log("\n  📮 Analisando ENVELOPES...");
    const sheet = workbook.Sheets["ENVELOPES"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

    // Encontrar estrutura
    let headerRow = -1;
    let formatCol = -1;
    let marginCol = -1;
    let qtyCol = -1;

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "").toUpperCase().trim();
        if (cell.includes("FORMATO") || cell.includes("TIPO")) formatCol = j;
        if (cell.includes("% LUCRO") || cell.includes("LUCRO")) marginCol = j;
        if (cell.includes("QUANT") || cell.includes("QTD")) qtyCol = j;
        if (formatCol !== -1 && marginCol !== -1) {
          headerRow = i;
          break;
        }
      }
      if (headerRow !== -1) break;
    }

    if (headerRow !== -1 && formatCol !== -1 && marginCol !== -1) {
      // Agrupar por formato e quantidade
      const envelopeMargins = new Map<string, Array<{ qty: number; margin: number }>>();

      for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i];
        if (!Array.isArray(row)) continue;

        const format = String(row[formatCol] || "").trim();
        const margin = normalizeMargin(row[marginCol]);
        const qty = qtyCol !== -1 ? Number(row[qtyCol]) || undefined : undefined;

        if (!format || margin === null) continue;

        const key = format;
        if (!envelopeMargins.has(key)) {
          envelopeMargins.set(key, []);
        }
        if (qty && margin !== null) {
          envelopeMargins.get(key)!.push({ qty, margin });
        }
      }

      // Criar margens dinâmicas para envelopes
      const envelopeCategoryId = categoryMap.get("Papelaria");
      if (envelopeCategoryId) {
        for (const [format, margins] of envelopeMargins.entries()) {
          // Se há múltiplas margens por quantidade, criar regra dinâmica
          if (margins.length > 1) {
            const sortedMargins = margins.sort((a, b) => a.qty - b.qty);
            const baseMargin = sortedMargins[0].margin;
            
            // Criar regra dinâmica para quantidades maiores
            for (let i = 1; i < sortedMargins.length; i++) {
              const { qty, margin } = sortedMargins[i];
              const adjustPercent = margin - baseMargin; // Diferença em relação à base

              if (Math.abs(adjustPercent) > 0.001) { // Se há diferença significativa
                const existing = await prisma.marginRuleDynamic.findFirst({
                  where: {
                    scope: "CATEGORY",
                    categoryId: envelopeCategoryId,
                    minQuantity: qty,
                    active: true
                  }
                });

                if (!existing) {
                  await prisma.marginRuleDynamic.create({
                    data: {
                      scope: "CATEGORY",
                      categoryId: envelopeCategoryId,
                      minQuantity: qty,
                      adjustPercent: adjustPercent.toFixed(4),
                      priority: 100 - i, // Prioridade maior para quantidades maiores
                      active: true
                    }
                  });
                  dynamicMarginsCreated++;
                  console.log(`    ✅ Margem dinâmica: Qtd >= ${qty} → ajuste ${(adjustPercent * 100).toFixed(0)}%`);
                }
              }
            }
          }
        }
      }
    }
  }

  // Analisar PASTAS A4 (tem margens por quantidade)
  if (workbook.SheetNames.includes("PASTAS PARA A4")) {
    console.log("\n  📁 Analisando PASTAS A4...");
    const sheet = workbook.Sheets["PASTAS PARA A4"];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as any[][];

    let headerRow = -1;
    let productCol = -1;
    let marginCol = -1;
    let qtyCol = -1;

    for (let i = 0; i < Math.min(20, data.length); i++) {
      const row = data[i];
      if (!Array.isArray(row)) continue;
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || "").toUpperCase().trim();
        if (cell.includes("FORMATO") || cell.includes("PASTAS")) productCol = j;
        if (cell.includes("% LUCRO") || cell.includes("LUCRO")) marginCol = j;
        if (cell.includes("QUANT") || cell.includes("QTD")) qtyCol = j;
        if (productCol !== -1 && marginCol !== -1) {
          headerRow = i;
          break;
        }
      }
      if (headerRow !== -1) break;
    }

    if (headerRow !== -1) {
      const pastasCategoryId = categoryMap.get("Pastas A4");
      if (pastasCategoryId) {
        // Agrupar por produto e quantidade
        const productMargins = new Map<string, Array<{ qty: number; margin: number }>>();

        for (let i = headerRow + 1; i < data.length; i++) {
          const row = data[i];
          if (!Array.isArray(row)) continue;

          const productName = productCol !== -1 ? String(row[productCol] || "").trim() : "";
          const margin = normalizeMargin(row[marginCol]);
          const qty = qtyCol !== -1 ? Number(row[qtyCol]) || undefined : undefined;

          if (!productName || margin === null) continue;

          const key = normalizeProductName(productName);
          if (!productMargins.has(key)) {
            productMargins.set(key, []);
          }
          if (qty && margin !== null) {
            productMargins.get(key)!.push({ qty, margin });
          }
        }

        // Criar margens dinâmicas ou por produto
        for (const [productName, margins] of productMargins.entries()) {
          if (margins.length === 0) continue;

          const productId = await findProductByName(productName, pastasCategoryId);
          
          if (productId) {
            // Se há múltiplas margens, criar regra dinâmica
            if (margins.length > 1) {
              const sortedMargins = margins.sort((a, b) => a.qty - b.qty);
              const baseMargin = sortedMargins[0].margin;

              for (let i = 1; i < sortedMargins.length; i++) {
                const { qty, margin } = sortedMargins[i];
                const adjustPercent = margin - baseMargin;

                if (Math.abs(adjustPercent) > 0.001) {
                  const existing = await prisma.marginRuleDynamic.findFirst({
                    where: {
                      scope: "PRODUCT",
                      productId,
                      minQuantity: qty,
                      active: true
                    }
                  });

                  if (!existing) {
                    await prisma.marginRuleDynamic.create({
                      data: {
                        scope: "PRODUCT",
                        productId,
                        minQuantity: qty,
                        adjustPercent: adjustPercent.toFixed(4),
                        priority: 100 - i,
                        active: true
                      }
                    });
                    dynamicMarginsCreated++;
                    console.log(`    ✅ ${productName}: Qtd >= ${qty} → ajuste ${(adjustPercent * 100).toFixed(0)}%`);
                  }
                }
              }
            } else {
              // Margem fixa por produto
              const margin = margins[0].margin;
              const existing = await prisma.marginRule.findFirst({
                where: { scope: "PRODUCT", productId, active: true }
              });

              if (!existing) {
                await prisma.marginRule.create({
                  data: {
                    scope: "PRODUCT",
                    productId,
                    margin: margin.toFixed(4),
                    active: true
                  }
                });
                productMarginsCreated++;
                console.log(`    ✅ ${productName}: ${(margin * 100).toFixed(0)}%`);
              }
            }
          }
        }
      }
    }
  }

  // Analisar FLEX/Têxteis (margem fixa de 40%)
  console.log("\n  👕 Verificando Têxteis (FLEX)...");
  const textilesCategoryId = categoryMap.get("Têxteis Personalizados");
  if (textilesCategoryId) {
    const textiles = await prisma.product.findMany({
      where: { categoryId: textilesCategoryId },
      select: { id: true, name: true }
    });

    for (const product of textiles) {
      const existing = await prisma.marginRule.findFirst({
        where: { scope: "PRODUCT", productId: product.id, active: true }
      });

      if (!existing) {
        await prisma.marginRule.create({
          data: {
            scope: "PRODUCT",
            productId: product.id,
            margin: "0.40", // 40% para têxteis
            active: true
          }
        });
        productMarginsCreated++;
        console.log(`    ✅ ${product.name}: 40%`);
      }
    }
  }

  // Analisar Cartões PVC (margem de 4%)
  console.log("\n  💳 Verificando Cartões PVC...");
  const pvcCategoryId = categoryMap.get("Cartões PVC");
  if (pvcCategoryId) {
    const pvcProducts = await prisma.product.findMany({
      where: { categoryId: pvcCategoryId },
      select: { id: true, name: true }
    });

    for (const product of pvcProducts) {
      const existing = await prisma.marginRule.findFirst({
        where: { scope: "PRODUCT", productId: product.id, active: true }
      });

      if (!existing) {
        await prisma.marginRule.create({
          data: {
            scope: "PRODUCT",
            productId: product.id,
            margin: "0.04", // 4% para PVC
            active: true
          }
        });
        productMarginsCreated++;
        console.log(`    ✅ ${product.name}: 4%`);
      }
    }
  }

  console.log("\n" + "=".repeat(120));
  console.log(`✅ RESUMO:`);
  console.log(`  - Margens por produto criadas: ${productMarginsCreated}`);
  console.log(`  - Margens dinâmicas criadas: ${dynamicMarginsCreated}`);
  console.log("=".repeat(120));

  // Listar todas as margens
  const [allFixed, allDynamic] = await Promise.all([
    prisma.marginRule.findMany({
      where: { active: true },
      include: {
        category: { select: { name: true } },
        product: { select: { name: true } }
      },
      orderBy: [{ scope: "asc" }, { categoryId: "asc" }, { productId: "asc" }]
    }),
    prisma.marginRuleDynamic.findMany({
      where: { active: true },
      include: {
        category: { select: { name: true } },
        product: { select: { name: true } }
      },
      orderBy: [{ priority: "asc" }]
    })
  ]);

  console.log("\n📋 Regras de Margem FIXA Ativas:");
  const byScope = allFixed.reduce((acc, r) => {
    if (!acc[r.scope]) acc[r.scope] = [];
    acc[r.scope].push(r);
    return acc;
  }, {} as Record<string, typeof allFixed>);

  for (const [scope, rules] of Object.entries(byScope)) {
    console.log(`\n  ${scope}:`);
    for (const rule of rules) {
      const target = rule.category?.name || rule.product?.name || "Global";
      console.log(`    - ${target}: ${(Number(rule.margin) * 100).toFixed(0)}%`);
    }
  }

  if (allDynamic.length > 0) {
    console.log("\n📋 Regras de Margem DINÂMICA Ativas:");
    for (const rule of allDynamic) {
      const target = rule.category?.name || rule.product?.name || "Global";
      const conditions = [];
      if (rule.minQuantity) conditions.push(`Qtd >= ${rule.minQuantity}`);
      if (rule.minSubtotal) conditions.push(`Subtotal >= €${rule.minSubtotal}`);
      console.log(`    - ${target}: ${(Number(rule.adjustPercent) * 100).toFixed(0)}% ${conditions.length > 0 ? `(${conditions.join(", ")})` : ""}`);
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

