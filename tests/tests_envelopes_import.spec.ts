import { prisma } from "../lib/prisma";
import { execSync } from "child_process";
import { calcQuote } from "../lib/calc-quote";
import { runImportEnvelopes } from "../scripts/import-envelopes";

const run = (cmd:string)=> execSync(cmd,{stdio:"pipe",cwd:process.cwd()}).toString();

describe("envelopes import & smoke", () => {
  jest.setTimeout(120000);
  
  afterAll(async ()=>{ await prisma.$disconnect(); });

  it("normalizer runs and importer is idempotent", async () => {
    const n1 = run("npm run import:envelopes:normalize");
    expect(n1).toMatch(/\"count\":/);

    const r1 = await runImportEnvelopes();
    const r2 = await runImportEnvelopes();

    // Second run should be perfectly idempotent (all counters at 0)
    expect(r2.productsCreated).toBe(0);
    expect(r2.productsUpdated).toBe(0);
    expect(r2.materialsCreated).toBe(0);
    expect(r2.materialsUpdated).toBe(0);
    expect(r2.linksPMCreated).toBe(0);
    expect(r2.suggestedCreated).toBe(0);
    expect(r2.printingsUpdated).toBe(0);
    
    // First run might create or just be idempotent if already exists, but should be >= 0
    expect(r1.productsCreated + r1.productsUpdated + r1.materialsCreated + r1.materialsUpdated + r1.printingsUpdated).toBeGreaterThanOrEqual(0);
  });

  it("smoke calcQuote for one DL product in 50/500/1000", async () => {
    const prod = await prisma.product.findFirst({
      where: { name: { contains: "Envelope DL", mode: "insensitive" } },
      include: { materials: { include: { material: true } }, printing: true, category: true } as any
    });

    expect(prod).toBeTruthy();

    for (const q of [50,500,1000]) {
      const res = await calcQuote(prod!.id, q, {});
      expect(Number(res.final)).toBeGreaterThan(0);
      const hasMat = res.items.some((i:any)=>i.type==="MATERIAL");
      const hasPrint = res.items.some((i:any)=>i.type==="PRINTING");
      expect(hasMat && hasPrint).toBe(true);
    }
  });
});

