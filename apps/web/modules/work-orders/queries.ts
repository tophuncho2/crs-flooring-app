import {
  Prisma,
  createPrismaPageLoadIssue,
  findActiveWorkOrderAllocationRunRow,
  findWorkOrderAllocationRunRowBySourceVersion,
  isPrismaNotFoundError,
  listAutoAllocationInventoryCandidateRows,
  prisma,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
} from "@builders/db"
import { mapWorkOrderAllocationRunRowToRecord } from "@builders/application"
import { appendUniqueOrderBy, createServerPagination, type ServerTableQueryState } from "@/server/pagination"
import {
  buildInventoryAllocationTotals,
  buildWorkOrderAllocationPlan,
  buildWorkOrderAllocationWorkflowSummary,
  isWorkOrderAutoAllocationPendingStatus,
} from "@builders/domain"
import { loadSharedRecordDetailOptions } from "@/modules/shared/engines/common/transport/record-detail-options"
import {
  type WorkOrderPageFilterState,
  type WorkOrderStatusFilter,
  parseWorkOrderWarehouseFilter,
  parseWorkOrderStatusFilter,
} from "./domain/filters"
import { buildWorkOrderCalculationRowsFromSummary, normalizeWorkOrderExpenseTotals } from "./domain/expense-summary"
import {
  normalizeWorkOrder,
  normalizeWorkOrderItem,
  normalizeWorkOrderSalesRep,
  normalizeWorkOrderServiceItem,
  normalizeWorkOrderSummary,
} from "./services"

async function deriveWorkOrderAllocationState(
  db: WorkOrderDbClient,
  workOrder: {
    id: string
    warehouseId: string | null
    updatedAt: Date
    items: Array<{
      id: string
      productId: string
      quantity: { toString(): string }
      allocations: Array<{ quantity: { toString(): string }; unitCost: { toString(): string } }>
    }>
  },
) {
  const currentRunRow = await findWorkOrderAllocationRunRowBySourceVersion(workOrder.id, workOrder.updatedAt, db)
  const currentRun = currentRunRow ? mapWorkOrderAllocationRunRowToRecord(currentRunRow) : null
  const hasPendingRun = isWorkOrderAutoAllocationPendingStatus(currentRun?.status)
  const canDeclareShortage = currentRun?.status === "COMPLETED"

  const shortageItemIds = new Set<string>()

  if (canDeclareShortage && workOrder.warehouseId) {
    const inventoryCandidates = await listAutoAllocationInventoryCandidateRows(workOrder.id, db)
    const allocationPlan = buildWorkOrderAllocationPlan({
      warehouseId: workOrder.warehouseId,
      items: workOrder.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        requiredQuantity: item.quantity.toString(),
        allocatedQuantity: item.allocations.reduce(
          (total, allocation) => total + Number(allocation.quantity.toString()),
          0,
        ),
      })),
      candidates: inventoryCandidates.map((candidate) => ({
        id: candidate.id,
        productId: candidate.productId,
        warehouseId: candidate.warehouseId,
        availableQuantity: buildInventoryAllocationTotals({
          stockCount: candidate.stockCount.toString(),
          cutTotal: candidate.cutTotal,
          reservedStockCount: candidate.reservedStockCount.toString(),
        }).availableToAllocate,
        fifoReceivedAt: candidate.fifoReceivedAt.toISOString(),
        itemNumber: candidate.itemNumber,
      })),
    })

    for (const shortage of allocationPlan.shortages) {
      shortageItemIds.add(shortage.workOrderItemId)
    }
  }

  return {
    currentRun,
    hasPendingRun,
    shortageItemIds,
  }
}

type WorkOrderDbClient = Prisma.TransactionClient | typeof prisma

function buildWorkOrderWhere(searchQuery: string): Prisma.FlooringWorkOrderWhereInput | undefined {
  if (!searchQuery) return undefined

  return {
    OR: [
      { workOrderNumber: { contains: searchQuery, mode: "insensitive" } },
      { property: { name: { contains: searchQuery, mode: "insensitive" } } },
      { property: { streetAddress: { contains: searchQuery, mode: "insensitive" } } },
      { property: { city: { contains: searchQuery, mode: "insensitive" } } },
      { property: { state: { contains: searchQuery, mode: "insensitive" } } },
      { property: { postalCode: { contains: searchQuery, mode: "insensitive" } } },
      { warehouse: { name: { contains: searchQuery, mode: "insensitive" } } },
      { unitLabel: { contains: searchQuery, mode: "insensitive" } },
      { unitType: { contains: searchQuery, mode: "insensitive" } },
      { customAddress: { contains: searchQuery, mode: "insensitive" } },
      { instructions: { contains: searchQuery, mode: "insensitive" } },
      { notes: { contains: searchQuery, mode: "insensitive" } },
    ],
  }
}

