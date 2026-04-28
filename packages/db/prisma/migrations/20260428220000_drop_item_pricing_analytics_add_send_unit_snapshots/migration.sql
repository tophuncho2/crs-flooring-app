-- DropForeignKey
ALTER TABLE "flooring_analytics" DROP CONSTRAINT "flooring_analytics_workOrderId_fkey";

-- DropTable
DROP TABLE "flooring_analytics";

-- AlterTable
ALTER TABLE "flooring_template_item" DROP COLUMN "unitPrice",
ADD COLUMN     "sendUnitAbbrev" TEXT,
ADD COLUMN     "sendUnitName" TEXT;

-- AlterTable
ALTER TABLE "flooring_work_order_item" DROP COLUMN "unitPrice",
DROP COLUMN "assignedQuantity",
DROP COLUMN "assignedCost",
ADD COLUMN     "sendUnitAbbrev" TEXT,
ADD COLUMN     "sendUnitName" TEXT;
