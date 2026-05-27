export const SEEDED_WORK_ORDER_STATUSES = [
  { slug: "none", name: "None" },
  { slug: "assigned", name: "Assigned" },
  { slug: "delivered", name: "Delivered" },
] as const

export type SeededWorkOrderStatus = (typeof SEEDED_WORK_ORDER_STATUSES)[number]
