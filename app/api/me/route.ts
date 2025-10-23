import { NextResponse } from "next/server";

export async function GET(req: Request) {
  // NextRequest não está disponível aqui, então usamos headers
  const cookie = (req.headers.get("cookie") || "").split(";").map(s => s.trim());
  const role = cookie.find(c => c.startsWith("role="))?.split("=")[1] || null;
  return NextResponse.json({ role });
}
