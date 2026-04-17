# Domain — Rules

> **Scope:** Patterns that break the domain contract. Any of these is a defect.

1. Importing `@builders/db`, Prisma, or any database type.
2. Throwing a generic `Error` instead of a typed domain error class with a code.
3. Orchestrating multiple steps or calling the data layer — that belongs in `packages/application/`.
4. Importing Next.js, React, or any UI framework.
5. Putting HTTP status codes or response shaping in domain code.
