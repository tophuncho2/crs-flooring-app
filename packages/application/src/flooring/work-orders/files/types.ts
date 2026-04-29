import type { StorageEnvironment } from "@builders/lib"

export type RequestWorkOrderFileInput = {
  workOrderId: string
  requestedBy: {
    userId: string
    userEmail: string
  }
}

export type RequestWorkOrderFileResult = {
  fileId: string
  fileNumber: number
  outboxEventId: string
  wasDuplicate: boolean
}

export type GenerateWorkOrderFileInput = {
  workOrderId: string
  fileId: string
  storageEnv: StorageEnvironment
}

export type GenerateWorkOrderFileResult = {
  fileId: string
  fileKey: string
  completedAt: string
}

export type DeleteWorkOrderFileInput = {
  workOrderId: string
  fileId: string
  storageEnv: StorageEnvironment
}