function buildWorkOrderStatusWhere(statuses: WorkOrderPageFilterState["status"]): Prisma.FlooringWorkOrderWhereInput | undefined {
  const normalizedStatuses = parseWorkOrderStatusFilter(statuses) as WorkOrderStatusFilter[]
  if (normalizedStatuses.length === 0) {
    return undefined
  }

  return {
    status: {
      in: normalizedStatuses,
    },
  }
}

function buildWorkOrderWarehouseWhere(warehouseIds: string[] | string): Prisma.FlooringWorkOrderWhereInput | undefined {
  const normalizedWarehouseIds = parseWorkOrderWarehouseFilter(warehouseIds)
  if (normalizedWarehouseIds.length === 0) {
    return undefined
  }

  return {
    warehouseId: {
      in: normalizedWarehouseIds,
    },
  }
}

function buildCombinedWorkOrderWhere(searchQuery: string, filters: WorkOrderPageFilterState): Prisma.FlooringWorkOrderWhereInput | undefined {
  const whereClauses = [
    buildWorkOrderWhere(searchQuery),
    buildWorkOrderStatusWhere(filters.status),
    buildWorkOrderWarehouseWhere(filters.warehouseId),
  ].filter(Boolean) as Prisma.FlooringWorkOrderWhereInput[]

  if (whereClauses.length === 0) {
    return undefined
  }

  if (whereClauses.length === 1) {
    return whereClauses[0]
  }

  return {
    AND: whereClauses,
  }
}

function buildWorkOrderOrderBy(tableState: ServerTableQueryState): Prisma.FlooringWorkOrderOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = tableState.isAscendingSort ? "asc" : "desc"
  const orderBy: Prisma.FlooringWorkOrderOrderByWithRelationInput[] = []
  const fieldMap: Record<string, Prisma.FlooringWorkOrderOrderByWithRelationInput> = {
    wo: { workOrderNumber: direction },
    status: { status: direction },
    warehouse: { warehouse: { name: direction } },
    property: { property: { name: direction } },
    address: { customAddress: direction },
    customAddress: { customAddress: direction },
    date: { scheduledFor: direction },
    unit: { unitLabel: direction },
    unitType: { unitType: direction },
    vacancy: { vacancy: direction },
    instructions: { instructions: direction },
    notes: { notes: direction },
  }

  if (tableState.isGroupingEnabled) {
    for (const groupKey of tableState.groupByKeys) {
      appendUniqueOrderBy(orderBy, fieldMap[groupKey])
    }
  }

  appendUniqueOrderBy(orderBy, { workOrderNumber: direction })

  return orderBy
}

export async function listWorkOrders(
  pagination: { skip: number; take: number } | undefined,
  tableState: ServerTableQueryState,
  filters: WorkOrderPageFilterState,
) {
  const workOrders = await prisma.flooringWorkOrder.findMany({
    include: {
      property: {
        select: {
          id: true,
          name: true,
          streetAddress: true,
          city: true,
          state: true,
          postalCode: true,
        },
      },
      warehouse: {
        select: { id: true, name: true },
      },
      _count: {
        select: { items: true, serviceItems: true },
      },
      items: {
        select: {
          allocationStatus: true,
        },
      },
    },
    where: buildCombinedWorkOrderWhere(tableState.searchQuery, filters),
    orderBy: buildWorkOrderOrderBy(tableState),
    ...(pagination ?? {}),
  })

  return workOrders.map((workOrder) =>
    normalizeWorkOrder({
      ...workOrder,
      hasShortage: workOrder.items.some((item) => item.allocationStatus === "SHORTAGE"),
    }),
  )
}

