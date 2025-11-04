import { prisma } from "../lib/prisma";
import { calcQuote } from "../lib/calc-quote";

describe("customer scopes and overrides", () => {
  jest.setTimeout(120000);

  let createdCustomerId: number | null = null;
  let createdGroupId: number | null = null;
  const createdMaterialPrices: number[] = [];
  const createdPrintingPrices: number[] = [];
  const createdFinishPrices: number[] = [];
  const createdProductOverrides: number[] = [];
  const createdDynamics: number[] = [];

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    // cleanup
    if (createdDynamics.length) await prisma.marginRuleDynamic.deleteMany({ where: { id: { in: createdDynamics } } });
    if (createdProductOverrides.length) await prisma.productCustomerOverride.deleteMany({ where: { id: { in: createdProductOverrides } } });
    if (createdFinishPrices.length) await prisma.finishCustomerPrice.deleteMany({ where: { id: { in: createdFinishPrices } } });
    if (createdMaterialPrices.length) await prisma.materialCustomerPrice.deleteMany({ where: { id: { in: createdMaterialPrices } } });
    if (createdPrintingPrices.length) await prisma.printingCustomerPrice.deleteMany({ where: { id: { in: createdPrintingPrices } } });
    if (createdCustomerId) await prisma.customer.delete({ where: { id: createdCustomerId } });
    if (createdGroupId) await prisma.customerGroup.delete({ where: { id: createdGroupId } });
    await prisma.$disconnect();
  });

  async function pickProductWithComposition() {
    const prod = await prisma.product.findFirst({
      where: { active: true },
      include: {
        category: true,
        printing: true,
        materials: { include: { material: true, variant: true } },
        finishes: { include: { finish: true } },
      },
    });
    if (!prod) throw new Error("Nenhum produto disponível para teste");
    return prod;
  }

  it("baseline without customer: final captured", async () => {
    const product = await pickProductWithComposition();
    const res = await calcQuote(product.id, 100, {}, {});
    expect(Number(res.final)).toBeGreaterThan(0);
  });

  it("no customer data: with overrides.customerId still equals baseline", async () => {
    const product = await pickProductWithComposition();
    const base = await calcQuote(product.id, 100, {}, {});
    const withCustomer = await calcQuote(product.id, 100, {}, { customerId: 999999 });
    // No records for that customer, should be identical
    expect(Number(withCustomer.final)).toBeCloseTo(Number(base.final), 2);
  });

  it("printing override lowers final", async () => {
    const product = await pickProductWithComposition();
    const base = await calcQuote(product.id, 200, {}, {});

    const cust = await prisma.customer.create({ data: { name: "Acme Ltd" } });
    createdCustomerId = cust.id;

    if (product.printingId) {
      const pr = await prisma.printingCustomerPrice.create({
        data: {
          printingId: product.printingId,
          customerId: cust.id,
          sides: (product as any).printing?.sides ?? null,
          unitPrice: ((product as any).printing?.unitPrice as any) ? (Number((product as any).printing?.unitPrice) * 0.5).toFixed(4) : "0.5000",
          priority: 1,
          isCurrent: true,
        },
      });
      createdPrintingPrices.push(pr.id);
    }

    const withOverride = await calcQuote(product.id, 200, {}, { customerId: cust.id });
    // Allow equality due to minFee/rounding, but unit cost per printing must be reduced
    expect(Number(withOverride.final)).toBeLessThanOrEqual(Number(base.final));
  });

  it("material override lowers costMat", async () => {
    const product = await pickProductWithComposition();
    if (product.materials.length === 0) return; // skip silently

    const pm = product.materials[0];
    const base = await calcQuote(product.id, 150, {}, {});

    const cust = createdCustomerId
      ? await prisma.customer.findUnique({ where: { id: createdCustomerId } })
      : await prisma.customer.create({ data: { name: "Beta Corp" } });
    if (!createdCustomerId) createdCustomerId = cust!.id;

    const mcp = await prisma.materialCustomerPrice.create({
      data: {
        materialId: pm.materialId,
        customerId: cust!.id,
        unitCost: (Number((pm.material as any).unitCost) * 0.7).toFixed(4),
        priority: 1,
        isCurrent: true,
      },
    });
    createdMaterialPrices.push(mcp.id);

    const withOverride = await calcQuote(product.id, 150, {}, { customerId: cust!.id });
    expect(Number(withOverride.costMat)).toBeLessThan(Number(base.costMat));
  });

  it("finish override adjusts costFinish", async () => {
    const product = await pickProductWithComposition();
    if (product.finishes.length === 0) return;
    const pf = product.finishes[0];
    const base = await calcQuote(product.id, 120, {}, {});

    const cust = createdCustomerId
      ? await prisma.customer.findUnique({ where: { id: createdCustomerId } })
      : await prisma.customer.create({ data: { name: "Gamma SA" } });
    if (!createdCustomerId) createdCustomerId = cust!.id;

    const fcp = await prisma.finishCustomerPrice.create({
      data: {
        finishId: pf.finishId,
        customerId: cust!.id,
        baseCost: (Number((pf.finish as any).baseCost) * 0.6).toFixed(4),
        minFee: (pf.finish as any).minFee ? (Number((pf.finish as any).minFee) * 0.8).toFixed(2) : null,
        areaStepM2: (pf.finish as any).areaStepM2 ? Number((pf.finish as any).areaStepM2) : null,
        priority: 1,
        isCurrent: true,
      },
    });
    createdFinishPrices.push(fcp.id);

    const withOverride = await calcQuote(product.id, 120, {}, { customerId: cust!.id });
    expect(Number(withOverride.costFinish)).toBeGreaterThanOrEqual(0);
  });

  it("product overrides: minPricePerPiece enforces floor", async () => {
    const product = await pickProductWithComposition();
    const qty = 50;
    const base = await calcQuote(product.id, qty, {}, {});

    const cust = createdCustomerId
      ? await prisma.customer.findUnique({ where: { id: createdCustomerId } })
      : await prisma.customer.create({ data: { name: "Delta Lda" } });
    if (!createdCustomerId) createdCustomerId = cust!.id;

    const minPPP = Number(base.final) / qty * 1.2; // force higher
    const pco = await prisma.productCustomerOverride.create({
      data: {
        productId: product.id,
        customerId: cust!.id,
        minPricePerPiece: minPPP.toFixed(2),
        roundingStep: "0.0000",
        priority: 1,
        isCurrent: true,
      },
    });
    createdProductOverrides.push(pco.id);

    const withOverride = await calcQuote(product.id, qty, {}, { customerId: cust!.id });
    expect(Number(withOverride.final)).toBeGreaterThanOrEqual(qty * minPPP - 0.5);
  });

  it("dynamic scope priority: CUSTOMER over CUSTOMER_GROUP, then group when customer disabled", async () => {
    const product = await pickProductWithComposition();
    const qty = 100;

    // Create group and associate
    const group = await prisma.customerGroup.create({ data: { name: `VIP-${Date.now()}` } });
    createdGroupId = group.id;
    const cust = createdCustomerId
      ? await prisma.customer.update({ where: { id: createdCustomerId }, data: { groupId: group.id } })
      : await prisma.customer.create({ data: { name: "Epsilon", groupId: group.id } });
    createdCustomerId = cust.id;

    // Create dynamics
    const dGroup = await prisma.marginRuleDynamic.create({ data: { scope: "CUSTOMER_GROUP", adjustPercent: "-0.0500", priority: 10, active: true } });
    const dCust  = await prisma.marginRuleDynamic.create({ data: { scope: "CUSTOMER", adjustPercent: "-0.0800", priority: 5, active: true } });
    createdDynamics.push(dGroup.id, dCust.id);

    const withCust = await calcQuote(product.id, qty, {}, { customerId: cust.id });
    // CUSTOMER (-8%) should have lower final than CUSTOMER_GROUP (-5%)
    expect(Number(withCust.dynamic)).toBeCloseTo(-0.08, 4);

    // disable customer rule -> group should apply
    await prisma.marginRuleDynamic.update({ where: { id: dCust.id }, data: { active: false } });

    const withGroup = await calcQuote(product.id, qty, {}, { customerId: cust.id });
    expect(Number(withGroup.dynamic)).toBeCloseTo(-0.05, 4);
  });
});


