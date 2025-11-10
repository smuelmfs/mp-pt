import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  console.log("=".repeat(120));
  console.log("📊 Análise: Produtos Faltantes vs Sistema");
  console.log("=".repeat(120));
  console.log();

  // 1. Produtos de Catálogos
  const catalogosPath = path.resolve(process.cwd(), "data", "products-catalogos.json");
  let catalogosCount = 0;
  if (fs.existsSync(catalogosPath)) {
    const catalogos = JSON.parse(fs.readFileSync(catalogosPath, "utf-8"));
    catalogosCount = Array.isArray(catalogos) ? catalogos.length : 0;
  }

  // 2. Produtos de Impressões Singulares
  const singularesPath = path.resolve(process.cwd(), "data", "products-impressoes-singulares.json");
  let singularesCount = 0;
  let singularesUnicos = 0;
  if (fs.existsSync(singularesPath)) {
    const singulares = JSON.parse(fs.readFileSync(singularesPath, "utf-8"));
    if (Array.isArray(singulares)) {
      singularesCount = singulares.length;
      const unique = new Set(singulares.map((p: any) => p.description?.toUpperCase().trim()));
      singularesUnicos = unique.size;
    }
  }

  // 3. Produtos no sistema
  const systemProducts = await prisma.product.findMany({
    where: { active: true },
    select: { id: true, name: true, category: { select: { name: true } } }
  });

  console.log("📦 PRODUTOS:");
  console.log(`  - No sistema: ${systemProducts.length}`);
  console.log(`  - Catálogos (extraídos): ${catalogosCount}`);
  console.log(`  - Impressões Singulares (extraídos): ${singularesCount} (${singularesUnicos} únicos)`);
  console.log(`  - Total faltando: ${catalogosCount + singularesUnicos} produtos`);
  console.log();

  // 4. Clientes sem preços
  const customersWithoutPrices = await prisma.customer.findMany({
    where: {
      isActive: true,
      materialPrices: { none: {} },
      printingPrices: { none: {} },
      finishPrices: { none: {} }
    },
    select: { id: true, name: true }
  });

  console.log("👥 CLIENTES:");
  console.log(`  - Total ativos: ${await prisma.customer.count({ where: { isActive: true } })}`);
  console.log(`  - Sem preços específicos: ${customersWithoutPrices.length}`);
  console.log();

  // 5. Materiais sem fornecedor
  const materialsWithoutSupplier = await prisma.material.findMany({
    where: {
      isCurrent: true,
      supplierId: null
    },
    select: { id: true, name: true, type: true }
  });

  console.log("📄 MATERIAIS:");
  console.log(`  - Total ativos: ${await prisma.material.count({ where: { isCurrent: true } })}`);
  console.log(`  - Sem fornecedor: ${materialsWithoutSupplier.length}`);
  if (materialsWithoutSupplier.length > 0) {
    console.log(`  Exemplos: ${materialsWithoutSupplier.slice(0, 3).map(m => m.name).join(", ")}`);
  }
  console.log();

  // 6. Impressões sem preço
  const allPrintings = await prisma.printing.findMany({
    where: { isCurrent: true },
    select: { id: true, formatLabel: true, technology: true, unitPrice: true }
  });
  
  const printingsWithoutPrice = allPrintings.filter(p => {
    const price = Number(p.unitPrice || 0);
    return price === 0 || isNaN(price);
  });

  console.log("🖨️  IMPRESSÕES:");
  console.log(`  - Total ativas: ${await prisma.printing.count({ where: { isCurrent: true } })}`);
  console.log(`  - Sem preço ou preço zero: ${printingsWithoutPrice.length}`);
  if (printingsWithoutPrice.length > 0) {
    console.log(`  Exemplos: ${printingsWithoutPrice.slice(0, 3).map(p => p.formatLabel || p.technology).join(", ")}`);
  }
  console.log();

  // Resumo
  console.log("=".repeat(120));
  console.log("📊 RESUMO DO QUE FALTA:");
  console.log("=".repeat(120));
  console.log();
  console.log("🔥 PRIORIDADE ALTA:");
  console.log(`  1. Importar ${singularesUnicos} produtos de Impressões Singulares`);
  console.log(`  2. Importar ${catalogosCount} produtos de Catálogos`);
  console.log();
  console.log("🟡 PRIORIDADE MÉDIA:");
  console.log(`  3. Adicionar preços específicos para ${customersWithoutPrices.length} clientes`);
  console.log();
  console.log("🟢 PRIORIDADE BAIXA:");
  console.log(`  4. Associar fornecedores a ${materialsWithoutSupplier.length} materiais`);
  console.log(`  5. Ajustar preços de ${printingsWithoutPrice.length} impressões`);
  console.log();

  await prisma.$disconnect();
}

main().catch(console.error);

