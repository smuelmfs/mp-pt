import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getId(ctx: { params: any }) {
  const p = ctx?.params && typeof ctx.params.then === "function" ? await ctx.params : ctx.params;
  const nid = Number(p?.id);
  return Number.isFinite(nid) ? nid : NaN;
}

export async function PATCH(req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  const json = await req.json().catch(()=>({}));
  const data: any = {};
  if (typeof json.name === "string") data.name = json.name.trim();
  if (typeof json.active === "boolean") data.active = json.active;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
  const row = await prisma.supplier.update({ where: { id }, data });
  return NextResponse.json(row);
}

export async function DELETE(_req: Request, ctx: { params: any }) {
  const id = await getId(ctx);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  // soft delete: active=false
  const row = await prisma.supplier.update({ where: { id }, data: { active: false } });
  return NextResponse.json({ ok: true, id: row.id });
}


