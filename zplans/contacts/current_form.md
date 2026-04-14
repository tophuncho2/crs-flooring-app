Part A — Manufacturers Reference Pattern (condensed)                                                                                                                                                                                    
                                                                                                                                                                                                                                            
  Domain (packages/domain/src/flooring/manufacturers/): Pure shapes + predicates only — ManufacturerRow, ManufacturerForm, EMPTY_MANUFACTURER_FORM, toManufacturerForm(), normalizeManufacturerCompanyNameForUniqueness(),                  
  isManufacturerDeleteBlocked(). No DB, no validation functions.                                                                                                                                                                            
                                                                                                                                                                                                                                            
  Application (packages/application/src/flooring/manufacturers/): ManufacturerExecutionError with union-typed ManufacturerErrorCode; types.ts with Input/Result aliases; one file per use case (create-/update-/delete-manufacturer.ts),    
  each wrapping withDatabaseTransaction and accepting optional client?: Prisma.TransactionClient; catches P2002 for uniqueness.                                                                                                             
                                                                                                                                                                                                                                            
  Data (packages/db/src/flooring/manufacturers/): Split read/write repos. Reads = list/getById/existence/delete-state with normalizers. Writes return normalized records. Every fn accepts optional client.                                 
                                                                                                                                                                                                                                            
  Route (apps/web/app/api/manufacturers/): route.ts (GET/POST), [id]/route.ts (DELETE), [id]/primary/section/route.ts (PATCH), _validators.ts with validateManufacturerInput(). Universal applyRoutePolicy({ capability: "system.access" }),
   parseUuidParam, full mutation lifecycle (parseMutationEnvelope → enforceMutationReceipt → withMutationTelemetry → finalizeMutationReceipt), assertExpectedUpdatedAt, routeJson/routeError.                                               
                                                                                                                                                                                                                                            
  Page (apps/web/app/dashboard/manufacturers/): Three async Server Components (page.tsx, [id]/page.tsx, new/page.tsx); fetch via getManufacturersPageData/getManufacturerDetailPageData; notFound() for 404.                                
   
  Module (apps/web/modules/manufacturers/): controller/, components/list/, components/record/, data/ (queries bridges to @builders/db; mutations wrap payloads with withMutationMeta and POST/PATCH/DELETE).                                
                                                                  
  Schema: FlooringManufacturer with normalized uniqueness column (companyNameNormalized @unique), explicit indexes, onDelete: Restrict to FlooringProduct[].                                                                                
                                                                  
  Tests: Mock at the package boundary (@builders/application, @builders/db), not module bridges. Vitest hoisted mocks; full mutation lifecycle covered.                                                                                     
                                                                  
  ---                                                                                                                                                                                                                                       
  Part B — Contacts Gap List (by severity)                        
                                                                                                                                                                                                                                            
  Critical (layer boundary violations)
                                                                                                                                                                                                                                            
  1. Missing transaction client propagation — packages/application/src/flooring/contacts/create-contact.ts, update-contact.ts: no client?: Prisma.TransactionClient parameter. Violates manufacturers' use-case contract.                   
  2. Error code is bare string, not union — packages/application/src/flooring/contacts/errors.ts: no ContactErrorCode union constraining ContactExecutionError. Violates ManufacturerErrorCode reference.                                   
  3. Mixed authorization — apps/web/app/api/contacts/route.ts GET uses legacy authorizeContactsRoute() while POST uses applyRoutePolicy(). Manufacturers use applyRoutePolicy universally.                                                  
  4. Missing capability: "system.access" on every mutation — apps/web/app/api/contacts/route.ts POST and [id]/route.ts PATCH/DELETE. Manufacturers require it on all mutations.                                                             
  5. Validation functions live in domain layer — packages/domain/src/flooring/contacts/types.ts exports validateContactType() and validateContactForm(). Per DOMAIN.md, domain holds pure predicates/shapes only; validation belongs in     
  route/application.                                                                                                                                                                                                                        
                                                                                                                                                                                                                                            
  Structural (naming & organization)                                                                                                                                                                                                        
                                                                  
  6. No _validators.ts — apps/web/app/api/contacts/: parseContactType() duplicated inline in route.ts and [id]/route.ts. Manufacturers centralize in _validators.ts with validateManufacturerInput().                                       
  7. Missing parseUuidParam — apps/web/app/api/contacts/[id]/route.ts: id destructured directly from params, not validated as UUID.
  8. No [id]/primary/section/route.ts split — Contacts collapse PATCH+DELETE on [id]/route.ts. Manufacturers separate PATCH onto [id]/primary/section/route.ts. Mutations helper updateContactRequest therefore PATCHes /api/contacts/${id} 
  rather than the scoped section endpoint.                                                                                                                                                                                                  
  9. Inconsistent query result wrapping — apps/web/modules/contacts/data/queries.ts: listContacts returns raw ContactRecord[] while getContactsPageData wraps in PrismaPageDataResult.                                                      
                                                                                                                                                                                                                                            
  Polish (tests, cleanup)                                                                                                                                                                                                                   
                                                                                                                                                                                                                                            
  10. Tests mock the wrong boundary — apps/web/tests/modules/contacts/contacts-routes.test.ts mocks @/modules/contacts/data/queries instead of @builders/db/@builders/application. Manufacturers tests mock at the package boundary.        
                                                                  
  ---                                                                                                                                                                                                                                       
  Part C — current_form.md (paste-ready)                          
                                                                                                                                                                                                                                            
  # Contacts Module — Current Form
                                                                                                                                                                                                                                            
  ## 1. Domain Layer                                              
                                                                                                                                                                                                                                            
  `packages/domain/src/flooring/contacts/`                                                                                                                                                                                                  
   
  | File | Exports | Purpose |                                                                                                                                                                                                              
  |------|---------|---------|                                    
  | types.ts | `ContactType`, `CONTACT_TYPE_OPTIONS`, `CONTACT_TYPE_LABELS`, `ContactRow`, `ContactDetail`, `ContactForm`, `EMPTY_CONTACT_FORM`, `validateContactType()`, `validateContactForm()`, `toContactForm()` | Shapes + form        
  helpers. **GAP:** `validateContactType` and `validateContactForm` are validation functions; per `DOMAIN.md` they belong in route or application layer, not domain. |                                                                      
  | delete-rules.ts | `ContactDeleteLinkState`, `isContactDeleteBlocked()`, `getContactDeleteBlockedMessage()` | Delete guards for templates / work orders. |                                                                               
  | index.ts | Barrel | — |                                                                                                                                                                                                                 
                                                                                                                                                                                                                                            
  **GAP:** No uniqueness normalizer (manufacturers ship `normalizeManufacturerCompanyNameForUniqueness`). Only relevant if contacts add a unique field.                                                                                     
                                                                                                                                                                                                                                            
  ## 2. Application Layer                                                                                                                                                                                                                   
                                                                  
  `packages/application/src/flooring/contacts/`

  | File | Exports | Purpose |
  |------|---------|---------|
  | errors.ts | `ContactExecutionError` | Typed error. **GAP:** `code` is bare `string`; manufacturers constrain via `ManufacturerErrorCode` union. |
  | types.ts | `CreateContactInput`, `UpdateContactInput`, `ContactResult` | Input/result aliases. |                                                                                                                                        
  | create-contact.ts | `createContactUseCase()` | **GAP:** does not accept optional `client?: Prisma.TransactionClient` — breaks transaction composition contract. |                                                                       
  | update-contact.ts | `updateContactUseCase()` | **GAP:** same — no optional `client` parameter. |                                                                                                                                        
  | delete-contact.ts | `deleteContactUseCase()` | Wraps in `withDatabaseTransaction`; existence (404) + linkage (409) checks. |                                                                                                            
  | index.ts | Barrel | — |                                                                                                                                                                                                                 
                                                                                                                                                                                                                                            
  ## 3. Data Layer                                                                                                                                                                                                                          
                                                                  
  `packages/db/src/flooring/contacts/`

  | File | Exports | Purpose |                                                                                                                                                                                                              
  |------|---------|---------|
  | read-repository.ts | `ContactRecord`, `ContactDeleteStateResult`, `normalizeContactRow()`, `normalizeContactDetail()`, `listContacts()`, `listSalesRepContactOptions()`, `getContactById()`, `getContactDeleteState()` | Reads +        
  normalizers. |                                                                                                                                                                                                                            
  | write-repository.ts | `createContactRecord()`, `updateContactRecord()`, `deleteContactRecordById()` | Writes return normalized records (delete returns void). |
  | index.ts | Barrel | — |                                                                                                                                                                                                                 
                                                                  
  ## 4. Route Layer                                                                                                                                                                                                                         
                                                                  
  `apps/web/app/api/contacts/`

  | File | Exports | Purpose |
  |------|---------|---------|
  | route.ts | `GET`, `POST` | **GAP:** GET uses legacy `authorizeContactsRoute()` instead of `applyRoutePolicy()`. POST uses `applyRoutePolicy()` but **GAP:** missing `capability: "system.access"`; **GAP:** inline `parseContactType()` 
  validation. |                                                                                                                                                                                                                             
  | [id]/route.ts | `PATCH`, `DELETE` | Full mutation lifecycle with `assertExpectedUpdatedAt`. **GAP:** missing `capability: "system.access"` on both. **GAP:** `id` not validated with `parseUuidParam()`. **GAP:** duplicated            
  `parseContactType()` from `route.ts`. |                                                                                                                                                                                                   
  | _validators.ts | — | **GAP:** file does not exist. Manufacturers centralize via `validateManufacturerInput()`. |
  | [id]/primary/section/route.ts | — | **GAP:** missing. Manufacturers split PATCH onto a scoped endpoint; contacts PATCH on `[id]/route.ts`. |                                                                                            
                                                                                                                                                                                                                                            
  ## 5. Page Layer                                                                                                                                                                                                                          
                                                                                                                                                                                                                                            
  `apps/web/app/dashboard/contacts/`                              

  | File | Exports | Purpose |
  |------|---------|---------|
  | page.tsx | `ContactsPage` | List page; loads table prefs, parses server table state (groups by type), fetches `getContactsPageData`. |
  | [id]/page.tsx | `ContactDetailPage` | Detail page; `notFound()` on 404; passes back-href from `returnTo`. |                                                                                                                             
  | new/page.tsx | `ContactCreatePage` | Create page wrapper. |                                                                                                                                                                             
                                                                                                                                                                                                                                            
  No structural gaps.                                                                                                                                                                                                                       
                                                                                                                                                                                                                                            
  ## 6. Module Layer                                              
                                                                                                                                                                                                                                            
  `apps/web/modules/contacts/`
                                                                                                                                                                                                                                            
  ### controller/                                                 

  | File | Exports | Purpose |
  |------|---------|---------|
  | use-contacts-list-controller.ts | `useContactsListController()` | List rows + record notices. |
  | use-contact-primary-section.ts | `useContactPrimarySection()` | Wraps `useSingleSectionRecordController`; PATCH via `updateContactRequest`, DELETE via `deleteContactRequest`. |                                                        
                                                                                                                                                                                                                                            
  ### components/list/                                                                                                                                                                                                                      
                                                                                                                                                                                                                                            
  | File | Exports | Purpose |                                    
  |------|---------|---------|
  | contacts-client.tsx | `ContactsClient` | List page wrapper with `DashboardListPageScaffold`. |                                                                                                                                          
  | contacts-table.tsx | `ContactsTable` | Table renderer with grouping + empty state. |                                                                                                                                                    
                                                                                                                                                                                                                                            
  ### components/record/                                                                                                                                                                                                                    
                                                                                                                                                                                                                                            
  | File | Exports | Purpose |                                    
  |------|---------|---------|                                                                                                                                                                                                              
  | contact-detail-client.tsx | `ContactDetailClient` | Detail page wrapper. |
  | contact-record-panel.tsx | `ContactRecordPanel` | Wires controller to `RecordSingleSectionPanel`. |                                                                                                                                     
  | contact-primary-fields-section.tsx | `ContactPrimaryFieldsSection` | Form fields (Name, Type) + read-only side pane. |                                                                                                                  
  | contact-create-client.tsx | `ContactCreateClient` | Create page wrapper using `useSingleSectionCreateController`. |                                                                                                                     
                                                                                                                                                                                                                                            
  ### data/                                                                                                                                                                                                                                 
                                                                                                                                                                                                                                            
  | File | Exports | Purpose |                                    
  |------|---------|---------|                                                                                                                                                                                                              
  | queries.ts | `listContacts` (re-export), `listSalesRepContactOptions` (re-export), `getContactById` (re-export), `getContactsPageData()`, `getContactDetailPageData()` | Server-side bridge. **GAP:** `listContacts` returns 
  `ContactRecord[]` directly while `getContactsPageData` wraps in `PrismaPageDataResult` — inconsistent. |                                                                                                                                  
  | mutations.ts | `createContactRequest()`, `updateContactRequest()`, `deleteContactRequest()` | All wrap payloads via `withMutationMeta`. **GAP:** `updateContactRequest` PATCHes `/api/contacts/${id}` rather than 
  `/api/contacts/${id}/primary/section`. |                                                                                                                                                                                                  
                                                                  
  ## 7. Schema                                                                                                                                                                                                                              
                                                                  
  `packages/db/prisma/schema.prisma`

  ```prisma
  model FlooringContact {                                                                                                                                                                                                                   
    id                 String                      @id @default(uuid())
    name               String                                                                                                                                                                                                               
    type               FlooringContactType                                                                                                                                                                                                  
    createdAt          DateTime                    @default(now())
    updatedAt          DateTime                    @updatedAt                                                                                                                                                                               
    templateSalesReps  FlooringTemplateSalesRep[]                                                                                                                                                                                           
    workOrderSalesReps FlooringWorkOrderSalesRep[]
                                                                                                                                                                                                                                            
    @@index([name])                                               
    @@index([type])                                                                                                                                                                                                                         
    @@map("flooring_contact")                                     
  }                                                                                                                                                                                                                                         
  ```                                                             

  **GAP:** No uniqueness constraint and no normalized column. May be intentional (contacts have no unique field); confirm in domain rules.                                                                                                  
   
  ## 8. Tests                                                                                                                                                                                                                               
                                                                  
  `apps/web/tests/modules/contacts/`

  | File | Purpose |
  |------|---------|
  | contacts-routes.test.ts | Route-level tests for GET/POST/PATCH/DELETE. **GAP:** mocks `@/modules/contacts/data/queries` instead of `@builders/db` / `@builders/application` — wrong mock boundary vs manufacturers. |
  | contacts-application.test.ts | Application-layer use case tests. |                                                                                                                                                                      
  | contact-form-validation.test.ts | Form validation tests. |
  | contact-service-delete-rules.test.ts | Domain delete-rules tests. |                                                                                                                                                                     
                                                                                                                                                                                                                                            
