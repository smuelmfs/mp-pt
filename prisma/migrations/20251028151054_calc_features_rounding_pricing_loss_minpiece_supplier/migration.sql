-- CreateEnum
CREATE TYPE "RoundingStrategy" AS ENUM ('END_ONLY', 'PER_STEP');

-- CreateEnum
CREATE TYPE "PricingStrategy" AS ENUM ('COST_MARKUP_MARGIN', 'COST_MARGIN_ONLY', 'MARGIN_TARGET');

-- CreateEnum
CREATE TYPE "SetupMode" AS ENUM ('TIME_X_RATE', 'FLAT');

-- AlterTable
ALTER TABLE "ConfigGlobal" ADD COLUMN     "pricingStrategy" "PricingStrategy",
ADD COLUMN     "roundingStrategy" "RoundingStrategy";

-- AlterTable
ALTER TABLE "Finish" ADD COLUMN     "lossFactor" DECIMAL(7,4),
ADD COLUMN     "minPerPiece" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "lossFactor" DECIMAL(7,4);

-- AlterTable
ALTER TABLE "Printing" ADD COLUMN     "lossFactor" DECIMAL(7,4),
ADD COLUMN     "setupFlatFee" DECIMAL(12,2),
ADD COLUMN     "setupMode" "SetupMode";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "minPricePerPiece" DECIMAL(12,2),
ADD COLUMN     "pricingStrategy" "PricingStrategy",
ADD COLUMN     "roundingStrategy" "RoundingStrategy";

-- AlterTable
ALTER TABLE "ProductCategory" ADD COLUMN     "lossFactor" DECIMAL(7,4),
ADD COLUMN     "minPricePerPiece" DECIMAL(12,2),
ADD COLUMN     "pricingStrategy" "PricingStrategy",
ADD COLUMN     "roundingStrategy" "RoundingStrategy";

-- AlterTable
ALTER TABLE "ProductMaterial" ADD COLUMN     "lossFactor" DECIMAL(7,4);

-- CreateTable
CREATE TABLE "SupplierPrice" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "Unit" NOT NULL,
    "cost" DECIMAL(12,4) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierPrice_productId_idx" ON "SupplierPrice"("productId");
