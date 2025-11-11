import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const categoryId = searchParams.get("categoryId");
    const customerId = searchParams.get("customerId");
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

    // Filtro por cliente - mostrar apenas produtos que têm overrides para aquele cliente
    if (customerId) {
      const customerIdNum = parseInt(customerId);
      where.customerOverrides = {
        some: {
          customerId: customerIdNum,
          isCurrent: true
        }
      };
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

    // Buscar produtos da categoria selecionada (ou todos) para determinar filtros dinâmicos
    const categoryWhere: any = { active: true };
    if (categoryId) {
      categoryWhere.categoryId = parseInt(categoryId);
    }
    if (customerId) {
      const customerIdNum = parseInt(customerId);
      categoryWhere.customerOverrides = {
        some: {
          customerId: customerIdNum,
          isCurrent: true
        }
      };
    }

    // Buscar produtos da categoria para extrair materiais e acabamentos usados
    const categoryProducts = await prisma.product.findMany({
      where: categoryWhere,
      select: {
        materials: {
          include: {
            material: { select: { type: true } }
          }
        },
        finishes: {
          include: {
            finish: { select: { category: true } }
          }
        },
        printing: {
          select: {
            technology: true,
            formatLabel: true,
            colors: true
          }
        }
      }
    });

    // Extrair tipos de material únicos usados pelos produtos da categoria
    const materialTypesSet = new Set<string>();
    categoryProducts.forEach((product: typeof categoryProducts[0]) => {
      product.materials.forEach((pm: typeof product.materials[0]) => {
        if (pm.material.type) {
          materialTypesSet.add(pm.material.type);
        }
      });
    });
    const materialTypes = Array.from(materialTypesSet).sort();

    // Extrair categorias de acabamento únicas usadas pelos produtos da categoria
    const finishCategoriesSet = new Set<string>();
    categoryProducts.forEach((product: typeof categoryProducts[0]) => {
      product.finishes.forEach((pf: typeof product.finishes[0]) => {
        if (pf.finish.category) {
          finishCategoriesSet.add(pf.finish.category);
        }
      });
    });
    const finishCategories = Array.from(finishCategoriesSet).sort();

    // Extrair tecnologias, formatos e cores de impressão únicos
    const printingTechnologiesSet = new Set<string>();
    const printingFormatsSet = new Set<string>();
    const printingColorsSet = new Set<string>();
    categoryProducts.forEach((product: typeof categoryProducts[0]) => {
      if (product.printing) {
        if (product.printing.technology) {
          printingTechnologiesSet.add(product.printing.technology);
        }
        if (product.printing.formatLabel) {
          printingFormatsSet.add(product.printing.formatLabel);
        }
        if (product.printing.colors) {
          printingColorsSet.add(product.printing.colors);
        }
      }
    });
    const printingTechnologies = Array.from(printingTechnologiesSet).sort();
    const printingFormats = Array.from(printingFormatsSet).sort();
    const printingColorsList = Array.from(printingColorsSet).sort();
    
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
        categories: categories.map((c: typeof categories[0]) => ({ id: c.id, name: c.name }))
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

