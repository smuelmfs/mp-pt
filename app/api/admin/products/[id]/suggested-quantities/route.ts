import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getId(ctx: { params: any }) {
  const p = typeof ctx.params?.then === "function" ? await ctx.params : ctx.params;
  const nid = Number(p?.id);
  return Number.isFinite(nid) ? nid : NaN;
}

const CreateQuantitySchema = z.object({
  quantity: z.number().int().positive(),
  label: z.string().optional(),
  order: z.number().int().default(0),
  active: z.boolean().default(true),
});

const UpdateQuantitySchema = CreateQuantitySchema.partial();

export async function GET(_req: Request, ctx: { params: any }) {
  const productId = await getId(ctx);
  if (!Number.isFinite(productId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const quantities = await prisma.productSuggestedQuantity.findMany({
    where: { productId },
    orderBy: { order: "asc" }
  });

  return NextResponse.json(quantities);
}

export async function POST(req: Request, ctx: { params: any }) {
  const productId = await getId(ctx);
  if (!Number.isFinite(productId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const parsed = CreateQuantitySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const quantity = await prisma.productSuggestedQuantity.create({
    data: {
      ...parsed.data,
      productId
    }
  });

  return NextResponse.json(quantity, { status: 201 });
}

export async function PATCH(req: Request, ctx: { params: any }) {
  const productId = await getId(ctx);
  if (!Number.isFinite(productId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const { quantityId, ...data } = json;
  
  if (!quantityId) return NextResponse.json({ error: "quantityId é obrigatório" }, { status: 400 });

  const parsed = UpdateQuantitySchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const quantity = await prisma.productSuggestedQuantity.update({
    where: { 
      id: quantityId,
      productId // garantir que pertence ao produto
    },
    data: parsed.data
  });

  return NextResponse.json(quantity);
}

export async function DELETE(req: Request, ctx: { params: any }) {
  const productId = await getId(ctx);
  if (!Number.isFinite(productId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const { quantityId } = json;
  
  if (!quantityId) return NextResponse.json({ error: "quantityId é obrigatório" }, { status: 400 });

  await prisma.productSuggestedQuantity.delete({
    where: { 
      id: quantityId,
      productId // garantir que pertence ao produto
    }
  });

  return NextResponse.json({ ok: true });
}
