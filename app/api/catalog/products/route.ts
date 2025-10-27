import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const categoryId = searchParams.get("categoryId");
    const materialType = searchParams.get("materialType");
    const finishCategory = searchParams.get("finishCategory");
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

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          category: { select: { id: true, name: true } },
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

    // Buscar opções de filtro únicas
    const [materialTypes, finishCategories, categories] = await Promise.all([
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
      prisma.productCategory.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      })
    ]);

    const result = {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        materialTypes: materialTypes.map(m => m.type),
        finishCategories: finishCategories.map(f => f.category),
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

