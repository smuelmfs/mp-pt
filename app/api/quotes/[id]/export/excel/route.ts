import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

async function getId(ctx: { params: Promise<{ id: string }> }): Promise<number> {
  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isFinite(num) || num <= 0) throw new Error("ID inválido");
  return num;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = await getId(ctx);

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        product: true,
        user: true,
        customer: true,
        items: {
          orderBy: { id: "asc" }
        }
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 });
    }

    // Criar workbook
    const workbook = XLSX.utils.book_new();

    // Aba 1: Informações Gerais
    const infoData = [
      ["ORÇAMENTO", ""],
      ["", ""],
      ["Número:", quote.number],
      ["Data:", formatDate(quote.createdAt.toString())],
      ["Produto:", quote.product.name],
      ["Quantidade:", quote.quantity],
      ["", ""],
    ];

    if (quote.customer) {
      infoData.push(["CLIENTE", ""]);
      infoData.push(["Nome:", quote.customer.name]);
      if (quote.customer.email) {
        infoData.push(["Email:", quote.customer.email]);
      }
      if (quote.customer.taxId) {
        infoData.push(["NIF:", quote.customer.taxId]);
      }
      infoData.push(["", ""]);
    }

    infoData.push(["RESUMO DE CUSTOS", ""]);
    const breakdown = quote.breakdown as any;
    if (breakdown?.costMat) {
      infoData.push(["Custo de Materiais:", `€ ${Number(breakdown.costMat).toFixed(2)}`]);
    }
    if (breakdown?.costPrint) {
      infoData.push(["Custo de Impressão:", `€ ${Number(breakdown.costPrint).toFixed(2)}`]);
    }
    if (breakdown?.costFinish) {
      infoData.push(["Custo de Acabamentos:", `€ ${Number(breakdown.costFinish).toFixed(2)}`]);
    }
    infoData.push(["", ""]);
    infoData.push(["AJUSTES APLICADOS", ""]);
    infoData.push(["Markup:", `${quote.markupApplied}%`]);
    infoData.push(["Margem:", `${quote.marginApplied}%`]);
    if (quote.dynamicAdjust) {
      infoData.push(["Ajuste Dinâmico:", `${quote.dynamicAdjust}%`]);
    }
    infoData.push(["", ""]);
    infoData.push(["Subtotal:", `€ ${Number(quote.subtotal).toFixed(2)}`]);
    if (quote.vatAmount) {
      infoData.push(["IVA (23%):", `€ ${Number(quote.vatAmount).toFixed(2)}`]);
      infoData.push(["TOTAL COM IVA:", `€ ${Number(quote.priceGross).toFixed(2)}`]);
    } else {
      infoData.push(["TOTAL:", `€ ${Number(quote.finalPrice).toFixed(2)}`]);
    }

    const infoSheet = XLSX.utils.aoa_to_sheet(infoData);
    XLSX.utils.book_append_sheet(workbook, infoSheet, "Informações");

    // Aba 2: Itens Detalhados
    const itemsData = [
      ["#", "Item", "Quantidade", "Unidade", "Custo Unitário", "Total"]
    ];

    quote.items.forEach((item, idx) => {
      itemsData.push([
        (idx + 1).toString(),
        item.name || "-",
        item.quantity ? Number(item.quantity).toFixed(4) : "-",
        item.unit || "-",
        item.unitCost ? `€ ${Number(item.unitCost).toFixed(4)}` : "-",
        `€ ${Number(item.totalCost).toFixed(2)}`
      ]);
    });

    const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
    
    // Ajustar largura das colunas
    itemsSheet["!cols"] = [
      { wch: 5 },  // #
      { wch: 40 }, // Item
      { wch: 12 }, // Quantidade
      { wch: 10 }, // Unidade
      { wch: 15 }, // Custo Unitário
      { wch: 12 }  // Total
    ];

    XLSX.utils.book_append_sheet(workbook, itemsSheet, "Itens");

    // Gerar buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="orcamento-${quote.number}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar Excel:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar Excel" },
      { status: 500 }
    );
  }
}

