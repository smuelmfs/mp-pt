-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "Unit" AS ENUM ('UNIT', 'M2', 'LOT', 'HOUR', 'SHEET');

-- CreateEnum
CREATE TYPE "FinishCategory" AS ENUM ('LAMINACAO', 'VERNIZ', 'CORTE', 'DOBRA', 'OUTROS');

-- CreateEnum
CREATE TYPE "FinishCalcType" AS ENUM ('PER_UNIT', 'PER_M2', 'PER_LOT', 'PER_HOUR');

-- CreateEnum
CREATE TYPE "PrintingTech" AS ENUM ('OFFSET', 'DIGITAL', 'UV', 'GRANDE_FORMATO');

-- CreateEnum
CREATE TYPE "QuoteItemType" AS ENUM ('MATERIAL', 'PRINTING', 'FINISH', 'OTHER');

-- CreateEnum
CREATE TYPE "MarginScope" AS ENUM ('GLOBAL', 'CATEGORY', 'PRODUCT');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'COMMERCIAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "roundingStep" DECIMAL(7,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigGlobal" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "marginDefault" DECIMAL(7,4) NOT NULL,
    "markupOperational" DECIMAL(7,4) NOT NULL,
    "roundingStep" DECIMAL(7,4),
    "lossFactor" DECIMAL(7,4),
    "setupTimeMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfigGlobal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unit" "Unit" NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialVariant" (
    "id" SERIAL NOT NULL,
    "materialId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "gramagem" INTEGER,
    "widthMm" INTEGER,
    "heightMm" INTEGER,
    "sheetsPerPack" INTEGER,
    "packPrice" DECIMAL(12,4),
    "unitPrice" DECIMAL(12,4),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),

    CONSTRAINT "MaterialVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Printing" (
    "id" SERIAL NOT NULL,
    "technology" "PrintingTech" NOT NULL,
    "formatLabel" TEXT,
    "colors" TEXT,
    "sides" INTEGER,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "yield" INTEGER,
    "setupMinutes" INTEGER,
    "minFee" DECIMAL(12,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Printing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finish" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" "FinishCategory" NOT NULL,
    "unit" "Unit" NOT NULL,
    "baseCost" DECIMAL(12,4) NOT NULL,
    "marginDefault" DECIMAL(7,4),
    "calcType" "FinishCalcType" NOT NULL DEFAULT 'PER_UNIT',
    "minFee" DECIMAL(12,2),
    "areaStepM2" DECIMAL(12,4),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Finish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "printingId" INTEGER,
    "marginDefault" DECIMAL(7,4),
    "markupDefault" DECIMAL(7,4),
    "roundingStep" DECIMAL(7,4),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "attributesSchema" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMaterial" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "qtyPerUnit" DECIMAL(12,4) NOT NULL,
    "wasteFactor" DECIMAL(7,4),
    "variantId" INTEGER,

    CONSTRAINT "ProductMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFinish" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "finishId" INTEGER NOT NULL,
    "calcRuleOverride" "Unit",
    "calcTypeOverride" "FinishCalcType",
    "qtyPerUnit" DECIMAL(12,4),
    "costOverride" DECIMAL(12,4),

    CONSTRAINT "ProductFinish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarginRule" (
    "id" SERIAL NOT NULL,
    "scope" "MarginScope" NOT NULL,
    "categoryId" INTEGER,
    "productId" INTEGER,
    "margin" DECIMAL(7,4) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarginRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarginRuleDynamic" (
    "id" SERIAL NOT NULL,
    "scope" "MarginScope" NOT NULL,
    "categoryId" INTEGER,
    "productId" INTEGER,
    "minSubtotal" DECIMAL(12,2),
    "minQuantity" INTEGER,
    "adjustPercent" DECIMAL(7,4) NOT NULL,
    "maxAdjust" DECIMAL(7,4),
    "priority" INTEGER NOT NULL DEFAULT 100,
    "stackable" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarginRuleDynamic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" SERIAL NOT NULL,
    "number" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "params" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "markupApplied" DECIMAL(7,4) NOT NULL,
    "marginApplied" DECIMAL(7,4) NOT NULL,
    "dynamicAdjust" DECIMAL(7,4) NOT NULL,
    "finalPrice" DECIMAL(12,2) NOT NULL,
    "breakdown" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" SERIAL NOT NULL,
    "quoteId" INTEGER NOT NULL,
    "itemType" "QuoteItemType" NOT NULL,
    "refId" INTEGER,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(12,4),
    "unit" "Unit",
    "unitCost" DECIMAL(12,4),
    "totalCost" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalcLog" (
    "id" SERIAL NOT NULL,
    "quoteId" INTEGER,
    "inputs" JSONB NOT NULL,
    "outputs" JSONB NOT NULL,
    "ruleNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalcLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_name_key" ON "ProductCategory"("name");

-- CreateIndex
CREATE INDEX "Material_isCurrent_idx" ON "Material"("isCurrent");

-- CreateIndex
CREATE INDEX "MaterialVariant_materialId_idx" ON "MaterialVariant"("materialId");

-- CreateIndex
CREATE INDEX "MaterialVariant_isCurrent_idx" ON "MaterialVariant"("isCurrent");

-- CreateIndex
CREATE INDEX "Printing_isCurrent_idx" ON "Printing"("isCurrent");

-- CreateIndex
CREATE INDEX "Finish_isCurrent_idx" ON "Finish"("isCurrent");

-- CreateIndex
CREATE INDEX "ProductMaterial_variantId_idx" ON "ProductMaterial"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMaterial_productId_materialId_key" ON "ProductMaterial"("productId", "materialId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFinish_productId_finishId_key" ON "ProductFinish"("productId", "finishId");

-- CreateIndex
CREATE INDEX "MarginRule_scope_idx" ON "MarginRule"("scope");

-- CreateIndex
CREATE INDEX "MarginRule_categoryId_idx" ON "MarginRule"("categoryId");

-- CreateIndex
CREATE INDEX "MarginRule_productId_idx" ON "MarginRule"("productId");

-- CreateIndex
CREATE INDEX "MarginRuleDynamic_scope_idx" ON "MarginRuleDynamic"("scope");

-- CreateIndex
CREATE INDEX "MarginRuleDynamic_categoryId_idx" ON "MarginRuleDynamic"("categoryId");

-- CreateIndex
CREATE INDEX "MarginRuleDynamic_productId_idx" ON "MarginRuleDynamic"("productId");

-- CreateIndex
CREATE INDEX "MarginRuleDynamic_active_idx" ON "MarginRuleDynamic"("active");

-- CreateIndex
CREATE INDEX "MarginRuleDynamic_priority_idx" ON "MarginRuleDynamic"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_number_key" ON "Quote"("number");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");
