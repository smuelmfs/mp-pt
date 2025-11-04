import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { calcQuote } from "../lib/calc-quote";
import { runImportProductsAlveolar } from "../scripts/import-products-alveolar";

const run = (cmd: string) => execSync(cmd, { stdio: "pipe", cwd: process.cwd() }).toString();

describe("Alveolar (rigid boards) - normalize, import, idempotence, smoke", () => {
  jest.setTimeout(120000);

  afterAll(async () => { await prisma.$disconnect(); });

  it("normalizer emits > 0 items", () => {
    const out = run("npm run import:alveolar:normalize");
    expect(out).toMatch(/\"count\":/);
    const outPath = path.resolve(process.cwd(), "data/normalized/products.alveolar.json");
    expect(fs.existsSync(outPath)).toBe(true);
    const arr = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    expect(Array.isArray(arr) && arr.length > 0).toBe(true);
  });

  it("importer is idempotent", async () => {
    const r1 = await runImportProductsAlveolar();
    const r2 = await runImportProductsAlveolar();

    expect(r2.productsCreated).toBe(0);
    expect(r2.productsUpdated).toBe(0);
    expect(r2.materialsCreated).toBe(0);
    expect(r2.materialsUpdated).toBe(0);
    expect(r2.linksPMCreated).toBe(0);
    expect(r2.suggestedCreated).toBe(0);
    expect(r2.printingsLinked).toBe(0);
  });

  it("smoke calcQuote", async () => {
    let prod = await prisma.product.findFirst({
      where: { category: { name: "Placas rígidas" }, widthMm: { not: null } } as any,
      include: { materials: { include: { material: true } }, printing: true } as any,
    });

    if (!prod) {
      prod = await prisma.product.findFirst({
        where: { category: { name: "Placas rígidas" } } as any,
        include: { materials: { include: { material: true } }, printing: true } as any,
      });
      expect(prod).toBeTruthy();
      const q = await calcQuote(prod!.id, 10, {}, {});
      expect(Number(q.subtotalProduction)).toBeGreaterThan(0);
      expect(q.items.some((i: any) => i.type === "MATERIAL")).toBe(true);
      if (prod?.printing) expect(q.items.some((i: any) => i.type === "PRINTING")).toBe(true);
      return;
    }

    const q5 = await calcQuote(prod!.id, 5, {}, {});
    const q20 = await calcQuote(prod!.id, 20, {}, {});
    expect(Number(q5.subtotalProduction)).toBeGreaterThan(0);
    expect(Number(q20.subtotalProduction)).toBeGreaterThan(0);
    expect(q5.items.some((i: any) => i.type === "MATERIAL")).toBe(true);
    if (prod?.printing) expect(q5.items.some((i: any) => i.type === "PRINTING")).toBe(true);
  });
});
