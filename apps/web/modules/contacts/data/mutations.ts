"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { withMutationMeta } from "@/modules/shared/engines/common/transport/mutation"
import type { ContactDetail, ContactForm } from "@builders/domain"

export async function createContactRequest(input: ContactForm) {
  return requestJson<{ contact: ContactDetail }>("/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateContactRequest(id: string, input: ContactForm, revisionKey: string) {
  return requestJson<{ contact: ContactDetail }>(`/api/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input, revisionKey)),
  })
}

export async function deleteContactRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/contacts/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
