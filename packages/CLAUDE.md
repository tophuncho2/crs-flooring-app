# Packages Directory

Shared layers consumed by all three services (app, worker, relay).

## Rules

1. No package imports from `apps/` — dependency flows one direction: apps → packages.
2. No Next.js, React, or UI framework imports in any package.
3. Layer boundaries are strict — see sub-package CLAUDE.md files.