import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import jsPDF from "jspdf";
// @ts-ignore
import autoTable from "jspdf-autotable";

async function getId(ctx: { params: Promise<{ id: string }> }): Promise<number> {
  const { id } = await ctx.params;
  const num = Number(id);
  if (!Number.isFinite(num) || num <= 0) throw new Error("ID inválido");
  return num;
}

function formatMoney(value: number | string | null | undefined): string {
  const v = typeof value === "number" ? value : Number(value || 0);
  return `€ ${v.toFixed(2)}`;
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

    // Criar PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Logo e Cabeçalho
    doc.setTextColor(246, 104, 7); // #F66807
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("MyPrint.pt", margin, yPos);
    
    doc.setTextColor(52, 22, 1); // #341601
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("ORÇAMENTO", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Número: ${quote.number}`, margin, yPos);
    yPos += 6;
    doc.text(`Data: ${formatDate(quote.createdAt.toString())}`, margin, yPos);
    yPos += 10;

    // Informações do Cliente
    if (quote.customer) {
      doc.setFont("helvetica", "bold");
      doc.text("Cliente:", margin, yPos);
      doc.setFont("helvetica", "normal");
      yPos += 6;
      doc.text(quote.customer.name, margin + 10, yPos);
      yPos += 6;
      if (quote.customer.email) {
        doc.text(`Email: ${quote.customer.email}`, margin + 10, yPos);
        yPos += 6;
      }
      if (quote.customer.taxId) {
        doc.text(`NIF: ${quote.customer.taxId}`, margin + 10, yPos);
        yPos += 6;
      }
      yPos += 5;
    }

    // Tabela de Itens (agrupada)
    type GroupedItem = {
      name: string;
      total: number;
      details: {
        label: string;
        quantity?: string;
        unit?: string;
        unitCost?: string;
        totalCost: string;
      }[];
    };

    const grouped = new Map<string, GroupedItem>();

    quote.items.forEach((item) => {
      const rawName = item.name || "Item";
      const [groupNamePart, detailPart] = rawName.split(" - ");
      const groupName = (detailPart ? groupNamePart : rawName).trim();
      const detailLabel = (detailPart || rawName).trim();

      let entry = grouped.get(groupName);
      if (!entry) {
        entry = { name: groupName, total: 0, details: [] };
        grouped.set(groupName, entry);
      }

      entry.total += Number(item.totalCost) || 0;
      entry.details.push({
        label: detailLabel,
        quantity: item.quantity ? Number(item.quantity).toFixed(2) : undefined,
        unit: item.unit || undefined,
        unitCost: item.unitCost ? formatMoney(Number(item.unitCost)) : undefined,
        totalCost: formatMoney(Number(item.totalCost)),
      });
    });

    const groupedItems = Array.from(grouped.values());
    const tableBody = groupedItems.flatMap((group, idx) => {
      const descriptionText = group.details
        .map((detail) => {
          const fragments = [detail.label];
          const metrics: string[] = [];
          if (detail.quantity) metrics.push(`Qtd: ${detail.quantity}`);
          if (detail.unit) metrics.push(`Unidade: ${detail.unit}`);
          if (detail.unitCost) metrics.push(`Custo: ${detail.unitCost}`);
          metrics.push(`Total: ${detail.totalCost}`);
          return `${fragments.join(" ")} (${metrics.join(" | ")})`;
        })
        .join("\n");

      return [
        [
          (idx + 1).toString(),
          group.name,
          "",
          "",
          "",
          formatMoney(group.total),
        ],
        [
          "",
          {
            content: descriptionText,
            colSpan: 5,
            styles: { fontStyle: "italic", textColor: [90, 90, 90] },
          },
        ],
      ];
    });

    (autoTable as any)(doc, {
      startY: yPos,
      head: [["#", "Item", "Quantidade", "Unidade", "Custo Unit.", "Total"]],
      body: tableBody,
      theme: "striped",
      headStyles: { fillColor: [246, 104, 7], textColor: [255, 255, 255], fontStyle: "bold" },
      bodyStyles: { fontSize: 9 },
      margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 10 : yPos + 50;

    const totalItens = groupedItems.reduce((sum, group) => sum + group.total, 0);
    doc.setFont("helvetica", "bold");
    doc.text(`Total dos Itens: ${formatMoney(totalItens)}`, margin, yPos);
    yPos += 10;

    // Resumo de Custos
    doc.setFont("helvetica", "bold");
    doc.text("Resumo de Custos:", margin, yPos);
    yPos += 6;
    doc.setFont("helvetica", "normal");
    
    const breakdown = quote.breakdown as any;
    if (breakdown?.costMat) {
      doc.text(`Custo de Materiais: ${formatMoney(breakdown.costMat)}`, margin + 10, yPos);
      yPos += 6;
    }
    if (breakdown?.costPrint) {
      doc.text(`Custo de Impressão: ${formatMoney(breakdown.costPrint)}`, margin + 10, yPos);
      yPos += 6;
    }
    if (breakdown?.costFinish) {
      doc.text(`Custo de Acabamentos: ${formatMoney(breakdown.costFinish)}`, margin + 10, yPos);
      yPos += 6;
    }
    yPos += 5;

    // Valores Finais
    doc.setTextColor(246, 104, 7); // #F66807
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Subtotal: ${formatMoney(Number(quote.subtotal))}`, margin, yPos);
    yPos += 8;
    
    if (quote.vatAmount) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(52, 22, 1); // #341601
      doc.text(`IVA (23%): ${formatMoney(Number(quote.vatAmount))}`, margin, yPos);
      yPos += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(246, 104, 7); // #F66807
      doc.text(`TOTAL COM IVA: ${formatMoney(Number(quote.priceGross))}`, margin, yPos);
    } else {
      doc.setFontSize(16);
      doc.text(`TOTAL: ${formatMoney(Number(quote.finalPrice))}`, margin, yPos);
    }

    // Rodapé
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-PT')}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );

    // Converter para buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="orcamento-${quote.number}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("Erro ao gerar PDF:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao gerar PDF" },
      { status: 500 }
    );
  }
}

