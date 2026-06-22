-- Exact-amount search index for the payments list bar.
CREATE INDEX "flooring_payment_amount_idx" ON "flooring_payment" ("amount");
