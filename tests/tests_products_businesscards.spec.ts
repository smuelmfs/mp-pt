import { prisma } from "../lib/prisma";
import { runImportProductsBusinessCards } from "../scripts/import-products-businesscards";
import { calcQuote } from "../lib/calc-quote";

describe("products business cards import", () => {
  jest.setTimeout(120000);
  afterAll(async () => { await prisma.$disconnect(); });

  it("normalizer emits > 0 items", async () => {
    const { default: cp } = await import("node:child_process");
    await new Promise<void>((resolve, reject) => {
      const p = cp.spawn("npm", ["run", "import:products:businesscards:normalize"], { shell: true });
      p.on("exit", code => code === 0 ? resolve() : reject(new Error("normalize businesscards failed")));
    });
    const fs = await import("fs");
    const path = await import("path");
    const outPath = path.join(process.cwd(), "data/normalized/products.businesscards.json");
    expect(fs.existsSync(outPath)).toBe(true);
    const rows = JSON.parse(fs.readFileSync(outPath, "utf8"));
    expect(Array.isArray(rows) && rows.length > 0).toBe(true);
  });

  it("idempotent importer", async () => {
    const first = await runImportProductsBusinessCards();
    const second = await runImportProductsBusinessCards();
    expect(first.productsCreated + first.productsUpdated + first.printingsCreated + first.finishesLinked + first.suggestedCreated).toBeGreaterThanOrEqual(0);
    expect(second).toEqual({ productsCreated: 0, productsUpdated: 0, printingsCreated: 0, finishesLinked: 0, suggestedCreated: 0 });
  });

  it("sanity query", async () => {
    const prod = await prisma.product.findFirst({
      where: { name: { equals: "Cartão de Visita Plastificado + Foil 1F", mode: "insensitive" } },
      include: { printing: true, finishes: { include: { finish: true } } } as any,
    });
    expect(prod).toBeTruthy();
    expect(prod!.widthMm).toBe(85);
    expect(prod!.heightMm).toBe(55);
    expect((prod as any).printing?.technology).toBe("DIGITAL");
    const finishNames = ((prod as any).finishes || []).map((pf: any) => (pf.finish?.name || "")).filter(Boolean);
    expect(finishNames).toContain("Plastificação (face)");
    expect(finishNames).toContain("Foil 1F");
  });

  it("smoke calcQuote", async () => {
    const prod = await prisma.product.findFirst({
      where: { name: { contains: "Cartão de Visita", mode: "insensitive" } },
    });
    expect(prod).toBeTruthy();
    const q = await calcQuote(prod!.id, 100, {}, {});
    expect(Number(q.final)).toBeGreaterThan(0);
    expect(q.items.some((i: any) => i.type === "PRINTING")).toBe(true);
    expect(q.items.some((i: any) => i.type === "FINISH")).toBe(true);
  });
});

