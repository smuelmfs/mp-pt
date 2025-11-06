-- AlterTable
ALTER TABLE "Material" ADD COLUMN     "supplierId" INTEGER;

-- CreateIndex
CREATE INDEX "Material_supplierId_idx" ON "Material"("supplierId");
