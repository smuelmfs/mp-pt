import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const customers = await prisma.customer.findMany({
    orderBy: [{ name: "asc" }],
    include: { group: true },
  });
  return NextResponse.json(customers);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name, email, taxId, groupId, isActive } = body || {};
  if (!name) return NextResponse.json({ error: "name é obrigatório" }, { status: 400 });
  const created = await prisma.customer.create({
    data: { name, email: email || null, taxId: taxId || null, groupId: groupId || null, isActive: isActive ?? true },
  });
  return NextResponse.json(created, { status: 201 });
}

