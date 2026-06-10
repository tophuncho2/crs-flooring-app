export type Contact = {
  id: string
  name: string
  phone: string
  email: string
  createdAt: string
  updatedAt: string
}

export type ContactListRow = Contact

export type ContactOption = {
  id: string
  name: string
}

export type ContactForm = {
  name: string
  phone: string
  email: string
}

export const EMPTY_CONTACT_FORM: ContactForm = {
  name: "",
  phone: "",
  email: "",
}

export function toContactForm(contact: Contact): ContactForm {
  return {
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
  }
}
