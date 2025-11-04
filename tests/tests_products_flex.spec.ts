import { prisma } from "../lib/prisma";
import { runImportProductsFlex } from "../scripts/import-products-flex";
import { calcQuote } from "../lib/calc-quote";
import { execSync } from "child_process";

describe("Flex/Postes/Tendas import and smoke", () => {
  jest.setTimeout(120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("normalizer emits > 0 items", async () => {
    execSync("npm run import:flex:normalize", { stdio: "pipe", cwd: process.cwd() });
    const fs = await import("fs");
    const path = await import("path");
    const outPath = path.join(process.cwd(), "data/normalized/products.flex.json");
    expect(fs.existsSync(outPath)).toBe(true);
    const norm = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    expect(norm.length).toBeGreaterThan(0);
  });

  it("importer is idempotent", async () => {
    const first = await runImportProductsFlex();
    const second = await runImportProductsFlex();

    // Second run should be perfectly idempotent
    expect(second.productsCreated).toBe(0);
    expect(second.productsUpdated).toBe(0);
    expect(second.printingsCreated).toBe(0);
    expect(second.printingsUpdated).toBe(0);
    expect(second.materialsCreated).toBe(0);
    expect(second.materialsUpdated).toBe(0);
    expect(second.finishesCreated).toBe(0);
    expect(second.finishesUpdated).toBe(0);
    expect(second.linksPMCreated).toBe(0);
    expect(second.linksPFCreated).toBe(0);
    expect(second.suggestedCreated).toBe(0);
  });

  it("sanity: one product exists with GRANDE_FORMATO printing", async () => {
    const prod = await prisma.product.findFirst({
      where: {
        category: { name: "Grande Formato — Flex/Postes/Tendas" },
      } as any,
      include: {
        printing: true,
        materials: { include: { material: true } },
      } as any,
    });

    expect(prod).toBeTruthy();
    expect(prod?.printing?.technology).toBe("GRANDE_FORMATO");
    expect(prod?.materials?.length).toBeGreaterThan(0);
  });

  it("smoke calcQuote for 1F product", async () => {
    const prod = await prisma.product.findFirst({
      where: {
        category: { name: "Grande Formato — Flex/Postes/Tendas" },
        name: { contains: "1F" },
      } as any,
      include: {
        materials: { include: { material: true } },
        printing: true,
        finishes: { include: { finish: true } },
      } as any,
    });

    expect(prod).toBeTruthy();
    const q = await calcQuote(prod!.id, 1, {}, {});
    expect(Number(q.final)).toBeGreaterThan(0);
    expect(q.items.some((i: any) => i.type === "MATERIAL")).toBe(true);
    expect(q.items.some((i: any) => i.type === "PRINTING")).toBe(true);
    // Finishes são opcionais para 1F (pode não ter estrutura/montagem)
  });

  it("smoke calcQuote for 2F product (should include additional face cost)", async () => {
    const prod = await prisma.product.findFirst({
      where: {
        category: { name: "Grande Formato — Flex/Postes/Tendas" },
        name: { contains: "2F" },
      } as any,
      include: {
        materials: { include: { material: true } },
        printing: true,
        finishes: { include: { finish: true } },
      } as any,
    });

    expect(prod).toBeTruthy();
    const q = await calcQuote(prod!.id, 1, {}, {});
    expect(Number(q.final)).toBeGreaterThan(0);
    expect(q.items.some((i: any) => i.type === "MATERIAL")).toBe(true);
    expect(q.items.some((i: any) => i.type === "PRINTING")).toBe(true);
    expect(q.items.some((i: any) => i.type === "FINISH")).toBe(true);

    // Verificar que há um finish "Camada de Impressão (faces)" com qtyPerUnit > 0 para 2F
    const faceFinish = prod?.finishes?.find((f: any) => f.finish.name.includes("Camada de Impressão"));
    if (faceFinish) {
      expect(Number(faceFinish.qtyPerUnit)).toBeGreaterThan(0);
    }
  });
});

