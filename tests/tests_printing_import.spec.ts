import { prisma } from "../lib/prisma";
import { runImportPrinting } from "../scripts/import-printing";
import { PrintingTech } from "@prisma/client";

describe("printing import", () => {
  jest.setTimeout(60000);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("idempotência forte na segunda execução", async () => {
    await runImportPrinting();
    const second = await runImportPrinting();
    expect(second.created).toBe(0);
    expect(second.updated).toBe(0);
  });

  it("sanidade: A4, SRA3, BANNER com unitPrice > 0 e tecnologia correta", async () => {
    const check = async (label: string, expectedTech: PrintingTech) => {
      const row = await prisma.printing.findFirst({
        where: { isCurrent: true, formatLabel: { equals: label, mode: "insensitive" } },
      });
      expect(row).toBeTruthy();
      expect(Number((row as any).unitPrice)).toBeGreaterThan(0);
      expect(row!.technology).toBe(expectedTech);
    };
    await check("A4", PrintingTech.DIGITAL);
    await check("SRA3", PrintingTech.DIGITAL);
    await check("BANNER", PrintingTech.GRANDE_FORMATO);
  });
});


