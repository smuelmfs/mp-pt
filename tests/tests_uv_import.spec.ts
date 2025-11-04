import { prisma } from "../lib/prisma";
import { runImportPrintingUV } from "../scripts/import-printing-uv";
import { runImportMaterialsUV } from "../scripts/import-materials-uv";
import { calcQuote } from "../lib/calc-quote";

describe("UV imports and smoke test", () => {
  jest.setTimeout(120000);

  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => { await prisma.$disconnect(); });

  it("idempotent imports", async () => {
    const firstPrint = await runImportPrintingUV();
    const firstMat = await runImportMaterialsUV();
    expect(firstPrint.created + firstPrint.updated).toBeGreaterThanOrEqual(0);
    expect(firstMat.materialsCreated + firstMat.materialsUpdated + firstMat.variantsCreated + firstMat.variantsUpdated).toBeGreaterThanOrEqual(0);

    const secondPrint = await runImportPrintingUV();
    const secondMat = await runImportMaterialsUV();
    expect(secondPrint).toEqual({ created: 0, updated: 0 });
    expect(secondMat).toEqual({ materialsCreated: 0, materialsUpdated: 0, variantsCreated: 0, variantsUpdated: 0 });
  });

  it("sanity: UV printing and materials present", async () => {
    const uv = await prisma.printing.findFirst({ where: { technology: "UV", formatLabel: { equals: "PLANO_M2", mode: "insensitive" }, isCurrent: true } });
    expect(uv).toBeTruthy();
    expect(Number((uv as any).unitPrice)).toBeGreaterThan(0);

    const material = await prisma.material.findFirst({ where: { name: { contains: "PVC", mode: "insensitive" }, type: "placa", unit: "SHEET" } });
    if (material) {
      expect(Number((material as any).unitCost)).toBeGreaterThan(0);
      const variant = await prisma.materialVariant.findFirst({ where: { materialId: material.id } });
      if (variant && variant.widthMm && variant.heightMm) {
        expect(variant.widthMm).toBeGreaterThan(0);
        expect(variant.heightMm).toBeGreaterThan(0);
      }
    }
  });

  it("smoke: quote with UV printing", async () => {
    // Ensure category and product
    const category = await prisma.productCategory.upsert({
      where: { name: "Grande Formato" },
      create: { name: "Grande Formato", roundingStep: "0.0500" },
      update: {},
    });
    const uv = await prisma.printing.findFirst({ where: { technology: "UV", formatLabel: { equals: "PLANO_M2", mode: "insensitive" }, isCurrent: true } });
    expect(uv).toBeTruthy();

    const material = await prisma.material.findFirst({ where: { name: { contains: "PVC", mode: "insensitive" }, type: "placa", unit: "SHEET" }, include: { variants: true } as any });

    const product = await prisma.product.create({
      data: {
        name: `UV Teste – 200x300mm ${Date.now()}`,
        categoryId: category.id,
        printingId: uv!.id,
        widthMm: 200,
        heightMm: 300,
        pricingStrategy: "COST_MARKUP_MARGIN" as any,
        roundingStrategy: "PER_STEP" as any,
        roundingStep: "0.0500",
        markupDefault: "0.2000",
        marginDefault: "0.3000",
        materials: material ? {
          create: [{
            materialId: material.id,
            qtyPerUnit: "1.0000",
            variantId: (material as any).variants?.[0]?.id ?? undefined,
            wasteFactor: "0.0000",
          }],
        } : undefined,
      },
    });

    const q = await calcQuote(product.id, 10, {}, {});
    expect(Number(q.subtotalProduction)).toBeGreaterThan(0);
    expect(q.items.some((i: any) => i.type === "PRINTING")).toBe(true);
    expect(q.items.some((i: any) => i.type === "MATERIAL")).toBe(true);
    expect(Number(q.final)).toBeGreaterThan(Number(q.subtotalProduction));
  });
});


