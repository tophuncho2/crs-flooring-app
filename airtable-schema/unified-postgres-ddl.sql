BEGIN;

CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS flooring;
CREATE SCHEMA IF NOT EXISTS construction;
CREATE SCHEMA IF NOT EXISTS reporting;
CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS sync;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Core enums
DO $$ BEGIN
  CREATE TYPE core.module_code AS ENUM ('flooring','construction');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE core.org_type AS ENUM ('management_company','vendor','internal','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Flooring enums
DO $$ BEGIN
  CREATE TYPE flooring.work_order_status AS ENUM
    ('building_order','pending','carpet_cleaning','pull_template','modify','sent_out');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flooring.vacancy_status AS ENUM ('vacant','occupied');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flooring.change_order_status AS ENUM ('shortage','sufficient');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flooring.import_transport_type AS ENUM ('purchase_order','return','warehouse_transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flooring.import_status AS ENUM ('pending_delivery','final');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE flooring.store_code AS ENUM ('darby','columbia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Construction enums
DO $$ BEGIN
  CREATE TYPE construction.job_status AS ENUM
    ('flagged','pending_job','active_contracts','awaiting_payment','pending_invoiced','overhead_2026','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE construction.job_type AS ENUM ('construction','overhead_cost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE construction.scope_type AS ENUM ('material','labor','deposit','rental','planning','final_deposit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE construction.deposit_type AS ENUM ('first_deposit','second_deposit','third_deposit','final_pay');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE construction.pending_payment_status AS ENUM ('pending_payment','complete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE construction.receipt_approval_status AS ENUM ('approved','denied','pending','confirm_price','flag');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE construction.vendor_type AS ENUM
    ('crs','labor_vendor','material_vendor','job_vendor','rental_vendor','platform');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE construction.file_stage AS ENUM ('pending','prepare','filed','paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE construction.agreement_status AS ENUM ('pending_build','ready_for_send','sent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE construction.store_name AS ENUM ('home_depot','sherwin_williams');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS core.module (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code core.module_code NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.organization (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  org_type core.org_type NOT NULL,
  phone text,
  email text,
  website text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.property (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  street_address text,
  city text,
  state text,
  postal_code text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text,
  phone text,
  email text,
  vendor_org_id uuid REFERENCES core.organization(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  display_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.role (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text NOT NULL UNIQUE,
  description text
);

CREATE TABLE IF NOT EXISTS core.permission (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text NOT NULL UNIQUE,
  description text
);

CREATE TABLE IF NOT EXISTS core.role_permission (
  role_id uuid NOT NULL REFERENCES core.role(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES core.permission(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS core.user_role (
  user_id uuid NOT NULL REFERENCES core.app_user(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES core.role(id) ON DELETE CASCADE,
  module_id uuid REFERENCES core.module(id),
  property_id uuid REFERENCES core.property(id),
  PRIMARY KEY (user_id, role_id, module_id, property_id)
);

CREATE TABLE IF NOT EXISTS core.attachment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key text NOT NULL,
  original_filename text,
  content_type text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS core.audit_event (
  id bigserial PRIMARY KEY,
  module_id uuid REFERENCES core.module(id),
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  actor_user_id uuid REFERENCES core.app_user(id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Airtable lineage mapping
CREATE TABLE IF NOT EXISTS sync.airtable_ref (
  id bigserial PRIMARY KEY,
  module_code core.module_code NOT NULL,
  source_table_id text NOT NULL,
  source_table_name text NOT NULL,
  source_record_id text NOT NULL,
  target_schema text NOT NULL,
  target_table text NOT NULL,
  target_pk uuid,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_code, source_table_id, source_record_id)
);

-- Staging raw landing table
CREATE TABLE IF NOT EXISTS staging.airtable_record (
  id bigserial PRIMARY KEY,
  module_code core.module_code NOT NULL,
  table_id text NOT NULL,
  table_name text NOT NULL,
  record_id text NOT NULL,
  created_time timestamptz,
  raw jsonb NOT NULL,
  loaded_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_code, table_id, record_id)
);

-- Flooring domain
CREATE TABLE IF NOT EXISTS flooring.management_company (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid UNIQUE REFERENCES core.organization(id) ON DELETE CASCADE,
  name text NOT NULL,
  street_address text,
  city text,
  state text,
  postal_code text,
  phone text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flooring.property_management (
  property_id uuid NOT NULL REFERENCES core.property(id) ON DELETE CASCADE,
  management_company_id uuid NOT NULL REFERENCES flooring.management_company(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, management_company_id)
);

CREATE TABLE IF NOT EXISTS flooring.category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category_code integer,
  send_unit text,
  stock_unit text,
  coverage_available_unit text,
  item_coverage_unit text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flooring.manufacturer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  agent_name text,
  website text,
  agent_phone text,
  agent_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flooring.style (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  manufacturer_id uuid REFERENCES flooring.manufacturer(id),
  category_id uuid REFERENCES flooring.category(id)
);

CREATE TABLE IF NOT EXISTS flooring.product (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES flooring.category(id),
  manufacturer_id uuid REFERENCES flooring.manufacturer(id),
  style_id uuid REFERENCES flooring.style(id),
  color text,
  width text,
  sheet_size text,
  thickness text,
  unit_weight text,
  base_color text,
  coverage_per_unit numeric(12,4),
  cost numeric(12,2),
  is_public boolean NOT NULL DEFAULT false,
  notes text,
  sub_order text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flooring.template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES core.property(id),
  template_tag text NOT NULL,
  store flooring.store_code,
  instructions text,
  template_notes text,
  pad_product_id uuid REFERENCES flooring.product(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flooring.template_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES flooring.template(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES flooring.product(id),
  quantity numeric(12,2) NOT NULL,
  notes text,
  stored_dye_lot text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flooring.warehouse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  address text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flooring.section (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES flooring.warehouse(id) ON DELETE CASCADE,
  name text NOT NULL,
  UNIQUE (warehouse_id, name)
);

CREATE TABLE IF NOT EXISTS flooring.location (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid NOT NULL REFERENCES flooring.warehouse(id) ON DELETE CASCADE,
  section_id uuid REFERENCES flooring.section(id),
  location_code text NOT NULL,
  UNIQUE (warehouse_id, location_code)
);

CREATE TABLE IF NOT EXISTS flooring.import_batch (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id uuid REFERENCES flooring.warehouse(id),
  import_number bigint,
  import_tag text,
  transport_type flooring.import_transport_type,
  status flooring.import_status,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flooring.inventory_lot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES flooring.product(id),
  warehouse_id uuid REFERENCES flooring.warehouse(id),
  location_id uuid REFERENCES flooring.location(id),
  import_batch_id uuid REFERENCES flooring.import_batch(id),
  item_number text,
  dye_lot text,
  stock_count numeric(14,4) NOT NULL DEFAULT 0,
  stock_unit text,
  coverage_per_unit numeric(14,4),
  coverage_available numeric(14,4),
  cost numeric(12,2),
  freight numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flooring.work_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES core.property(id),
  template_id uuid REFERENCES flooring.template(id),
  warehouse_id uuid REFERENCES flooring.warehouse(id),
  status flooring.work_order_status NOT NULL,
  vacancy flooring.vacancy_status,
  scheduled_for date,
  unit_label text,
  custom_address text,
  instructions text,
  template_notes text,
  google_drive_order_slip text,
  google_doc_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flooring.work_order_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES flooring.work_order(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES flooring.product(id),
  quantity numeric(12,2) NOT NULL,
  notes text,
  change_order_status flooring.change_order_status,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flooring.inventory_reservation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_item_id uuid NOT NULL REFERENCES flooring.work_order_item(id) ON DELETE CASCADE,
  inventory_lot_id uuid NOT NULL REFERENCES flooring.inventory_lot(id),
  quantity numeric(12,4) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flooring.inventory_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_lot_id uuid NOT NULL REFERENCES flooring.inventory_lot(id),
  work_order_id uuid REFERENCES flooring.work_order(id),
  cut_amount numeric(12,4),
  before_amount numeric(12,4),
  after_amount numeric(12,4),
  waste_reason text,
  waste_amount numeric(12,4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Construction domain
CREATE TABLE IF NOT EXISTS construction.vendor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid UNIQUE REFERENCES core.organization(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  vendor_type construction.vendor_type,
  phone text,
  email text,
  website text,
  sub_agreement_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction.vendor_property (
  vendor_id uuid NOT NULL REFERENCES construction.vendor(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES core.property(id) ON DELETE CASCADE,
  PRIMARY KEY (vendor_id, property_id)
);

CREATE TABLE IF NOT EXISTS construction.unit_level (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS construction.room (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS construction.service_type (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS construction.job (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES core.property(id),
  unit_level_id uuid REFERENCES construction.unit_level(id),
  job_tag text,
  status construction.job_status NOT NULL,
  job_type construction.job_type NOT NULL DEFAULT 'construction',
  starting_budget numeric(14,2),
  revenue numeric(14,2),
  running_budget numeric(14,2),
  expense_total numeric(14,2),
  pending_expenses numeric(14,2),
  budget_remaining numeric(14,2),
  anticipated_profit numeric(14,2),
  anticipated_margin numeric(8,4),
  current_profit numeric(14,2),
  current_margin numeric(8,4),
  final_profit numeric(14,2),
  final_margin numeric(8,4),
  billing_assignee_user_id uuid REFERENCES core.app_user(id),
  on_site_contact text,
  on_site_phone text,
  billing_info text,
  docusketch_url text,
  full_job_file_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction.job_vendor (
  job_id uuid NOT NULL REFERENCES construction.job(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES construction.vendor(id) ON DELETE CASCADE,
  PRIMARY KEY (job_id, vendor_id)
);

CREATE TABLE IF NOT EXISTS construction.job_scope (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES construction.job(id) ON DELETE CASCADE,
  service_type_id uuid REFERENCES construction.service_type(id),
  unit_level_id uuid REFERENCES construction.unit_level(id),
  room_id uuid REFERENCES construction.room(id),
  vendor_id uuid REFERENCES construction.vendor(id),
  scope_name text,
  scope_type construction.scope_type,
  vacancy boolean,
  status_complete boolean NOT NULL DEFAULT false,
  notes text,
  start_date date,
  end_date date,
  price numeric(14,2),
  unit_count numeric(12,2),
  estimated_rehab_budget numeric(14,2),
  contracted_cost numeric(14,2),
  estimated_duration_days int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction.job_scope_dependency (
  scope_id uuid NOT NULL REFERENCES construction.job_scope(id) ON DELETE CASCADE,
  depends_on_scope_id uuid NOT NULL REFERENCES construction.job_scope(id) ON DELETE CASCADE,
  PRIMARY KEY (scope_id, depends_on_scope_id),
  CHECK (scope_id <> depends_on_scope_id)
);

CREATE TABLE IF NOT EXISTS construction.bid (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_scope_id uuid NOT NULL REFERENCES construction.job_scope(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES construction.vendor(id),
  bid_amount numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction.subcontract_agreement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES construction.job(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES construction.vendor(id),
  status construction.agreement_status NOT NULL,
  agreement_date date,
  full_budget numeric(14,2),
  print_signature text,
  agreement_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction.subcontract_scope (
  agreement_id uuid NOT NULL REFERENCES construction.subcontract_agreement(id) ON DELETE CASCADE,
  scope_id uuid NOT NULL REFERENCES construction.job_scope(id) ON DELETE CASCADE,
  PRIMARY KEY (agreement_id, scope_id)
);

CREATE TABLE IF NOT EXISTS construction.pending_payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES construction.job(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES construction.vendor(id),
  agreement_id uuid REFERENCES construction.subcontract_agreement(id),
  amount numeric(14,2) NOT NULL,
  status construction.pending_payment_status NOT NULL,
  deposit_type construction.deposit_type,
  completion_required_pct numeric(6,4),
  notes text,
  requested_by_name text,
  created_by_user_id uuid REFERENCES core.app_user(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction.labor_payment_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES construction.job(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES construction.vendor(id),
  agreement_id uuid REFERENCES construction.subcontract_agreement(id),
  file_stage construction.file_stage,
  status text,
  amount numeric(14,2),
  notes text,
  requested_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction.receipt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES construction.job(id),
  approved construction.receipt_approval_status,
  confirmed boolean NOT NULL DEFAULT false,
  total_cost numeric(14,2),
  store construction.store_name,
  receipt_number text,
  po_or_job_name text,
  purchase_date date,
  payment_method text,
  store_address text,
  notes text,
  tagged_by_user_id uuid REFERENCES core.app_user(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction.expense (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES construction.job(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES construction.vendor(id),
  receipt_id uuid REFERENCES construction.receipt(id),
  amount numeric(14,2) NOT NULL,
  expense_type text,
  payment_type text,
  payment_date date,
  receipt_number text,
  receipt_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction.accounts_receivable (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES construction.job(id) ON DELETE CASCADE,
  draw_amount numeric(14,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction.budget_increase (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES construction.job(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  status text,
  notes text,
  job_number text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction.checklist_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES construction.job(id) ON DELETE CASCADE,
  checklist_item text NOT NULL,
  status boolean NOT NULL DEFAULT false,
  notes text,
  assigned_to_user_id uuid REFERENCES core.app_user(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS construction.timesheet_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  laborer_contact_id uuid REFERENCES core.contact(id),
  service_type_id uuid REFERENCES construction.service_type(id),
  start_time timestamptz,
  end_time timestamptz,
  lunch_duration_seconds int,
  contractor_rate numeric(12,2),
  billing_rate numeric(12,2),
  total_seconds_worked int,
  contractor_total numeric(12,2),
  billing_total numeric(12,2),
  profit numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Reporting views replacing Airtable formula/rollup fields
CREATE OR REPLACE VIEW reporting.flooring_product_stock AS
SELECT
  p.id AS product_id,
  COALESCE(SUM(il.stock_count),0) AS total_stock,
  COALESCE(SUM(il.coverage_available),0) AS total_coverage,
  COALESCE(SUM(CASE WHEN w.name ILIKE 'darby%' THEN il.stock_count ELSE 0 END),0) AS darby_stock,
  COALESCE(SUM(CASE WHEN w.name ILIKE 'columbia%' THEN il.stock_count ELSE 0 END),0) AS columbia_stock
FROM flooring.product p
LEFT JOIN flooring.inventory_lot il ON il.product_id = p.id
LEFT JOIN flooring.warehouse w ON w.id = il.warehouse_id
GROUP BY p.id;

CREATE OR REPLACE VIEW reporting.construction_job_financials AS
SELECT
  j.id AS job_id,
  j.revenue,
  COALESCE(SUM(e.amount),0) AS expense_total_derived,
  COALESCE(SUM(pp.amount) FILTER (WHERE pp.status = 'pending_payment'),0) AS pending_payment_total,
  (j.revenue - COALESCE(SUM(e.amount),0)) AS current_profit_derived,
  CASE WHEN COALESCE(j.revenue,0) = 0 THEN 0
       ELSE (j.revenue - COALESCE(SUM(e.amount),0)) / j.revenue END AS current_margin_derived
FROM construction.job j
LEFT JOIN construction.expense e ON e.job_id = j.id
LEFT JOIN construction.pending_payment pp ON pp.job_id = j.id
GROUP BY j.id;

CREATE OR REPLACE VIEW reporting.construction_scope_progress AS
SELECT
  s.job_id,
  COUNT(*) AS scope_count,
  SUM(CASE WHEN s.status_complete THEN 1 ELSE 0 END) AS complete_count,
  CASE WHEN COUNT(*) = 0 THEN 0
       ELSE SUM(CASE WHEN s.status_complete THEN 1 ELSE 0 END)::numeric / COUNT(*)::numeric END AS progress_ratio
FROM construction.job_scope s
GROUP BY s.job_id;

CREATE INDEX IF NOT EXISTS idx_staging_airtable_record_lookup
  ON staging.airtable_record (module_code, table_id, record_id);

CREATE INDEX IF NOT EXISTS idx_sync_airtable_ref_lookup
  ON sync.airtable_ref (module_code, source_table_id, source_record_id);

COMMIT;
