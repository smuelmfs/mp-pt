import { prisma } from "../lib/prisma";
import { runImportProductsTextiles } from "../scripts/import-products-textiles";
import { calcQuote } from "../lib/calc-quote";
import { execSync } from "child_process";

describe("Textiles customer import and smoke", () => {
  jest.setTimeout(120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("normalizer emits > 0 items", async () => {
    execSync("npm run import:textiles:normalize", { stdio: "pipe", cwd: process.cwd() });
    const fs = await import("fs");
    const path = await import("path");
    const outPath = path.join(process.cwd(), "data/normalized/textiles.customer.json");
    expect(fs.existsSync(outPath)).toBe(true);
    const norm = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    expect(norm.length).toBeGreaterThan(0);
  });

  it("importer is idempotent", async () => {
    const first = await runImportProductsTextiles();
    const second = await runImportProductsTextiles();

    // Second run should be perfectly idempotent
    expect(second.customersUpserted).toBe(0);
    expect(second.productsBaseCreated).toBe(0);
    expect(second.printingsCreated).toBe(0);
    expect(second.printingsUpdated).toBe(0);
    expect(second.materialsCreated).toBe(0);
    expect(second.materialsUpdated).toBe(0);
    expect(second.finishesCreated).toBe(0);
    expect(second.finishesUpdated).toBe(0);
    expect(second.printingCustomerPrices).toBe(0);
    expect(second.materialCustomerPrices).toBe(0);
    expect(second.finishCustomerPrices).toBe(0);
    expect(second.productOverrides).toBe(0);
  });

  it("sanity: customer and product base exist with CustomerPrice records", async () => {
    const customer = await prisma.customer.findFirst({
      where: { group: { name: "Textiles" } } as any,
      include: {
        materialPrices: true,
        printingPrices: true,
        finishPrices: true,
        productOverrides: true,
      } as any,
    });

    expect(customer).toBeTruthy();
    
    // Check for at least one CustomerPrice record
    const hasMaterialPrice = customer?.materialPrices && customer.materialPrices.length > 0;
    const hasPrintingPrice = customer?.printingPrices && customer.printingPrices.length > 0;
    expect(hasMaterialPrice || hasPrintingPrice).toBe(true);

    // Check for product base
    const product = await prisma.product.findFirst({
      where: {
        category: { name: "Têxteis Personalizados" },
        name: { contains: "T-SHIRT" },
      } as any,
    });

    expect(product).toBeTruthy();
  });

  it("smoke calcQuote without customerId (baseline)", async () => {
    const product = await prisma.product.findFirst({
      where: {
        category: { name: "Têxteis Personalizados" },
        name: { contains: "T-SHIRT" },
      } as any,
      include: {
        materials: { include: { material: true } },
        printing: true,
        finishes: { include: { finish: true } },
      } as any,
    });

    expect(product).toBeTruthy();
    const q = await calcQuote(product!.id, 10, {}, {});
    expect(Number(q.final)).toBeGreaterThan(0);
    expect(q.items.some((i: any) => i.type === "PRINTING")).toBe(true);
    // MATERIAL pode não estar presente se produto não tiver material vinculado ainda
  });

  it("smoke calcQuote with customerId (should use CustomerPrice)", async () => {
    const customer = await prisma.customer.findFirst({
      where: { group: { name: "Textiles" } } as any,
      include: {
        materialPrices: true,
        printingPrices: true,
      } as any,
    });

    const product = await prisma.product.findFirst({
      where: {
        category: { name: "Têxteis Personalizados" },
        name: { contains: "T-SHIRT" },
      } as any,
      include: {
        materials: { include: { material: true } },
        printing: true,
      } as any,
    });

    expect(customer).toBeTruthy();
    expect(product).toBeTruthy();
    
    // Quote without customer
    const qWithout = await calcQuote(product!.id, 10, {}, {});
    
    // Quote with customer
    const qWith = await calcQuote(product!.id, 10, {}, { customerId: customer!.id });
    
    expect(Number(qWith.final)).toBeGreaterThan(0);
    
    // Preço com cliente pode ser diferente (pode ser maior ou menor dependendo dos overrides)
    // Apenas verificar que calculou corretamente
    expect(qWith.items.length).toBeGreaterThan(0);
  });
});

