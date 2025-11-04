import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { calcQuote } from "../lib/calc-quote";
import { runImportProductsCardsPVC } from "../scripts/import-products-cards-pvc";

const run = (cmd: string) => execSync(cmd, { stdio: "pipe", cwd: process.cwd() }).toString();

describe("PVC Cards - normalize, import, idempotence and smoke", () => {
  jest.setTimeout(120000);

  afterAll(async () => { await prisma.$disconnect(); });

  it("normalizer emits printings/materials/products", () => {
    const out = run("npm run import:products:cards-pvc:normalize");
    expect(out).toMatch(/\"printings\":/);
    const outPath = path.resolve(process.cwd(), "data/normalized/products.cards.pvc.json");
    expect(fs.existsSync(outPath)).toBe(true);
    const j = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    expect(Array.isArray(j.printings) && j.printings.length >= 2).toBe(true);
    expect(Array.isArray(j.products) && j.products.length > 0).toBe(true);
  });

  it("importer is idempotent", async () => {
    const r1 = await runImportProductsCardsPVC();
    const r2 = await runImportProductsCardsPVC();

    // Second run ideally 0 updates/creates
    expect(r2.productsCreated).toBe(0);
    expect(r2.productsUpdated).toBe(0);
    expect(r2.printingsCreated).toBe(0);
    expect(r2.printingsUpdated).toBe(0);
    expect(r2.materialsCreated).toBe(0);
    // material may update only if DB had drift
    expect(r2.linksPMCreated).toBe(0);
    expect(r2.suggestedCreated).toBe(0);
  });

  it("smoke calcQuote 4/0 and 4/4", async () => {
    const p40 = await prisma.product.findFirst({
      where: { name: { contains: "Cartão PVC", mode: "insensitive" } },
      orderBy: { id: "asc" },
    });
    expect(p40).toBeTruthy();

    const p44 = await prisma.product.findFirst({
      where: { name: { contains: "— 4/4", mode: "insensitive" } },
    });
    expect(p44).toBeTruthy();

    const q1 = await calcQuote(p40!.id, 64, {}, {});
    expect(Number(q1.final)).toBeGreaterThan(0);
    expect(q1.items.some((i: any) => i.type === "MATERIAL")).toBe(true);
    expect(q1.items.some((i: any) => i.type === "PRINTING")).toBe(true);

    const q2 = await calcQuote(p44!.id, 25, {}, {});
    expect(Number(q2.final)).toBeGreaterThan(0);
    expect(q2.items.some((i: any) => i.type === "MATERIAL")).toBe(true);
    const printingItems40 = q1.items.filter((i: any) => i.type === "PRINTING");
    const printingItems44 = q2.items.filter((i: any) => i.type === "PRINTING");
    expect(printingItems40.length).toBeGreaterThan(0);
    expect(printingItems44.length).toBeGreaterThan(0);
  });
});
