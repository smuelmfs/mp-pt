import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getId(ctx: { params: any }) {
  const p = typeof ctx.params?.then === "function" ? await ctx.params : ctx.params;
  const nid = Number(p?.id);
  return Number.isFinite(nid) ? nid : NaN;
}

const CreateGroupSchema = z.object({
  name: z.string().min(2),
  kind: z.enum(["RADIO", "SELECT", "SIZE", "SWITCH"]),
  required: z.boolean().default(false),
  multiSelect: z.boolean().default(false),
  order: z.number().int().default(0),
  defaultChoiceId: z.number().int().nullable().optional(),
});

const UpdateGroupSchema = CreateGroupSchema.partial();

export async function GET(_req: Request, ctx: { params: any }) {
  const productId = await getId(ctx);
  if (!Number.isFinite(productId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const groups = await prisma.productOptionGroup.findMany({
    where: { productId },
    include: {
      choices: {
        orderBy: { order: "asc" }
      }
    },
    orderBy: { order: "asc" }
  });

  return NextResponse.json(groups);
}

export async function POST(req: Request, ctx: { params: any }) {
  const productId = await getId(ctx);
  if (!Number.isFinite(productId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const parsed = CreateGroupSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const group = await prisma.productOptionGroup.create({
    data: {
      ...parsed.data,
      productId
    }
  });

  return NextResponse.json(group, { status: 201 });
}

export async function PATCH(req: Request, ctx: { params: any }) {
  const productId = await getId(ctx);
  if (!Number.isFinite(productId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const { groupId, ...data } = json;
  
  if (!groupId) return NextResponse.json({ error: "groupId é obrigatório" }, { status: 400 });

  const parsed = UpdateGroupSchema.safeParse(data);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const group = await prisma.productOptionGroup.update({
    where: { 
      id: groupId,
      productId // garantir que pertence ao produto
    },
    data: parsed.data
  });

  return NextResponse.json(group);
}

export async function DELETE(req: Request, ctx: { params: any }) {
  const productId = await getId(ctx);
  if (!Number.isFinite(productId)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const json = await req.json().catch(() => ({}));
  const { groupId } = json;
  
  if (!groupId) return NextResponse.json({ error: "groupId é obrigatório" }, { status: 400 });

  // Verificar se tem choices
  const choiceCount = await prisma.productOptionChoice.count({
    where: { groupId }
  });

  if (choiceCount > 0) {
    return NextResponse.json({ error: "Não é possível excluir grupo com opções" }, { status: 400 });
  }

  await prisma.productOptionGroup.delete({
    where: { 
      id: groupId,
      productId // garantir que pertence ao produto
    }
  });

  return NextResponse.json({ ok: true });
}
