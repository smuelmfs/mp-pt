import { prisma } from "../lib/prisma";
import { runImportFinishes } from "../scripts/import-finishes";

describe("finishes import", () => {
  jest.setTimeout(120000);
  afterAll(async () => { await prisma.$disconnect(); });

  it("normalizer emits > 0 items", async () => {
    const { default: cp } = await import("node:child_process");
    await new Promise<void>((resolve, reject) => {
      const p = cp.spawn("npm", ["run", "import:finishes:normalize"], { shell: true });
      p.on("exit", code => code === 0 ? resolve() : reject(new Error("normalize finishes failed")));
    });
    const fs = await import("fs");
    const path = await import("path");
    const outPath = path.join(process.cwd(), "data/normalized/finishes.json");
    expect(fs.existsSync(outPath)).toBe(true);
    const rows = JSON.parse(fs.readFileSync(outPath, "utf8"));
    expect(Array.isArray(rows) && rows.length > 0).toBe(true);
  });

  it("idempotent importer", async () => {
    const first = await runImportFinishes();
    const second = await runImportFinishes();
    expect(first.created + first.updated).toBeGreaterThanOrEqual(0);
    expect(second).toEqual({ created: 0, updated: 0 });
  });

  it("sanity names and fields", async () => {
    const names = [
      "Corte NORMAL", "Corte A4", "Corte com dobra", "Agrafos",
      "Plastificação (face)", "Laminação Dourada/Prateada",
    ];
    for (const n of names) {
      const f = await prisma.finish.findFirst({ where: { name: { equals: n, mode: "insensitive" } } });
      expect(f).toBeTruthy();
      expect(Number((f as any).baseCost)).toBeGreaterThan(0);
      if (n === "Corte com dobra") {
        expect((f as any).calcType).toBe("PER_UNIT");
        expect(Number((f as any).minFee)).toBeGreaterThan(0);
      }
    }
  });
});


