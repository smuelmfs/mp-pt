import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getId(ctx: { params: any }) {
  const p = typeof ctx.params?.then === "function" ? await ctx.params : ctx.params;
  const nid = Number(p?.id);
  return Number.isFinite(nid) ? nid : NaN;
}

const CreateChoiceSchema = z.object({
  groupId: z.number().int(),
  name: z.string().min(2),
  description: z.string().optional(),
  order: z.number().int().default(0),
  active: z.boolean().default(true),
  // Apontamentos para catálogos
  materialVariantId: z.number().int().nullable().optional(),
  printingId: z.number().int().nullable().optional(),
  finishId: z.number().int().nullable().optional(),
  finishQtyPerUnit: z.number().nullable().optional(),
  // Atributos de tamanho
  widthOverride: z.number().int().nullable().optional(),
  heightOverride: z.number().int().nullable().optional(),
  overrideAttrs: z.record(z.string(), z.any()).nullable().optional(),
  // Ajustes de preço (usar nomes do schema Prisma: priceFixed e priceAdjustment)
  priceFixed: z.number().nullable().optional(),
  priceAdjustment: z.number().nullable().optional(),
});

const UpdateChoiceSchema = CreateChoiceSchema.partial().omit({ groupId: true });

export async function GET(_req: Request, ctx: { params: any }) {
  const productId = await getId(ctx);
  if (!Number.isFinite(productId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const choices = await prisma.productOptionChoice.findMany({
    where: {
      group: { productId }
    },
    include: {
      group: true,
      materialVariant: {
        include: { material: true }
      },
      finish: true
    },
    orderBy: { order: "asc" }
  });

  return NextResponse.json(choices);
}

export async function POST(req: Request, ctx: { params: any }) {
  const productId = await getId(ctx);
  if (!Number.isFinite(productId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const parsed = CreateChoiceSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Verificar se o grupo pertence ao produto
  const group = await prisma.productOptionGroup.findFirst({
    where: { 
      id: parsed.data.groupId,
      productId 
    }
  });

  if (!group) {
    return NextResponse.json({ error: "Grupo não encontrado ou não pertence ao produto" }, { status: 400 });
  }

  const { overrideAttrs, ...rest } = parsed.data;
  
  const choice = await prisma.productOptionChoice.create({
    data: {
      ...rest,
      overrideAttrs: overrideAttrs === null ? undefined : overrideAttrs
      // Prisma aceita números diretamente para campos Decimal
    }
  });

  return NextResponse.json(choice, { status: 201 });
}

export async function PATCH(req: Request, ctx: { params: any }) {
  const productId = await getId(ctx);
  if (!Number.isFinite(productId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const { choiceId, ...data } = json;
  
  if (!choiceId) return NextResponse.json({ error: "choiceId é obrigatório" }, { status: 400 });

  const parsed = UpdateChoiceSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Verificar se a choice pertence ao produto
  const choice = await prisma.productOptionChoice.findFirst({
    where: { 
      id: choiceId,
      group: { productId }
    }
  });

  if (!choice) {
    return NextResponse.json({ error: "Opção não encontrada ou não pertence ao produto" }, { status: 400 });
  }

  // Remover campos null para evitar erros de tipo
  // Prisma aceita números diretamente para campos Decimal
  const { overrideAttrs, ...rest } = parsed.data;
  
  const cleanData: any = Object.fromEntries(
    Object.entries(rest).filter(([_, v]) => v !== null && v !== undefined)
  );
  
  // Adicionar overrideAttrs se presente (pode ser null explicitamente)
  if (overrideAttrs !== undefined) {
    cleanData.overrideAttrs = overrideAttrs === null ? undefined : overrideAttrs;
  }
  
  const updatedChoice = await prisma.productOptionChoice.update({
    where: { id: choiceId },
    data: cleanData
  });

  return NextResponse.json(updatedChoice);
}

export async function DELETE(req: Request, ctx: { params: any }) {
  const productId = await getId(ctx);
  if (!Number.isFinite(productId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const { choiceId } = json;
  
  if (!choiceId) return NextResponse.json({ error: "choiceId é obrigatório" }, { status: 400 });

  // Verificar se a choice pertence ao produto
  const choice = await prisma.productOptionChoice.findFirst({
    where: { 
      id: choiceId,
      group: { productId }
    }
  });

  if (!choice) {
    return NextResponse.json({ error: "Opção não encontrada ou não pertence ao produto" }, { status: 400 });
  }

  await prisma.productOptionChoice.delete({
    where: { id: choiceId }
  });

  return NextResponse.json({ ok: true });
}
