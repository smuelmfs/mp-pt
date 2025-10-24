import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const config = await prisma.configGlobal.findFirst({ where: { id: 1 } });
    if (!config) {
      return NextResponse.json({ error: "Configuração não encontrada" }, { status: 404 });
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error("Erro ao buscar configuração:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    
    // Filtrar apenas campos que existem no schema atual
    const updateData: any = {};
    if (body.marginDefault !== undefined) updateData.marginDefault = body.marginDefault;
    if (body.markupOperational !== undefined) updateData.markupOperational = body.markupOperational;
    if (body.roundingStep !== undefined) updateData.roundingStep = body.roundingStep;
    if (body.lossFactor !== undefined) updateData.lossFactor = body.lossFactor;
        if (body.setupTimeMin !== undefined) updateData.setupTimeMin = body.setupTimeMin;
        if (body.printingHourCost !== undefined) updateData.printingHourCost = body.printingHourCost;
        if (body.vatPercent !== undefined) updateData.vatPercent = body.vatPercent;
    
    const config = await prisma.configGlobal.update({
      where: { id: 1 },
      data: updateData
    });
    
    return NextResponse.json(config);
  } catch (error) {
    console.error("Erro ao atualizar configuração:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
