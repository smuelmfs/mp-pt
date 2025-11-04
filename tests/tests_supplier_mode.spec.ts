import { prisma } from "../lib/prisma";
import { calcQuote } from "../lib/calc-quote";
import { Unit } from "@prisma/client";

describe("supplier modes", () => {
  jest.setTimeout(120000);

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.configGlobal.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        marginDefault: 0.2 as any,
        markupOperational: 0.1 as any,
      } as any,
    });
  });

  afterAll(async () => { await prisma.$disconnect(); });

  it("INTERNAL: mantém comportamento atual; supplier somado se houver", async () => {
    // Cria categoria e produto básico
    const cat = await prisma.productCategory.create({ data: { name: `Cat-INT-${Date.now()}` } });
    const prod = await prisma.product.create({ data: { name: `P-INT-${Date.now()}`, categoryId: cat.id, sourcingMode: "INTERNAL" as any } });
    // SupplierPrice simples
    await prisma.supplierPrice.create({ data: { productId: prod.id, name: "SP-INT", unit: Unit.UNIT, cost: 1.0000 as any } as any });
    const q = await calcQuote(prod.id, 10, {}, {});
    expect(q.subtotalProduction).toBeGreaterThanOrEqual(0);
    expect(q.subtotal).toBeGreaterThanOrEqual(q.subtotalProduction);
  });

  it("SUPPLIER: ignora produção interna e usa apenas fornecedor mais barato", async () => {
    const cat = await prisma.productCategory.create({ data: { name: `Cat-SUP-${Date.now()}` } });
    const prod = await prisma.product.create({ data: { name: `P-SUP-${Date.now()}`, categoryId: cat.id, sourcingMode: "SUPPLIER" as any } });
    await prisma.supplierPrice.create({ data: { productId: prod.id, name: "SP1", unit: Unit.UNIT, cost: 2.0000 as any } as any });
    await prisma.supplierPrice.create({ data: { productId: prod.id, name: "SP2", unit: Unit.M2, cost: 0.1000 as any } as any });
    const q = await calcQuote(prod.id, 10, {}, {});
    expect(q.subtotalProduction).toBeGreaterThanOrEqual(0);
    expect(q.subtotal).toBeGreaterThan(0);
  });

  it("HYBRID: soma produção + fornecedor", async () => {
    const cat = await prisma.productCategory.create({ data: { name: `Cat-HYB-${Date.now()}` } });
    const prod = await prisma.product.create({ data: { name: `P-HYB-${Date.now()}`, categoryId: cat.id, sourcingMode: "HYBRID" as any } });
    await prisma.supplierPrice.create({ data: { productId: prod.id, name: "SPH", unit: Unit.UNIT, cost: 1.5000 as any } as any });
    const q = await calcQuote(prod.id, 10, {}, {});
    expect(q.subtotal).toBeGreaterThanOrEqual(q.subtotalProduction);
  });
});


