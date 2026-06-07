-- CreateEnum
CREATE TYPE "FlooringTimeOfDay" AS ENUM ('AM', 'PM');

-- AlterTable
ALTER TABLE "flooring_work_order" ADD COLUMN "timeOfDay" "FlooringTimeOfDay";
