import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const DATA_PATH = path.resolve(process.cwd(), "data", "all-customer-prices-from-excel.json");

interface CustomerPrice {
  cliente: string;
  tipo: "material" | "impressao" | "acabamento";
  nome: string;
  preco: number;
  unidade?: string;
  aba?: string;
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ")
    .replace(/[€$]/g, "")
    .replace(/\d+[.,]\d+\s*€/g, "")
    .trim();
}

function findMaterialByName(name: string): Promise<any> {
  const normalized = normalizeName(name);
  
  // Tentar match exato primeiro
  return prisma.material.findFirst({
    where: {
      isCurrent: true,
      OR: [
        { name: { equals: name, mode: "insensitive" } },
        { name: { equals: normalized, mode: "insensitive" } },
        { name: { contains: normalized.split(" ")[0], mode: "insensitive" } }
      ]
    }
  });
}

function findPrintingByName(name: string): Promise<any> {
  const normalized = normalizeName(name);
  
  // Tentar match por formatLabel (que é String)
  return prisma.printing.findFirst({
    where: {
      isCurrent: true,
      OR: [
        { formatLabel: { contains: normalized, mode: "insensitive" } },
        { formatLabel: { contains: name, mode: "insensitive" } }
      ]
    }
  });
}

function findFinishByName(name: string): Promise<any> {
  const normalized = normalizeName(name);
  
  return prisma.finish.findFirst({
    where: {
      isCurrent: true,
      OR: [
        { name: { equals: name, mode: "insensitive" } },
        { name: { equals: normalized, mode: "insensitive" } },
        { name: { contains: normalized.split(" ")[0], mode: "insensitive" } }
      ]
    }
  });
}

