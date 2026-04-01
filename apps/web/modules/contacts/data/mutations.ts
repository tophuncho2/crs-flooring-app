"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import type { ContactDetail, ContactForm } from "../domain/types"

export async function createContactRequest(input: ContactForm) {
  return requestJson<{ contact: ContactDetail }>("/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function updateContactRequest(id: string, input: ContactForm) {
  return requestJson<{ contact: ContactDetail }>(`/api/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function deleteContactRequest(id: string) {
  return requestJson<{ ok: true }>(`/api/contacts/${id}`, {
    method: "DELETE",
  })
}
