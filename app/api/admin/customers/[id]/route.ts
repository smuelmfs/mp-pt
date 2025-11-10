import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const customer = await prisma.customer.findUnique({ where: { id }, include: { group: true } });
  if (!customer) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  return NextResponse.json(customer);
}

function normalizeCustomerName(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, " ");
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const { name, email, taxId, groupId, isActive } = body || {};
  const updated = await prisma.customer.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: normalizeCustomerName(name) } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(taxId !== undefined ? { taxId } : {}),
      ...(groupId !== undefined ? { groupId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await ctx.params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const customer = await prisma.customer.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ ok: true, id: customer.id });
}

