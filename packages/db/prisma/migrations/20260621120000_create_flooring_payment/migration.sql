-- =====================================================================
-- Payments: standalone single-entry ledger of inflows / outflows.
--
-- Adds the `flooring_payment` table. Each row records one money movement:
-- `direction` (INFLOW / OUTFLOW) carries the sign, `amount` is stored
-- unsigned as DECIMAL(12,2). `paymentNumber` is a human-readable PAY-N
-- generated from a dedicated sequence (parity with TP-/ADJ-/WO- numbers).
-- `paymentType`, `paymentMethod`, `paymentDate`, and `memo` are optional.
--
-- This table stands ALONE — no foreign keys this slice. The (createdAt, id)
-- index backs the newest-first list-view ordering.
-- =====================================================================

-- CreateSequence (backs the PAY- paymentNumber default)
CREATE SEQUENCE IF NOT EXISTS "flooring_payment_number_seq";

-- CreateEnum
CREATE TYPE "FlooringPaymentDirection" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateTable
CREATE TABLE "flooring_payment" (
    "id" TEXT NOT NULL,
    "paymentNumber" TEXT NOT NULL DEFAULT ('PAY-'::text || (nextval('flooring_payment_number_seq'::regclass))::text),
    "amount" DECIMAL(12,2) NOT NULL,
    "direction" "FlooringPaymentDirection" NOT NULL,
    "paymentType" TEXT,
    "paymentMethod" TEXT,
    "paymentDate" TIMESTAMP(3),
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flooring_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "flooring_payment_paymentNumber_key" ON "flooring_payment"("paymentNumber");

-- CreateIndex
CREATE INDEX "flooring_payment_paymentNumber_idx" ON "flooring_payment"("paymentNumber");

-- CreateIndex
CREATE INDEX "flooring_payment_createdAt_id_idx" ON "flooring_payment"("createdAt", "id");
