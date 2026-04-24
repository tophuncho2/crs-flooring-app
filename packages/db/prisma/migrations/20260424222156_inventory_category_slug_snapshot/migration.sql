/*
  Warnings:

  - Added the required column `categorySlug` to the `flooring_inventory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "flooring_inventory" ADD COLUMN     "categorySlug" TEXT NOT NULL;
