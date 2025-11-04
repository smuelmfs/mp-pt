import { prisma } from "../lib/prisma";
import { calcQuote } from "../lib/calc-quote";

describe("quote smoke tests", () => {
  jest.setTimeout(120000);

  let productId: number | null = null;

  beforeAll(async () => {
    await prisma.$connect();
    const p = await prisma.product.findFirst({
      where: {
        AND: [
          { name: { contains: "Cartões", mode: "insensitive" } },
          { name: { contains: "9x5", mode: "insensitive" } },
        ],
      },
    });
    productId = p?.id ?? null;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  function ensureProduct() {
    if (!productId) throw new Error("Produto 'Cartões de Visita 9x5' não encontrado. Rode os seeds antes do teste.");
    return productId;
  }

  it("Cartões 9x5 — 100 un sem laminação", async () => {
    const id = ensureProduct();
    const q = await calcQuote(id, 100, {}, { disableProductFinishes: true });
    expect(q.final).toBeGreaterThan(0);
  });

  it("Cartões 9x5 — 1000 un sem laminação", async () => {
    const id = ensureProduct();
    const q = await calcQuote(id, 1000, {}, { disableProductFinishes: true });
    expect(q.final).toBeGreaterThan(0);
  });

  it("Cartões 9x5 — 1000 un com laminação 2F", async () => {
    const id = ensureProduct();
    // Tenta incluir especificamente um acabamento de laminação 2F se existir
    const lam2f = await prisma.finish.findFirst({
      where: { name: { contains: "lamina", mode: "insensitive" } },
      orderBy: { id: "asc" },
    });
    const overrides: any = {};
    if (lam2f) {
      overrides.additionalFinishes = [{ finishId: lam2f.id, qtyPerUnit: 1 }];
    }
    const q = await calcQuote(id, 1000, {}, overrides);
    expect(q.final).toBeGreaterThan(0);
  });
});


