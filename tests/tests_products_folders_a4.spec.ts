import { prisma } from "../lib/prisma";
import { runImportProductsFoldersA4 } from "../scripts/import-products-folders-a4";
import { calcQuote } from "../lib/calc-quote";

describe("Pastas A4 import and quote smoke", () => {
  jest.setTimeout(120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("normalizer emits > 0 items", async () => {
    const { default: cp } = await import("node:child_process");
    await new Promise<void>((resolve, reject) => {
      const p = cp.spawn("npm", ["run", "import:products:folders-a4:normalize"], { shell: true });
      p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("normalize folders failed"))));
    });
    const fs = await import("fs");
    const path = await import("path");
    const outPath = path.join(process.cwd(), "data/normalized/products.folders.a4.json");
    expect(fs.existsSync(outPath)).toBe(true);
    const norm = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    expect(norm.length).toBeGreaterThan(0);
  });

  it("importer is idempotent", async () => {
    const first = await runImportProductsFoldersA4();
    const second = await runImportProductsFoldersA4();

    // Second run should be perfectly idempotent
    expect(second.productsCreated).toBe(0);
    expect(second.productsUpdated).toBe(0);
    expect(second.materialsLinked).toBe(0);
    expect(second.finishesLinked).toBe(0);
    expect(second.suggestedCreated).toBe(0);
    expect(second.printingsCreated).toBe(0);
  });

  it("sanity: one product exists", async () => {
    const prod = await prisma.product.findFirst({
      where: { category: { name: "Pastas A4" } } as any,
    });
    expect(prod).not.toBeNull();
  });

  it("smoke calcQuote", async () => {
    const prod = await prisma.product.findFirst({
      where: { category: { name: "Pastas A4" } } as any,
      include: { materials: { include: { material: true } }, printing: true, finishes: { include: { finish: true } } } as any,
    });
    expect(prod).toBeTruthy();
    const q = await calcQuote(prod!.id, 50, {}, {});
    expect(Number(q.final)).toBeGreaterThan(0);
    expect(q.items.some((i: any) => i.type === "MATERIAL")).toBe(true);
    expect(q.items.some((i: any) => i.type === "PRINTING")).toBe(true);
  });
});

