**Completed services hardening sweep — chronological:**

1. **Step 1:** Route policy migration + capability sweep. GET migrated from `authorizeServicesRoute` → `applyRoutePolicy`. Added `capability: "system.access"` to POST/PATCH/DELETE. Fixed mock slug lie. Deleted dead `authorizeServicesRoute` helper.

2. **Step 2:** `parseUuidParam` on PATCH and DELETE. Test fixtures updated to real UUIDs.

3. **Step 3:** Validators extraction + `ServiceErrorCode` union. Created `_validators.ts` throwing `ServiceExecutionError` directly. Retyped `ServiceExecutionError.code` from bare string to union (`SERVICE_VALIDATION_FAILED | SERVICE_NOT_FOUND | SERVICE_IN_USE`). `ServiceInput` already unified.

4. **Shared refactor:** Extracted `isValidUuid` predicate into `api-helpers.ts`. Refactored `parseUuidParam` to use it. Services validator consumes it.

5. **Step 4:** `withDatabaseTransaction` wrapping. Added `client?: Prisma.TransactionClient` parameter to all three use cases. Moved `getServiceById` inside transaction. Backfilled create/update application tests.

6. **Step 5:** PATCH route split. New `[id]/primary/section/route.ts`. `[id]/route.ts` reduced to DELETE-only. Eliminated post-write re-read (uses case result directly). New scope `services.primary.section.replace`. Test file split into two. Fixed services-client URL assertion.

7. **Step 6:** Data layer cleanup. `queries.ts` stripped to flat `getServicesPageData` + `getServiceDetailPageData`. New `load-unit-options.ts`. Routes import from `@builders/db` direct. Server Components use `Promise.all` for parallel loading. List page dropped unused `unitOptions`. Test mock boundary moved to `@builders/db`.

8. **Fixture cleanup:** Fixed services-client test #3 body assertion. Removed services-client tests #4/#5.

9. **Cross-module cleanup:** Removed 2 obsolete list-row delete tests from categories, 3 from templates.

---

**Current state:**

```
packages/domain/src/flooring/services/
├── types.ts                  (ServiceRow, UnitOption, ServiceForm, EMPTY_SERVICE_FORM, validateServiceForm, toServiceForm)
├── delete-rules.ts           (ServiceDeleteLinkState, isServiceDeleteBlocked, getServiceDeleteBlockedMessage)
└── index.ts

packages/application/src/flooring/services/
├── errors.ts                 (ServiceErrorCode union, ServiceExecutionError)
├── types.ts                  (ServiceInput unified, ServiceResult)
├── create-service.ts         (wrapped in withDatabaseTransaction, optional client)
├── update-service.ts         (wrapped, optional client)
├── delete-service.ts         (wrapped, optional client, throws SERVICE_NOT_FOUND / SERVICE_IN_USE)
└── index.ts

packages/db/src/flooring/services/
├── read-repository.ts        (listServices, listServiceOptions, getServiceById, getServiceDeleteState)
├── write-repository.ts       (createServiceRecord, updateServiceRecord, deleteServiceRecordById)
└── index.ts

apps/web/app/api/services/
├── _validators.ts            (validateServiceInput using isValidUuid)
├── route.ts                  (GET + POST)
├── [id]/route.ts             (DELETE only)
└── [id]/primary/section/route.ts   (PATCH, scope: services.primary.section.replace)

apps/web/modules/services/
├── controller/
│   ├── use-services-list-controller.ts
│   └── use-service-primary-section.ts
├── components/list/          (services-client, services-table — no unitOptions prop)
├── components/record/        (detail-client, record-panel, primary-fields-section, create-client)
└── data/
    ├── queries.ts            (getServicesPageData flat, getServiceDetailPageData flat)
    ├── load-unit-options.ts  (module-local reference loader)
    └── mutations.ts          (updateServiceRequest PATCHes /primary/section)

apps/web/app/dashboard/services/
├── page.tsx                  (getServicesPageData only; no unitOptions)
├── [id]/page.tsx             (Promise.all: getServiceDetailPageData + loadUnitOptions)
└── new/page.tsx              (loadUnitOptions only)

apps/web/tests/modules/services/
├── services-routes.test.ts              (6 tests: GET, POST×3, DELETE×2)
├── services-primary-section-route.test.ts   (3 tests: happy, stale, validation)
├── services-application.test.ts         (3 tests: delete block, create, update)
└── services-client.test.tsx             (3 tests: add route, row click, detail save)
```

**Deferred (Linear issues):**
- Negative `baseCost` domain rule.
- Service delete guard removal + template/work order snapshot columns (tackled during templates/work orders hardening).