export async function getWorkOrderByIdWithClient(db: WorkOrderDbClient, id: string) {
  const workOrder = await db.flooringWorkOrder.findUniqueOrThrow({
    where: { id },
    include: {
      property: {
        select: {
          id: true,
          name: true,
          streetAddress: true,
          city: true,
          state: true,
          postalCode: true,
        },
      },
      warehouse: { select: { id: true, name: true } },
      items: {
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        include: {
          product: {
            select: {
              name: true,
              style: true,
              color: true,
              category: {
                select: {
                  sendUnit: { select: { name: true } },
                },
              },
            },
          },
          allocations: {
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            include: {
              inventory: {
                select: {
                  itemNumber: true,
                  dyeLot: true,
                  product: {
                    select: {
                      category: {
                        select: {
                          stockUnit: { select: { name: true } },
                        },
                      },
                    },
                  },
                  location: {
                    select: {
                      locationCode: true,
                      warehouse: { select: { name: true } },
                    },
                  },
                  importEntry: {
                    select: {
                      warehouse: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      serviceItems: {
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        include: {
          unit: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      salesReps: {
        orderBy: [{ createdAt: "desc" }, { contact: { name: "asc" } }, { id: "asc" }],
        include: {
          contact: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })

  const [allocationState, activeAllocationRunRow] = await Promise.all([
    deriveWorkOrderAllocationState(db, workOrder),
    findActiveWorkOrderAllocationRunRow(workOrder.id, db),
  ])

  return {
    ...(() => {
      const normalizedItems = workOrder.items.map((item) =>
        normalizeWorkOrderItem(item, {
          hasPendingAllocationRun: allocationState.hasPendingRun,
          hasEligibleInventoryRemaining: !allocationState.shortageItemIds.has(item.id),
        }),
      )
      const normalizedServiceItems = workOrder.serviceItems.map(normalizeWorkOrderServiceItem)
      const normalizedSalesReps = workOrder.salesReps.map(normalizeWorkOrderSalesRep)
      const allocationWorkflow = buildWorkOrderAllocationWorkflowSummary({
        itemStatuses: normalizedItems.map((item) => item.allocationStatus),
        hasPendingRun: allocationState.hasPendingRun,
      })

      return {
        ...normalizeWorkOrder({
          ...workOrder,
          hasShortage: normalizedItems.some((item) => item.allocationStatus === "SHORTAGE"),
        }),
        autoAllocationRun:
          allocationState.currentRun ??
          (activeAllocationRunRow ? mapWorkOrderAllocationRunRowToRecord(activeAllocationRunRow) : null),
        items: normalizedItems,
        serviceItems: normalizedServiceItems,
        salesReps: normalizedSalesReps,
        allocationIsDone: allocationWorkflow.isDone,
        summary: normalizeWorkOrderSummary({
          items: normalizedItems,
          serviceItems: normalizedServiceItems,
        }),
        financialSummary: normalizeWorkOrderExpenseTotals({
          items: normalizedItems,
          serviceItems: normalizedServiceItems,
          salesReps: normalizedSalesReps,
        }),
      }
    })(),
  }
}

export async function getWorkOrderById(id: string) {
  return getWorkOrderByIdWithClient(prisma, id)
}

export async function getWorkOrderReconciliationByIdWithClient(db: WorkOrderDbClient, id: string) {
  const workOrder = await db.flooringWorkOrder.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      updatedAt: true,
      items: {
        select: {
          allocationStatus: true,
        },
      },
    },
  })

  const currentRunRow = await findWorkOrderAllocationRunRowBySourceVersion(workOrder.id, workOrder.updatedAt, db)
  const activeRunRow = currentRunRow ?? (await findActiveWorkOrderAllocationRunRow(workOrder.id, db))
  const activeRun = activeRunRow ? mapWorkOrderAllocationRunRowToRecord(activeRunRow) : null
  const allocationWorkflow = buildWorkOrderAllocationWorkflowSummary({
    itemStatuses: workOrder.items.map((item) => item.allocationStatus),
    hasPendingRun: isWorkOrderAutoAllocationPendingStatus(activeRun?.status),
  })

  return {
    updatedAt: workOrder.updatedAt.toISOString(),
    hasShortage: workOrder.items.some((item) => item.allocationStatus === "SHORTAGE"),
    allocationIsDone: allocationWorkflow.isDone,
    autoAllocationRun: activeRun,
  }
}

export async function getWorkOrderReconciliationById(id: string) {
  return getWorkOrderReconciliationByIdWithClient(prisma, id)
}

export async function listWorkOrderItems(workOrderId: string) {
  const items = await prisma.flooringWorkOrderItem.findMany({
    where: { workOrderId },
    include: {
      product: {
        select: {
          name: true,
          style: true,
          color: true,
          category: { select: { sendUnit: { select: { name: true } } } },
        },
      },
      allocations: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          inventory: {
            select: {
              itemNumber: true,
              dyeLot: true,
              product: {
                select: {
                  category: {
                    select: {
                      stockUnit: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
              location: {
                select: {
                  locationCode: true,
                  warehouse: { select: { name: true } },
                },
              },
              importEntry: {
                select: {
                  warehouse: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  })

  return items.map((item) => normalizeWorkOrderItem(item))
}

export async function listWorkOrderServiceItems(workOrderId: string) {
  const items = await prisma.flooringWorkOrderServiceItem.findMany({
    where: { workOrderId },
    include: {
      unit: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  })

  return items.map(normalizeWorkOrderServiceItem)
}

export async function listWorkOrderSalesReps(workOrderId: string) {
  const items = await prisma.flooringWorkOrderSalesRep.findMany({
    where: { workOrderId },
    include: {
      contact: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { contact: { name: "asc" } }, { id: "asc" }],
  })

  return items.map(normalizeWorkOrderSalesRep)
}

export async function listWorkOrderCalculationRows(workOrderId: string) {
  const [items, serviceItems, salesReps] = await Promise.all([
    prisma.flooringWorkOrderItem.findMany({
      where: { workOrderId },
      select: {
        quantity: true,
        unitPrice: true,
        allocations: {
          select: {
            quantity: true,
            unitCost: true,
          },
        },
      },
    }),
    prisma.flooringWorkOrderServiceItem.findMany({
      where: { workOrderId },
      select: {
        quantity: true,
        unitPrice: true,
      },
    }),
    prisma.flooringWorkOrderSalesRep.findMany({
      where: { workOrderId },
      select: {
        percent: true,
      },
    }),
  ])

  return buildWorkOrderCalculationRowsFromSummary(
    normalizeWorkOrderExpenseTotals({
      items: items.map((item) => ({
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        materialExpense: item.allocations.reduce(
          (total, allocation) =>
            total + Number(allocation.quantity.toString()) * Number(allocation.unitCost.toString()),
          0,
        ),
      })),
      serviceItems: serviceItems.map((item) => ({
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
      })),
      salesReps: salesReps.map((item) => ({
        percent: item.percent.toString(),
      })),
    }),
  )
}

export async function listWorkOrdersPageFilterOptions() {
  return prisma.flooringWarehouse.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
}

async function loadWorkOrdersPageData(
  page: number,
  tableState: ServerTableQueryState,
  filters: WorkOrderPageFilterState,
  preloadedWarehouses?: Array<{ id: string; name: string }>,
) {
  const where = buildCombinedWorkOrderWhere(tableState.searchQuery, filters)
  const totalItems = await prisma.flooringWorkOrder.count({ where })
  const pagination = createServerPagination({ page, totalItems })

  const [workOrders, properties, warehouses, templates] = await Promise.all([
    listWorkOrders({ skip: pagination.skip, take: pagination.take }, tableState, filters),
    prisma.property.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        streetAddress: true,
        city: true,
        state: true,
        postalCode: true,
      },
    }),
    preloadedWarehouses ? Promise.resolve(preloadedWarehouses) : listWorkOrdersPageFilterOptions(),
    prisma.flooringTemplate.findMany({
      orderBy: [{ property: { name: "asc" } }, { templateTag: "asc" }],
      select: {
        id: true,
        propertyId: true,
        templateTag: true,
        property: { select: { name: true } },
      },
    }),
  ])

  return {
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages: pagination.totalPages,
    },
    tableState,
    filterState: filters,
    initialWorkOrders: workOrders.map((workOrder) => ({
      ...workOrder,
      itemsCount: workOrder.itemsCount ?? 0,
    })),
    propertyOptions: properties.map((property) => ({
      id: property.id,
      name: property.name,
      address: [property.streetAddress, property.city, property.state, property.postalCode].filter(Boolean).join(", "),
    })),
    warehouseOptions: warehouses,
    templateOptions: templates.map((template) => ({
      id: template.id,
      propertyId: template.propertyId,
      label: `${template.property.name} / ${template.templateTag}`,
    })),
  }
}

export async function getWorkOrdersPageData(
  page: number,
  tableState: ServerTableQueryState,
  filters: WorkOrderPageFilterState,
  preloadedWarehouses?: Array<{ id: string; name: string }>,
) {
  return withPrismaConnectivityHandling(() => loadWorkOrdersPageData(page, tableState, filters, preloadedWarehouses))
}

export async function getWorkOrderDetailPageOptions() {
  return withPrismaConnectivityHandling(() => loadSharedRecordDetailOptions())
}

export async function getWorkOrderDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  workOrder: Awaited<ReturnType<typeof getWorkOrderById>>
  propertyOptions: Awaited<ReturnType<typeof loadSharedRecordDetailOptions>>["propertyOptions"]
  warehouseOptions: Awaited<ReturnType<typeof loadSharedRecordDetailOptions>>["warehouseOptions"]
  productOptions: Awaited<ReturnType<typeof loadSharedRecordDetailOptions>>["productOptions"]
  serviceOptions: Awaited<ReturnType<typeof loadSharedRecordDetailOptions>>["serviceOptions"]
  unitOptions: Awaited<ReturnType<typeof loadSharedRecordDetailOptions>>["unitOptions"]
  salesRepOptions: Awaited<ReturnType<typeof loadSharedRecordDetailOptions>>["salesRepOptions"]
}>> {
  try {
    const [workOrder, options] = await Promise.all([
      getWorkOrderById(id),
      loadSharedRecordDetailOptions(),
    ])

    return {
      ok: true,
      data: {
        workOrder,
        ...options,
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "WORK_ORDER_DETAIL",
        title: "Work Order Unavailable",
        message: "The app could not load this work order.",
        detail: "Try refreshing the page. If this keeps happening, check the database connection and record availability.",
      }),
    }
  }
}
