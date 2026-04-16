-- AlterTable: drop categoryCode, add slug
ALTER TABLE "flooring_category" DROP COLUMN "categoryCode";

ALTER TABLE "flooring_category" ADD COLUMN "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "flooring_category_slug_key" ON "flooring_category"("slug");
