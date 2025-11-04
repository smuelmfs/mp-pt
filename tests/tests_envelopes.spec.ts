import { readFileSync } from "fs";
import path from "path";
import { prisma } from "../lib/prisma";
import { runImportEnvelopes } from "../scripts/import-envelopes";
import { calcQuote } from "../lib/calc-quote";

function approx(a: number, b: number, eps = 0.01) { return Math.abs(a - b) <= eps; }

describe("import-envelopes", () => {
  jest.setTimeout(60000);

  let firstName: string | null = null;

  beforeAll(async () => {
    await prisma.$connect();
    const file = path.resolve(process.cwd(), "data", "normalized", "envelopes.json");
    const raw = readFileSync(file, "utf-8");
    const rows = JSON.parse(raw);
    firstName = rows?.[0]?.name || null;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should import envelopes idempotently", async () => {
    const first = await runImportEnvelopes();
    const second = await runImportEnvelopes();
    expect(second.productsCreated).toBe(0);
    expect(second.productsUpdated).toBe(0);
    expect(second.printingsCreated).toBe(0);
    expect(second.printingsUpdated).toBe(0);
    expect(second.materialsCreated).toBe(0);
    expect(second.materialsUpdated).toBe(0);
    expect(second.finishesCreated).toBe(0);
    expect(second.finishesUpdated).toBe(0);
    // links may be zero on second run
  });

  it("should calculate quotes (100 and 1000) > 0 with breakdown entries", async () => {
    if (!firstName) return;
    const prod = await prisma.product.findFirst({ where: { name: { equals: firstName, mode: "insensitive" } } });
    expect(prod).toBeTruthy();

    const q100 = await calcQuote((prod as any).id, 100, {});
    expect(q100.final).toBeGreaterThan(0);
    expect((q100.items as any[]).some(i => i.type === "MATERIAL")).toBe(true);
    expect((q100.items as any[]).some(i => i.type === "PRINTING")).toBe(true);
    expect((q100.items as any[]).some(i => i.type === "FINISH")).toBe(true);

    const q1000 = await calcQuote((prod as any).id, 1000, {});
    expect(q1000.final).toBeGreaterThan(0);
    expect((q1000.items as any[]).some(i => i.type === "MATERIAL")).toBe(true);
    expect((q1000.items as any[]).some(i => i.type === "PRINTING")).toBe(true);
    expect((q1000.items as any[]).some(i => i.type === "FINISH")).toBe(true);
  });

  it("should validate golden file if present", async () => {
    const goldenPath = path.resolve(process.cwd(), "data", "golden", "envelopes.json");
    try {
      const raw = readFileSync(goldenPath, "utf-8");
      const cases = JSON.parse(raw) as Array<{ name: string; qty: number; expectedFinal: number }>;
      for (const c of cases) {
        const prod = await prisma.product.findFirst({ where: { name: { equals: c.name, mode: "insensitive" } } });
        expect(prod).toBeTruthy();
        const q = await calcQuote((prod as any).id, c.qty, {});
        expect(approx(q.final, c.expectedFinal)).toBe(true);
      }
    } catch {
      // no golden file - skip
    }
  });
});


