import { prisma } from "../lib/prisma";
import { runImportMaterialsPaper } from "../scripts/import-materials-paper";

describe("materials paper import", () => {
  jest.setTimeout(120000);

  afterAll(async () => { await prisma.$disconnect(); });

  it("normalizer count > 0", async () => {
    // Execute the normalizer script via ts-node/tsx? Simpler: require fs to check file exists after running externally
    // We'll spawn via dynamic import to ensure it runs
    const { default: cp } = await import("node:child_process");
    await new Promise<void>((resolve, reject) => {
      const ps = cp.spawn("npm", ["run", "import:materials:paper:normalize"], { shell: true });
      ps.on("exit", code => code === 0 ? resolve() : reject(new Error("normalize failed")));
    });
    const fs = await import("fs");
    const path = await import("path");
    const outPath = path.join(process.cwd(), "data/normalized/materials.paper.json");
    expect(fs.existsSync(outPath)).toBe(true);
    const rows = JSON.parse(fs.readFileSync(outPath, "utf8"));
    expect(Array.isArray(rows) && rows.length > 0).toBe(true);
  });

  it("idempotent importer", async () => {
    const first = await runImportMaterialsPaper();
    const second = await runImportMaterialsPaper();
    expect(first.materialsCreated + first.materialsUpdated + first.variantsCreated + first.variantsUpdated).toBeGreaterThanOrEqual(0);
    expect(second).toEqual({ materialsCreated: 0, materialsUpdated: 0, variantsCreated: 0, variantsUpdated: 0 });
  });

  it("sanity query", async () => {
    const rows = await prisma.material.findMany({ where: { type: "papel", unit: "SHEET", isCurrent: true }, take: 50 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.some(r => Number((r as any).unitCost) > 0)).toBe(true);
    const anyVar = await prisma.materialVariant.findFirst({ where: { materialId: { in: rows.map(r => r.id) } } });
    if (anyVar) {
      if (anyVar.widthMm != null) expect(anyVar.widthMm).toBeGreaterThan(0);
      if (anyVar.heightMm != null) expect(anyVar.heightMm).toBeGreaterThan(0);
    }
  });
});


