-- CreateEnum
CREATE TYPE "SourcingMode" AS ENUM ('INTERNAL', 'SUPPLIER', 'HYBRID');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "sourcingMode" "SourcingMode" NOT NULL DEFAULT 'INTERNAL';

-- AlterTable
ALTER TABLE "SupplierPrice" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "isCurrent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "minQty" DECIMAL(12,4),
ADD COLUMN     "supplierId" INTEGER,
ADD COLUMN     "validFrom" TIMESTAMP(3),
ADD COLUMN     "validTo" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- CreateIndex
CREATE INDEX "SupplierPrice_supplierId_idx" ON "SupplierPrice"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierPrice_unit_idx" ON "SupplierPrice"("unit");

-- CreateIndex
CREATE INDEX "SupplierPrice_isCurrent_idx" ON "SupplierPrice"("isCurrent");
