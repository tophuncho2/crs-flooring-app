import { createPrismaClient } from "@builders/db"

const prisma = createPrismaClient()

try {
  const columns = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'flooring_cut_log'
      AND column_name IN ('cutLogNumber', 'finalCutSequence', 'isFinal')
    ORDER BY column_name
  `)
  console.log("Columns:")
  console.table(columns)

  const indexes = await prisma.$queryRawUnsafe(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'flooring_cut_log'
      AND indexname IN (
        'flooring_cut_log_cutLogNumber_key',
        'flooring_cut_log_cutLogNumber_idx',
        'flooring_cut_log_inventoryId_finalCutSequence_key',
        'flooring_cut_log_inventoryId_isFinal_idx',
        'flooring_cut_log_status_isFinal_idx'
      )
    ORDER BY indexname
  `)
  console.log("\nNew indexes:")
  console.table(indexes)

  const enumValues = await prisma.$queryRawUnsafe(`
    SELECT enumlabel, enumsortorder
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'FlooringCutLogStatus'
    ORDER BY enumsortorder
  `)
  console.log("\nFlooringCutLogStatus values:")
  console.table(enumValues)

  const seq = await prisma.$queryRawUnsafe(`
    SELECT last_value, is_called FROM flooring_cut_log_number_seq
  `)
  console.log("\nflooring_cut_log_number_seq:")
  console.table(seq)

  const formatPreview = await prisma.$queryRawUnsafe(`
    SELECT 'CUT-' || lpad('1', 7, '0') AS next_cut_log_number
  `)
  console.log("\ncutLogNumber format preview (no sequence advance):")
  console.table(formatPreview)
} finally {
  await prisma.$disconnect()
}
