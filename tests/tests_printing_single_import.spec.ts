import { prisma } from "../lib/prisma";
import { runImportPrintingSingle } from "../scripts/import-printing-single";
import { PrintingTech } from "@prisma/client";

describe("printing single import", () => {
  jest.setTimeout(120000);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("idempotent second run", async () => {
    await runImportPrintingSingle();
    const second = await runImportPrintingSingle();
    expect(second.created).toBe(0);
    expect(second.updated).toBe(0);
  });

  it("sanity: SRA3 CMYK sides 1/2 and BANNER CMYK sides 1/2 have unitPrice > 0", async () => {
    const checks: Array<[PrintingTech, string, string, number]> = [
      [PrintingTech.DIGITAL, "SRA3", "CMYK", 1],
      [PrintingTech.DIGITAL, "SRA3", "CMYK", 2],
      [PrintingTech.GRANDE_FORMATO, "BANNER", "CMYK", 1],
      [PrintingTech.GRANDE_FORMATO, "BANNER", "CMYK", 2],
    ];
    for (const [tech, label, colors, sides] of checks) {
      const row = await prisma.printing.findFirst({
        where: {
          isCurrent: true,
          technology: tech,
          formatLabel: { equals: label, mode: "insensitive" },
          colors: { equals: colors, mode: "insensitive" },
          sides,
        },
      });
      if (row) {
        expect(Number((row as any).unitPrice)).toBeGreaterThan(0);
      }
    }
  });
});