async function main() {
  console.log("=".repeat(120));
  console.log("💰 Importando Preços por Cliente");
  console.log("=".repeat(120));
  console.log();

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`❌ Arquivo não encontrado: ${DATA_PATH}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  const prices: CustomerPrice[] = [];

  // Extrair todos os preços do objeto byCustomer
  if (data.byCustomer) {
    for (const customerName in data.byCustomer) {
      const customerPrices = data.byCustomer[customerName];
      if (Array.isArray(customerPrices)) {
        prices.push(...customerPrices);
      }
    }
  } else if (Array.isArray(data)) {
    prices.push(...data);
  }

  console.log(`📋 Total de preços encontrados: ${prices.length}`);
  console.log();

  let materialsCreated = 0;
  let materialsUpdated = 0;
  let materialsSkipped = 0;
  let printingsCreated = 0;
  let printingsUpdated = 0;
  let printingsSkipped = 0;
  let finishesCreated = 0;
  let finishesUpdated = 0;
  let finishesSkipped = 0;

  // Agrupar por cliente para melhor organização
  const byCustomer = new Map<string, CustomerPrice[]>();
  for (const price of prices) {
    const customerName = price.cliente.toUpperCase().trim();
    if (!byCustomer.has(customerName)) {
      byCustomer.set(customerName, []);
    }
    byCustomer.get(customerName)!.push(price);
  }

  console.log(`👥 Total de clientes com preços: ${byCustomer.size}`);
  console.log();

  for (const [customerName, customerPrices] of byCustomer.entries()) {
    // Buscar cliente
    const customer = await prisma.customer.findFirst({
      where: {
        name: { equals: customerName, mode: "insensitive" },
        isActive: true
      }
    });

    if (!customer) {
      console.warn(`⚠️  Cliente não encontrado: ${customerName}`);
      continue;
    }

    console.log(`\n👤 ${customerName} (${customerPrices.length} preços)`);

    for (const price of customerPrices) {
      try {
        if (price.tipo === "material") {
          const material = await findMaterialByName(price.nome);
          
          if (!material) {
            console.warn(`  ⚠️  Material não encontrado: ${price.nome}`);
            materialsSkipped++;
            continue;
          }

          // Verificar se já existe
          const existing = await prisma.materialCustomerPrice.findFirst({
            where: {
              materialId: material.id,
              customerId: customer.id,
              isCurrent: true
            }
          });

          if (existing) {
            // Atualizar se o preço mudou
            if (Number(existing.unitCost) !== price.preco) {
              await prisma.materialCustomerPrice.update({
                where: { id: existing.id },
                data: { unitCost: price.preco.toFixed(4) }
              });
              materialsUpdated++;
              console.log(`  ✅ Material atualizado: ${material.name} → €${price.preco.toFixed(2)}`);
            }
          } else {
            // Criar novo
            await prisma.materialCustomerPrice.create({
              data: {
                materialId: material.id,
                customerId: customer.id,
                unitCost: price.preco.toFixed(4),
                priority: 100,
                isCurrent: true
              }
            });
            materialsCreated++;
            console.log(`  ✅ Material criado: ${material.name} → €${price.preco.toFixed(2)}`);
          }
        } else if (price.tipo === "impressao") {
          const printing = await findPrintingByName(price.nome);
          
          if (!printing) {
            console.warn(`  ⚠️  Impressão não encontrada: ${price.nome}`);
            printingsSkipped++;
            continue;
          }

          // Verificar se já existe
          const existing = await prisma.printingCustomerPrice.findFirst({
            where: {
              printingId: printing.id,
              customerId: customer.id,
              isCurrent: true
            }
          });

          if (existing) {
            // Atualizar se o preço mudou
            if (Number(existing.unitPrice) !== price.preco) {
              await prisma.printingCustomerPrice.update({
                where: { id: existing.id },
                data: { unitPrice: price.preco.toFixed(4) }
              });
              printingsUpdated++;
              console.log(`  ✅ Impressão atualizada: ${printing.formatLabel || printing.technology} → €${price.preco.toFixed(2)}`);
            }
          } else {
            // Criar novo
            await prisma.printingCustomerPrice.create({
              data: {
                printingId: printing.id,
                customerId: customer.id,
                unitPrice: price.preco.toFixed(4),
                priority: 100,
                isCurrent: true
              }
            });
            printingsCreated++;
            console.log(`  ✅ Impressão criada: ${printing.formatLabel || printing.technology} → €${price.preco.toFixed(2)}`);
          }
        } else if (price.tipo === "acabamento") {
          const finish = await findFinishByName(price.nome);
          
          if (!finish) {
            console.warn(`  ⚠️  Acabamento não encontrado: ${price.nome}`);
            finishesSkipped++;
            continue;
          }

          // Verificar se já existe
          const existing = await prisma.finishCustomerPrice.findFirst({
            where: {
              finishId: finish.id,
              customerId: customer.id,
              isCurrent: true
            }
          });

          if (existing) {
            // Atualizar se o preço mudou
            if (Number(existing.baseCost) !== price.preco) {
              await prisma.finishCustomerPrice.update({
                where: { id: existing.id },
                data: { baseCost: price.preco.toFixed(4) }
              });
              finishesUpdated++;
              console.log(`  ✅ Acabamento atualizado: ${finish.name} → €${price.preco.toFixed(2)}`);
            }
          } else {
            // Criar novo
            await prisma.finishCustomerPrice.create({
              data: {
                finishId: finish.id,
                customerId: customer.id,
                baseCost: price.preco.toFixed(4),
                priority: 100,
                isCurrent: true
              }
            });
            finishesCreated++;
            console.log(`  ✅ Acabamento criado: ${finish.name} → €${price.preco.toFixed(2)}`);
          }
        }
      } catch (error: any) {
        console.error(`  ❌ Erro ao processar ${price.tipo} "${price.nome}":`, error.message);
      }
    }
  }

  console.log(`\n${"=".repeat(120)}`);
  console.log(`✅ RESUMO:`);
  console.log("=".repeat(120));
  console.log();
  console.log(`📄 MATERIAIS:`);
  console.log(`  - Criados: ${materialsCreated}`);
  console.log(`  - Atualizados: ${materialsUpdated}`);
  console.log(`  - Pulados: ${materialsSkipped}`);
  console.log();
  console.log(`🖨️  IMPRESSÕES:`);
  console.log(`  - Criadas: ${printingsCreated}`);
  console.log(`  - Atualizadas: ${printingsUpdated}`);
  console.log(`  - Puladas: ${printingsSkipped}`);
  console.log();
  console.log(`✨ ACABAMENTOS:`);
  console.log(`  - Criados: ${finishesCreated}`);
  console.log(`  - Atualizados: ${finishesUpdated}`);
  console.log(`  - Pulados: ${finishesSkipped}`);
  console.log();
  console.log(`👥 CLIENTES PROCESSADOS: ${byCustomer.size}`);
  console.log("=".repeat(120));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });

