import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcQuote } from "@/lib/calc-quote";
import { verifyIdToken } from "@/lib/auth";

async function ensureCommercialAccess(req: NextRequest) {
  const devRole = req.cookies.get("role")?.value;
  if (devRole === "COMMERCIAL") {
    return { role: "COMMERCIAL" as const };
  }

  const authHeader = req.headers.get("authorization");
  const headerToken = authHeader?.replace("Bearer ", "");
  const cookieToken = req.cookies.get("firebase-token")?.value;
  const idToken = headerToken || cookieToken;

  if (!idToken) {
    return {
      error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }

  try {
    const decoded = await verifyIdToken(idToken);
    if (decoded.role !== "COMMERCIAL") {
      return {
        error: NextResponse.json({ error: "Acesso restrito ao time comercial" }, { status: 403 }),
      };
    }
    return { role: "COMMERCIAL" as const, decoded };
  } catch {
    return {
      error: NextResponse.json({ error: "Sessão inválida" }, { status: 401 }),
    };
  }
}

export async function GET(req: NextRequest) {
  const guard = await ensureCommercialAccess(req);
  if ("error" in guard) {
    return guard.error;
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get("pageSize") || 10)));
  const q = (searchParams.get("q") || "").trim();
  const customerId = searchParams.get("customerId");
  const productId = searchParams.get("productId");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: any = {};

  if (q) {
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { product: { name: { contains: q, mode: "insensitive" } } },
      { user: { name: { contains: q, mode: "insensitive" } } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  if (customerId && Number.isFinite(Number(customerId))) {
    where.customerId = Number(customerId);
  }

  if (productId && Number.isFinite(Number(productId))) {
    where.productId = Number(productId);
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  const [total, data] = await Promise.all([
    prisma.quote.count({ where }),
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, number: true, createdAt: true, finalPrice: true, subtotal: true, quantity: true,
        product: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return NextResponse.json({ page, pageSize, total, pages: Math.ceil(total / pageSize), data });
}

export async function POST(req: NextRequest) {
  const guard = await ensureCommercialAccess(req);
  if ("error" in guard) {
    return guard.error;
  }

  const body = await req.json().catch(() => ({}));
  const productId = Number(body.productId);
  const quantity  = Number(body.quantity ?? 1000);
  const params    = body.params ?? {};

  if (!Number.isFinite(productId) || productId <= 0) {
    return NextResponse.json({ error: "productId é obrigatório (number)" }, { status: 400 });
  }

  const c = await calcQuote(productId, quantity, params);

  let user;
  if (guard.decoded?.email) {
    const userEmail = guard.decoded.email;
    const userName = guard.decoded.name || guard.decoded.email?.split("@")[0] || "Usuário";

    user = await prisma.user.upsert({
      where: { email: userEmail },
      update: { name: userName },
      create: { name: userName, email: userEmail },
    });
  } else {
    user = await prisma.user.upsert({
      where: { email: "demo@local" },
      update: {},
      create: { name: "Comercial Demo", email: "demo@local" },
    });
  }

  const quote = await prisma.quote.create({
    data: {
      number: `Q-${Date.now()}`, userId: user.id,
      productId: c.product.id, quantity: c.quantity, params: c.params,
      subtotal: c.subtotal.toFixed(2),
      markupApplied: c.markup.toString(),
      marginApplied: c.margin.toString(),
      dynamicAdjust: c.dynamic.toString(),
      finalPrice: c.final.toFixed(2),
      vatAmount: c.vatAmount ? c.vatAmount.toFixed(2) : null,
      priceGross: c.priceGross ? c.priceGross.toFixed(2) : null,
      breakdown: { 
        costMat: c.costMat, costPrint: c.costPrint, costFinish: c.costFinish,
        minOrderApplied: c.minOrderApplied, minOrderReason: c.minOrderReason
      },
      items: {
        create: c.items.map(it => ({
          itemType: it.type, refId: it.refId, name: it.name,
          quantity: (it.quantity as any)?.toFixed ? (it.quantity as any).toFixed(4) : null,
          unit: it.unit as "UNIT" | "M2" | "LOT" | "HOUR" | "SHEET" | null,
          unitCost: (it.unitCost as any)?.toFixed ? (it.unitCost as any).toFixed(4) : null,
          totalCost: it.totalCost.toFixed(4),
        })),
      },
    },
  });

  return NextResponse.json({
    ok: true, id: quote.id, quoteNumber: quote.number,
    finalPrice: Number(quote.finalPrice), subtotal: Number(quote.subtotal),
    vatAmount: quote.vatAmount ? Number(quote.vatAmount) : null,
    priceGross: quote.priceGross ? Number(quote.priceGross) : null,
    minOrderApplied: c.minOrderApplied,
    minOrderReason: c.minOrderReason
  });
}
