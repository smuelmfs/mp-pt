-- AlterTable
ALTER TABLE "ConfigGlobal" ADD COLUMN     "printingHourCost" DECIMAL(12,4),
ADD COLUMN     "vatPercent" DECIMAL(7,4);

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "heightMm" INTEGER,
ADD COLUMN     "minOrderQty" INTEGER,
ADD COLUMN     "minOrderValue" DECIMAL(12,2),
ADD COLUMN     "widthMm" INTEGER;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "priceGross" DECIMAL(12,2),
ADD COLUMN     "vatAmount" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "ProductOptionGroup" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOptionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductOptionChoice" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "materialVariantId" INTEGER,
    "finishId" INTEGER,
    "finishQtyPerUnit" DECIMAL(12,4),
    "widthOverride" INTEGER,
    "heightOverride" INTEGER,
    "overrideAttrs" JSONB,
    "priceAdjustment" DECIMAL(7,4),
    "priceFixed" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOptionChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSuggestedQuantity" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "label" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSuggestedQuantity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductOptionGroup_productId_idx" ON "ProductOptionGroup"("productId");

-- CreateIndex
CREATE INDEX "ProductOptionChoice_groupId_idx" ON "ProductOptionChoice"("groupId");

-- CreateIndex
CREATE INDEX "ProductSuggestedQuantity_productId_idx" ON "ProductSuggestedQuantity"("productId");
