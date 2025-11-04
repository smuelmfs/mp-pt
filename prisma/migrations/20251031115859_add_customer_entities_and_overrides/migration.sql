-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MarginScope" ADD VALUE 'CUSTOMER';
ALTER TYPE "MarginScope" ADD VALUE 'CUSTOMER_GROUP';

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "customerId" INTEGER;

-- CreateTable
CREATE TABLE "CustomerGroup" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "taxId" TEXT,
    "groupId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialCustomerPrice" (
    "id" SERIAL NOT NULL,
    "materialId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MaterialCustomerPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrintingCustomerPrice" (
    "id" SERIAL NOT NULL,
    "printingId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "sides" INTEGER,
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PrintingCustomerPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishCustomerPrice" (
    "id" SERIAL NOT NULL,
    "finishId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "baseCost" DECIMAL(12,4) NOT NULL,
    "minFee" DECIMAL(12,2),
    "areaStepM2" DECIMAL(12,4),
    "priority" INTEGER NOT NULL DEFAULT 100,
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "FinishCustomerPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCustomerOverride" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "marginDefault" DECIMAL(7,4),
    "markupDefault" DECIMAL(7,4),
    "roundingStep" DECIMAL(7,4),
    "roundingStrategy" "RoundingStrategy",
    "minPricePerPiece" DECIMAL(12,2),
    "minOrderQty" INTEGER,
    "minOrderValue" DECIMAL(12,2),
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "ProductCustomerOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerGroup_name_key" ON "CustomerGroup"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_groupId_idx" ON "Customer"("groupId");

-- CreateIndex
CREATE INDEX "MaterialCustomerPrice_materialId_customerId_isCurrent_prior_idx" ON "MaterialCustomerPrice"("materialId", "customerId", "isCurrent", "priority");

-- CreateIndex
CREATE INDEX "PrintingCustomerPrice_printingId_customerId_sides_isCurrent_idx" ON "PrintingCustomerPrice"("printingId", "customerId", "sides", "isCurrent", "priority");

-- CreateIndex
CREATE INDEX "FinishCustomerPrice_finishId_customerId_isCurrent_priority_idx" ON "FinishCustomerPrice"("finishId", "customerId", "isCurrent", "priority");

-- CreateIndex
CREATE INDEX "ProductCustomerOverride_productId_customerId_isCurrent_prio_idx" ON "ProductCustomerOverride"("productId", "customerId", "isCurrent", "priority");
