import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { role } = await req.json().catch(() => ({}));
  if (role !== "ADMIN" && role !== "COMMERCIAL") {
    return NextResponse.json({ error: "role inválido" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, role });
  res.cookies.set("role", role, { httpOnly: false, sameSite: "lax", path: "/" });
  return res;
}
