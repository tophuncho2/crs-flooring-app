import type { ContactForm } from "./types.js"

export function validateContactForm(input: ContactForm) {
  if (!input.name.trim()) return "Contact name is required"
  return ""
}
