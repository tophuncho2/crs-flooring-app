Manufacturers Module — Layer-by-Layer Breakdown

  1. Domain Layer

  packages/domain/src/flooring/manufacturers/

  ┌───────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────┐
  │         File          │                                                  Exports                                                   │                                            Purpose                                             │
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ types.ts              │ ManufacturerRow (type), ManufacturerForm (type), EMPTY_MANUFACTURER_FORM (const), toManufacturerForm()     │ Data shapes for manufacturer records and form inputs, plus a converter from row to form        │
  │                       │ (fn)                                                                                                       │                                                                                                │
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ manufacturer-rules.ts │ normalizeManufacturerCompanyNameForUniqueness() (fn), isManufacturerCompanyNameConflict() (fn),            │ Pure business rules: name normalization (trim+lowercase), conflict check (boolean              │
  │                       │ isManufacturerDeleteBlocked() (fn)                                                                         │ pass-through), delete guard (products > 0)                                                     │
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ index.ts              │ Re-exports from types.js and manufacturer-rules.js                                                         │ Barrel file                                                                                    │
  └───────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────┘

  2. Application Layer

  packages/application/src/flooring/manufacturers/

  ┌────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │          File          │                                            Exports                                            │                                                  Purpose                                                   │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ errors.ts              │ ManufacturerErrorCode (union type), ManufacturerExecutionError (class)                        │ Typed execution error with union-constrained code, status, optional field and payload                      │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ types.ts               │ ManufacturerInput (type), ManufacturerResult (type alias for ManufacturerRecord)              │ Input shape for create/update, result shape aliasing the DB record type                                    │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ create-manufacturer.ts │ createManufacturerUseCase() (fn)                                                              │ Creates a manufacturer inside withDatabaseTransaction; pre-checks uniqueness via normalized name, catches  │
  │                        │                                                                                               │ P2002 as fallback                                                                                          │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ update-manufacturer.ts │ updateManufacturerUseCase() (fn)                                                              │ Updates a manufacturer inside withDatabaseTransaction; same uniqueness check excluding current ID, same    │
  │                        │                                                                                               │ P2002 fallback                                                                                             │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ delete-manufacturer.ts │ deleteManufacturerUseCase() (fn)                                                              │ Deletes a manufacturer inside withDatabaseTransaction; checks existence (404), blocks if products linked   │
  │                        │                                                                                               │ (409)                                                                                                      │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ index.ts               │ Re-exports from errors.js, types.js, create-manufacturer.js, update-manufacturer.js,          │ Barrel file                                                                                                │
  │                        │ delete-manufacturer.js                                                                        │                                                                                                            │
  └────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

  3. Data Layer

  packages/db/src/flooring/manufacturers/

  ┌─────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────┐
  │        File         │                                                      Exports                                                       │                                         Purpose                                          │
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │                     │ ManufacturerRecord (type), ManufacturerDeleteStateResult (type), normalizeManufacturer() (fn), listManufacturers() │ Read queries: list (ordered by companyName, agentName), find-unique-or-throw,            │
  │ read-repository.ts  │  (fn), getManufacturerById() (fn), manufacturerCompanyNameExists() (fn), getManufacturerDeleteState() (fn)         │ normalized-name existence check with optional ID exclusion, delete-state fetch (product  │
  │                     │                                                                                                                    │ count)                                                                                   │   
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ write-repository.ts │ ManufacturerFormInput (type), createManufacturerPrimaryRecord() (fn), updateManufacturerPrimaryRecord() (fn),      │ Write queries: create/update trim all strings and convert empty to null, delete by ID;   │   
  │                     │ deleteManufacturerRecordById() (fn)                                                                                │ all return ManufacturerRecord via normalizeManufacturer() (except delete returns void)   │   
  ├─────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────┤
  │ index.ts            │ Re-exports from read-repository.js and write-repository.js                                                         │ Barrel file                                                                              │   
  └─────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────┘   
  
  4. Route Layer                                                                                                                                                                                                                            
                                                                  
  apps/web/app/api/manufacturers/                                                                                                                                                                                                           
  
  ┌───────────────────────────────┬────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐   
  │             File              │            Exports             │                                                                              Purpose                                                                               │ 
  ├───────────────────────────────┼────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤ 
  │ route.ts                      │ GET(), POST()                  │ GET: list all manufacturers with query rate limit. POST: create manufacturer with full mutation lifecycle (parse envelope → enforce receipt →                      │ 
  │                               │                                │ withMutationTelemetry → finalize receipt), returns 201                                                                                                             │ 
  ├───────────────────────────────┼────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ [id]/route.ts                 │ DELETE()                       │ Delete manufacturer with parseUuidParam, assertExpectedUpdatedAt, full mutation lifecycle; blocks if products linked                                               │   
  ├───────────────────────────────┼────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ [id]/primary/section/route.ts │ PATCH()                        │ Update manufacturer primary section with parseUuidParam, assertExpectedUpdatedAt, full mutation lifecycle; returns use case result directly as authoritative       │   
  │                               │                                │ snapshot                                                                                                                                                           │
  ├───────────────────────────────┼────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ _validators.ts                │ validateManufacturerInput()    │ Hand-rolled input validator: requires non-empty companyName, defaults optional fields to empty string, throws ManufacturerExecutionError with code                 │   
  │                               │ (fn)                           │ MANUFACTURER_VALIDATION_FAILED on failure                                                                                                                          │
  └───────────────────────────────┴────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘   
                                                                  
  5. Page Layer

  apps/web/app/dashboard/manufacturers/

  ┌───────────────┬────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │     File      │                        Exports                         │                                                                          Purpose                                                                           │
  ├───────────────┼────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ page.tsx      │ ManufacturersPage (default export, async Server        │ List page: requires manufacturers access, loads table preferences, parses server table state (sort, grouping by companyName), fetches page data, renders   │
  │               │ Component)                                             │ ManufacturersClient or error state                                                                                                                         │   
  ├───────────────┼────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ [id]/page.tsx │ ManufacturerDetailPage (default export, async Server   │ Detail page: requires manufacturers access, fetches by ID, calls notFound() on 404, renders ManufacturerDetailClient with back-href from returnTo param    │
  │               │ Component)                                             │                                                                                                                                                            │   
  ├───────────────┼────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ new/page.tsx  │ ManufacturerCreatePage (default export, async Server   │ Create page: requires manufacturers access, renders ManufacturerCreateClient with back-href from returnTo param                                            │   
  │               │ Component)                                             │                                                                                                                                                            │   
  └───────────────┴────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                                                                                                                                                                            
  6. Module Layer                                                 

  apps/web/modules/manufacturers/                                                                                                                                                                                                           
  
  controller/                                                                                                                                                                                                                               
                                                                  
  ┌──────────────────────────────────────┬──────────────────────────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                 File                 │               Exports                │                                                                        Purpose                                                                        │
  ├──────────────────────────────────────┼──────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ use-manufacturers-list-controller.ts │ useManufacturersListController()     │ Manages list rows state and record notices for the list view                                                                                          │
  │                                      │ (hook)                               │                                                                                                                                                       │
  ├──────────────────────────────────────┼──────────────────────────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ use-manufacturer-primary-section.ts  │ useManufacturerPrimarySection()      │ Wraps useSingleSectionRecordController with manufacturer-specific save (PATCH via updateManufacturerRequest) and delete (DELETE via                   │   
  │                                      │ (hook)                               │ deleteManufacturerRequest); uses toManufacturerForm to derive local value                                                                             │   
  └──────────────────────────────────────┴──────────────────────────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘   
                                                                  
  components/list/                                                                                                                                                                                                                          
  
  ┌──────────────────────────┬─────────────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐   
  │           File           │                     Exports                     │                                                                        Purpose                                                                         │
  ├──────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ manufacturers-client.tsx │ ManufacturersClient (default export, client     │ List page wrapper: configures useConfiguredTableState with 5 fields (companyName groupable), renders DashboardListPageScaffold with search, sort,      │
  │                          │ component)                                      │ pagination, add-manufacturer button                                                                                                                    │
  ├──────────────────────────┼─────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ manufacturers-table.tsx  │ ManufacturersTable (named export, client        │ Table renderer: maps rows to clickable table rows with 5 columns, supports grouped rendering, shows empty state                                        │
  │                          │ component)                                      │                                                                                                                                                        │   
  └──────────────────────────┴─────────────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                                                                                                                                                                            
  components/record/                                                                                                                                                                                                                        
  
  ┌─────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐   
  │                  File                   │                                 Exports                                 │                                                     Purpose                                                     │
  ├─────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ manufacturer-detail-client.tsx          │ ManufacturerDetailClient (named export, client component)               │ Detail page wrapper: renders RecordDetailClientScaffold with title (company or agent name), delegates to        │
  │                                         │                                                                         │ ManufacturerRecordPanel                                                                                         │
  ├─────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ manufacturer-record-panel.tsx           │ ManufacturerRecordPanel (named export, client component)                │ Record panel: wires useManufacturerPrimarySection controller to RecordSingleSectionPanel with delete            │   
  │                                         │                                                                         │ confirmation message and field change handler                                                                   │   
  ├─────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ manufacturer-primary-fields-section.tsx │ ManufacturerPrimaryFieldsSection (named export, client component)       │ Form fields: Company Name (md), Agent Name (sm), Website (md), Phone (sm), Email (md) in main pane; Products    │
  │                                         │                                                                         │ count, Created, Updated as read-only side pane                                                                  │   
  ├─────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ manufacturer-create-client.tsx          │ ManufacturerCreateClient (named export, client component),              │ Create page wrapper: uses useSingleSectionCreateController with EMPTY_MANUFACTURER_FORM, calls                  │   
  │                                         │ ManufacturerCreatePanel (internal)                                      │ createManufacturerRequest, redirects to detail page on success                                                  │   
  └─────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                                                                                                                                                                            
  data/                                                           

  ┌──────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │     File     │                                                  Exports                                                   │                                                 Purpose                                                 │
  ├──────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ queries.ts   │ listManufacturers (re-export), getManufacturerById (re-export), getManufacturersPageData() (fn),           │ Server-side data loading: list wraps with Prisma connectivity handling, detail handles 404 vs error     │
  │              │ getManufacturerDetailPageData() (fn)                                                                       │ with typed PrismaDetailPageResult                                                                       │
  ├──────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────┤   
  │ mutations.ts │ createManufacturerRequest() (fn), updateManufacturerRequest() (fn), deleteManufacturerRequest() (fn)       │ Client-side mutation helpers: POST/PATCH/DELETE to /api/manufacturers endpoints, all wrap payloads with │
  │              │                                                                                                            │  withMutationMeta                                                                                       │   
  └──────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                                                                                                                                                                            
  7. Schema                                                       

  packages/db/prisma/schema.prisma — FlooringManufacturer model                                                                                                                                                                             
  
  model FlooringManufacturer {                                                                                                                                                                                                              
    id                    String            @id @default(uuid())  
    companyName           String                                                                                                                                                                                                            
    companyNameNormalized String            @unique
    agentName             String?                                                                                                                                                                                                           
    website               String?                                 
    phone                 String?                                                                                                                                                                                                           
    email                 String?                                 
    createdAt             DateTime          @default(now())
    updatedAt             DateTime          @updatedAt
    products              FlooringProduct[]
                                                                                                                                                                                                                                            
    @@map("flooring_manufacturer")
  }                                                                                                                                                                                                                                         
                                                                  
  Indexes: implicit PK on id, unique constraint on companyNameNormalized. No explicit @@index. Referenced by FlooringProduct.manufacturerId with onDelete: Restrict.                                                                        
  
  8. Tests                                                                                                                                                                                                                                  
                                                                  
  apps/web/tests/modules/manufacturers/                                                                                                                                                                                                     
  
  ┌─────────────────────────────────────────────┬───────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐   
  │                    File                     │   Test    │                                                                                  Purpose                                                                                  │
  │                                             │   Count   │                                                                                                                                                                           │
  ├─────────────────────────────────────────────┼───────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ manufacturers.test.ts                       │ 6 tests   │ Route-level tests for GET (list), POST (create with missing agentName, validation, uniqueness conflict), DELETE (blocked by linked products, success); mocks              │
  │                                             │           │ route-policy, use cases, DB, telemetry                                                                                                                                    │   
  ├─────────────────────────────────────────────┼───────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ manufacturers-primary-section-route.test.ts │ 3 tests   │ Route-level tests for PATCH: happy-path (envelope accepted, authoritative snapshot returned), stale revision conflict (409), validation failure (400); mocks same         │   
  │                                             │           │ infrastructure                                                                                                                                                            │   
  ├─────────────────────────────────────────────┼───────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ manufacturers-client.test.tsx               │ 4 tests   │ Component-level tests (jsdom): add button routes to /new, row click routes to detail, detail save with validation error display, detail save with transport error         │   
  │                                             │           │ display; mocks requestJson and Next navigation                                                                                                                            │   
  └─────────────────────────────────────────────┴───────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                                                                                                                                                                            
                                      