import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const categoryId = searchParams.get("categoryId");
    const materialType = searchParams.get("materialType");
    const finishCategory = searchParams.get("finishCategory");
    const printingTechnology = searchParams.get("printingTechnology");
    const printingFormat = searchParams.get("printingFormat");
    const printingColors = searchParams.get("printingColors");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const skip = (page - 1) * limit;


    const where: any = {
      active: true
    };
    
    // Busca por nome
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" as const } },
        { category: { name: { contains: q, mode: "insensitive" as const } } },
      ];
    }
    
    // Filtro por categoria
    if (categoryId) {
      where.categoryId = parseInt(categoryId);
    }

    // Filtro por tipo de material
    if (materialType) {
      where.materials = {
        some: {
          material: {
            type: { equals: materialType, mode: "insensitive" as const }
          }
        }
      };
    }

    // Filtro por categoria de acabamento
    if (finishCategory) {
      where.finishes = {
        some: {
          finish: {
            category: { equals: finishCategory }
          }
        }
      };
    }

    // Filtros de impressão (combinados)
    if (printingTechnology || printingFormat || printingColors) {
      const printingWhere: any = {};
      if (printingTechnology) {
        printingWhere.technology = { equals: printingTechnology };
      }
      if (printingFormat) {
        printingWhere.formatLabel = { contains: printingFormat, mode: "insensitive" as const };
      }
      if (printingColors) {
        printingWhere.colors = { contains: printingColors, mode: "insensitive" as const };
      }
      where.printing = printingWhere;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          category: { select: { id: true, name: true } },
          printing: { 
            select: { 
              id: true, 
              technology: true, 
              formatLabel: true, 
              colors: true 
            } 
          },
          materials: {
            include: {
              material: { select: { id: true, name: true, type: true } }
            }
          },
          finishes: {
            include: {
              finish: { select: { id: true, name: true, category: true } }
            }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    // Sempre buscar TODOS os materiais, acabamentos e impressões ativos, independente da categoria
    const [allMaterials, allFinishes, allPrintings] = await Promise.all([
      prisma.material.findMany({
        where: { active: true },
        select: { type: true },
        distinct: ["type"],
        orderBy: { type: "asc" }
      }),
      prisma.finish.findMany({
        where: { active: true },
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" }
      }),
      prisma.printing.findMany({
        where: { active: true },
        select: { 
          technology: true, 
          formatLabel: true, 
          colors: true 
        },
        orderBy: [
          { technology: "asc" },
          { formatLabel: "asc" }
        ]
      })
    ]);
    
    const materialTypes = allMaterials.map(m => m.type);
    const finishCategories = allFinishes.map(f => f.category);
    
    // Extrair tecnologias únicas de impressão
    const printingTechnologies = Array.from(
      new Set(allPrintings.map(p => p.technology))
    ).sort();
    
    // Extrair formatos únicos de impressão (não nulos)
    const printingFormats = Array.from(
      new Set(
        allPrintings
          .filter(p => p.formatLabel)
          .map(p => p.formatLabel!)
      )
    ).sort();
    
    // Extrair cores únicas de impressão (não nulas)
    const printingColorsList = Array.from(
      new Set(
        allPrintings
          .filter(p => p.colors)
          .map(p => p.colors!)
      )
    ).sort();
    
    const categories = await prisma.productCategory.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    });

    const result = {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        materialTypes: materialTypes,
        finishCategories: finishCategories,
        printingTechnologies: printingTechnologies,
        printingFormats: printingFormats,
        printingColors: printingColorsList,
        categories: categories.map(c => ({ id: c.id, name: c.name }))
      }
    };


    return NextResponse.json(result);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

