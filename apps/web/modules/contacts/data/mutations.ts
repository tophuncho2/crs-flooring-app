"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type { Contact, ContactForm } from "@builders/domain"

export async function createContactRequest(input: ContactForm) {
  return requestJson<{ contact: Contact }>("/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updateContactRequest(
  id: string,
  input: ContactForm,
  revisionKey: string,
) {
  return requestJson<{ contact: Contact }>(
    `/api/contacts/${id}/primary/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input, revisionKey)),
    },
  )
}

export async function deleteContactRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/contacts/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}
