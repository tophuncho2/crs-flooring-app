"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import type { ContactDetail, ContactForm } from "../domain/types"

export async function createContactRequest(input: ContactForm) {
  return requestJson<{ contact: ContactDetail }>("/api/flooring/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function updateContactRequest(id: string, input: ContactForm) {
  return requestJson<{ contact: ContactDetail }>(`/api/flooring/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
}

export async function deleteContactRequest(id: string) {
  return requestJson<{ ok: true }>(`/api/flooring/contacts/${id}`, {
    method: "DELETE",
  })
}
