export const SEEDED_WORK_ORDER_STATUSES = [
  { slug: "none", name: "None", sortOrder: 1 },
  { slug: "assigned", name: "Assigned", sortOrder: 2 },
  { slug: "delivered", name: "Delivered", sortOrder: 3 },
  { slug: "complete", name: "Complete", sortOrder: 4 },
] as const

export type SeededWorkOrderStatus = (typeof SEEDED_WORK_ORDER_STATUSES)[number]
