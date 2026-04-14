--
-- PostgreSQL database dump
--

\restrict SYDGhn5vxKjkBBvBj4MP2g7fN4m7KZ8FKpdMezUhgnhrN7pKtXSA4ZqLuouQLpH

-- Dumped from database version 17.7 (Debian 17.7-3.pgdg13+1)
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: FlooringAllocationMethod; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FlooringAllocationMethod" AS ENUM (
    'MANUAL',
    'AUTO'
);


ALTER TYPE public."FlooringAllocationMethod" OWNER TO postgres;

--
-- Name: FlooringChangeOrderStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FlooringChangeOrderStatus" AS ENUM (
    'SHORTAGE',
    'SUFFICIENT'
);


ALTER TYPE public."FlooringChangeOrderStatus" OWNER TO postgres;

--
-- Name: FlooringContactType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FlooringContactType" AS ENUM (
    'SALES_REP',
    'CONTRACTOR',
    'OTHER'
);


ALTER TYPE public."FlooringContactType" OWNER TO postgres;

--
-- Name: FlooringStoreCode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FlooringStoreCode" AS ENUM (
    'DARBY',
    'COLUMBIA'
);


ALTER TYPE public."FlooringStoreCode" OWNER TO postgres;

--
-- Name: FlooringVacancyStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FlooringVacancyStatus" AS ENUM (
    'VACANT',
    'OCCUPIED'
);


ALTER TYPE public."FlooringVacancyStatus" OWNER TO postgres;

--
-- Name: FlooringWorkOrderAllocationRunStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FlooringWorkOrderAllocationRunStatus" AS ENUM (
    'REQUESTED',
    'QUEUED',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'SUPERSEDED'
);


ALTER TYPE public."FlooringWorkOrderAllocationRunStatus" OWNER TO postgres;

--
-- Name: FlooringWorkOrderItemAllocationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FlooringWorkOrderItemAllocationStatus" AS ENUM (
    'NOT_STARTED',
    'PARTIALLY_ALLOCATED',
    'FULLY_ALLOCATED',
    'SHORTAGE'
);


ALTER TYPE public."FlooringWorkOrderItemAllocationStatus" OWNER TO postgres;

--
-- Name: FlooringWorkOrderStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."FlooringWorkOrderStatus" AS ENUM (
    'BUILDING_ORDER',
    'PENDING_EXPORT',
    'CARPET_CLEANING',
    'SENT_OUT',
    'PENDING',
    'PULL_TEMPLATE',
    'MODIFY'
);


ALTER TYPE public."FlooringWorkOrderStatus" OWNER TO postgres;

--
-- Name: QueueOutboxEventStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."QueueOutboxEventStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'DISPATCHED',
    'EXHAUSTED'
);


ALTER TYPE public."QueueOutboxEventStatus" OWNER TO postgres;

--
-- Name: Role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."Role" AS ENUM (
    'CONTRACTOR',
    'CUSTOMER',
    'OWNER',
    'ADMIN',
    'BUILDER'
);


ALTER TYPE public."Role" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    password text,
    role public."Role" DEFAULT 'CUSTOMER'::public."Role" NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "hiddenFlooringNavSlugs" text[] DEFAULT ARRAY[]::text[],
    "flooringNavOrderSlugs" text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: UserLoginActivity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserLoginActivity" (
    id text NOT NULL,
    "userId" text,
    "userEmail" text NOT NULL,
    "loggedInAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."UserLoginActivity" OWNER TO postgres;

--
-- Name: UserTablePreference; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserTablePreference" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tableKey" text NOT NULL,
    "hiddenColumnKeys" text[] DEFAULT ARRAY[]::text[],
    "columnOrderKeys" text[] DEFAULT ARRAY[]::text[],
    "isAscendingSort" boolean DEFAULT true NOT NULL,
    "isGroupingEnabled" boolean DEFAULT false NOT NULL,
    "groupByKeys" text[] DEFAULT ARRAY[]::text[],
    "filtersJson" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."UserTablePreference" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: app_mutation_receipt; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.app_mutation_receipt (
    id text NOT NULL,
    scope text NOT NULL,
    "userId" text NOT NULL,
    "idempotencyKey" text NOT NULL,
    "requestHash" text NOT NULL,
    "responseStatus" integer,
    "responseBodyJson" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.app_mutation_receipt OWNER TO postgres;

--
-- Name: flooring_analytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_analytics (
    id text NOT NULL,
    "workOrderId" text NOT NULL,
    "totalMaterialCost" numeric(12,2) NOT NULL,
    "totalServiceCost" numeric(12,2) NOT NULL,
    "totalCost" numeric(12,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.flooring_analytics OWNER TO postgres;

--
-- Name: flooring_category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_category (
    id text NOT NULL,
    name text NOT NULL,
    "categoryCode" integer,
    "sendUnitId" text,
    "stockUnitId" text,
    "coverageAvailableUnitId" text,
    "itemCoverageUnitId" text,
    "serviceUnitId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.flooring_category OWNER TO postgres;

--
-- Name: flooring_contact; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_contact (
    id text NOT NULL,
    name text NOT NULL,
    type public."FlooringContactType" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.flooring_contact OWNER TO postgres;

--
-- Name: flooring_cut_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_cut_log (
    id text NOT NULL,
    "inventoryId" text NOT NULL,
    "workOrderId" text,
    "workOrderItemId" text,
    before numeric(12,2) NOT NULL,
    cut numeric(12,2) NOT NULL,
    after numeric(12,2) NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.flooring_cut_log OWNER TO postgres;

--
-- Name: flooring_import_entry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_import_entry (
    id text NOT NULL,
    "importNumber" integer NOT NULL,
    "orderNumber" text,
    tag text,
    "transportType" text NOT NULL,
    status text NOT NULL,
    "warehouseId" text,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.flooring_import_entry OWNER TO postgres;

--
-- Name: flooring_import_entry_importNumber_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."flooring_import_entry_importNumber_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."flooring_import_entry_importNumber_seq" OWNER TO postgres;

--
-- Name: flooring_import_entry_importNumber_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."flooring_import_entry_importNumber_seq" OWNED BY public.flooring_import_entry."importNumber";


--
-- Name: flooring_inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_inventory (
    id text NOT NULL,
    "importEntryId" text,
    "productId" text NOT NULL,
    "itemNumber" text NOT NULL,
    "dyeLot" text,
    "locationId" text,
    "stockCount" numeric(12,2) NOT NULL,
    cost numeric(10,2),
    freight numeric(10,2),
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "reservedStockCount" numeric(12,2) DEFAULT 0 NOT NULL,
    "fifoReceivedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.flooring_inventory OWNER TO postgres;

--
-- Name: flooring_location; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_location (
    id text NOT NULL,
    "warehouseId" text NOT NULL,
    "sectionId" text NOT NULL,
    "locationCode" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.flooring_location OWNER TO postgres;

--
-- Name: flooring_management_company; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_management_company (
    id text NOT NULL,
    name text NOT NULL,
    "streetAddress" text,
    city text,
    state text,
    "postalCode" text,
    phone text,
    email text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.flooring_management_company OWNER TO postgres;

--
-- Name: flooring_manufacturer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_manufacturer (
    id text NOT NULL,
    "companyName" text NOT NULL,
    "agentName" text,
    website text,
    phone text,
    email text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "companyNameNormalized" text NOT NULL
);


ALTER TABLE public.flooring_manufacturer OWNER TO postgres;

--
-- Name: flooring_product; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_product (
    id text NOT NULL,
    name text DEFAULT ''::text NOT NULL,
    "categoryId" text NOT NULL,
    manufacturer text,
    "manufacturerId" text,
    style text,
    color text,
    width text,
    "sheetSize" text,
    thickness text,
    "unitWeight" text,
    "baseColor" text,
    "coveragePerUnit" numeric(12,4),
    "photoUrls" text[] DEFAULT ARRAY[]::text[],
    cost numeric(10,2),
    "isPublic" boolean DEFAULT false NOT NULL,
    notes text,
    "subOrder" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.flooring_product OWNER TO postgres;

--
-- Name: flooring_section; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_section (
    id text NOT NULL,
    "warehouseId" text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.flooring_section OWNER TO postgres;

--
-- Name: flooring_service; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_service (
    id text NOT NULL,
    name text NOT NULL,
    "baseCost" numeric(10,2) NOT NULL,
    "unitId" text NOT NULL,
    "isCustom" boolean DEFAULT false NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.flooring_service OWNER TO postgres;

--
-- Name: flooring_template_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.flooring_template_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.flooring_template_number_seq OWNER TO postgres;

--
-- Name: flooring_template; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_template (
    id text NOT NULL,
    template_number text DEFAULT ('TP-'::text || lpad((nextval('public.flooring_template_number_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
    "propertyId" text NOT NULL,
    "templateTag" text NOT NULL,
    store public."FlooringStoreCode",
    "warehouseId" text,
    instructions text,
    "templateNotes" text,
    "padProductId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.flooring_template OWNER TO postgres;

--
-- Name: flooring_template_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_template_item (
    id text NOT NULL,
    "templateId" text NOT NULL,
    "productId" text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.flooring_template_item OWNER TO postgres;

--
-- Name: flooring_template_sales_rep; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_template_sales_rep (
    id text NOT NULL,
    "templateId" text NOT NULL,
    "contactId" text NOT NULL,
    percent numeric(5,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.flooring_template_sales_rep OWNER TO postgres;

--
-- Name: flooring_template_service_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_template_service_item (
    id text NOT NULL,
    "templateId" text NOT NULL,
    "serviceId" text,
    name text NOT NULL,
    "unitId" text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.flooring_template_service_item OWNER TO postgres;

--
-- Name: flooring_unit_of_measure; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_unit_of_measure (
    id text NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    slug text NOT NULL,
    abbreviation text NOT NULL
);


ALTER TABLE public.flooring_unit_of_measure OWNER TO postgres;

--
-- Name: flooring_warehouse; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_warehouse (
    id text NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.flooring_warehouse OWNER TO postgres;

--
-- Name: flooring_work_order_number_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.flooring_work_order_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.flooring_work_order_number_seq OWNER TO postgres;

--
-- Name: flooring_work_order; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_work_order (
    id text NOT NULL,
    work_order_number text DEFAULT ('WO-'::text || lpad((nextval('public.flooring_work_order_number_seq'::regclass))::text, 5, '0'::text)) NOT NULL,
    "propertyId" text NOT NULL,
    "templateId" text,
    "warehouseId" text,
    status public."FlooringWorkOrderStatus" NOT NULL,
    is_complete boolean DEFAULT false NOT NULL,
    vacancy public."FlooringVacancyStatus",
    "scheduledFor" date,
    "unitLabel" text,
    "unitType" text,
    "customAddress" text,
    instructions text,
    notes text,
    "googleDriveSlip" text,
    "googleDocUrl" text,
    "templateSyncedAt" timestamp(3) without time zone,
    "templateSyncMode" text,
    "templateSnapshotHash" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.flooring_work_order OWNER TO postgres;

--
-- Name: flooring_work_order_allocation_run; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_work_order_allocation_run (
    id text NOT NULL,
    "workOrderId" text NOT NULL,
    "requestedByUserId" text NOT NULL,
    "sourceVersion" timestamp(3) without time zone NOT NULL,
    "idempotencyKey" text NOT NULL,
    status public."FlooringWorkOrderAllocationRunStatus" DEFAULT 'REQUESTED'::public."FlooringWorkOrderAllocationRunStatus" NOT NULL,
    "requestId" text,
    "queueJobId" text,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "queuedAt" timestamp(3) without time zone,
    "startedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "failedAt" timestamp(3) without time zone,
    "failureCode" text,
    "failureMessage" text,
    "allocatedRowCount" integer DEFAULT 0 NOT NULL,
    "shortageCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.flooring_work_order_allocation_run OWNER TO postgres;

--
-- Name: flooring_work_order_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_work_order_item (
    id text NOT NULL,
    "workOrderId" text NOT NULL,
    "productId" text NOT NULL,
    "sourceTemplateItemId" text,
    quantity numeric(10,2) NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    notes text,
    "changeOrderStatus" public."FlooringChangeOrderStatus" DEFAULT 'SUFFICIENT'::public."FlooringChangeOrderStatus",
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "allocationStatus" public."FlooringWorkOrderItemAllocationStatus" DEFAULT 'NOT_STARTED'::public."FlooringWorkOrderItemAllocationStatus" NOT NULL
);


ALTER TABLE public.flooring_work_order_item OWNER TO postgres;

--
-- Name: flooring_work_order_item_allocation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_work_order_item_allocation (
    id text NOT NULL,
    "workOrderItemId" text NOT NULL,
    "inventoryId" text NOT NULL,
    quantity numeric(12,2) NOT NULL,
    "cutSize" text,
    "unitCost" numeric(10,4) NOT NULL,
    method public."FlooringAllocationMethod" DEFAULT 'MANUAL'::public."FlooringAllocationMethod" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.flooring_work_order_item_allocation OWNER TO postgres;

--
-- Name: flooring_work_order_sales_rep; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_work_order_sales_rep (
    id text NOT NULL,
    "workOrderId" text NOT NULL,
    "sourceTemplateSalesRepId" text,
    "contactId" text NOT NULL,
    percent numeric(5,2) NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.flooring_work_order_sales_rep OWNER TO postgres;

--
-- Name: flooring_work_order_service_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flooring_work_order_service_item (
    id text NOT NULL,
    "workOrderId" text NOT NULL,
    "sourceTemplateServiceItemId" text,
    "serviceId" text,
    name text NOT NULL,
    "unitId" text NOT NULL,
    quantity numeric(10,2) NOT NULL,
    "unitPrice" numeric(10,2) NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.flooring_work_order_service_item OWNER TO postgres;

--
-- Name: property_hub; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property_hub (
    id text NOT NULL,
    "managementCompanyId" text,
    name text NOT NULL,
    "streetAddress" text,
    city text,
    state text,
    "postalCode" text,
    phone text,
    email text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.property_hub OWNER TO postgres;

--
-- Name: queue_outbox_event; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.queue_outbox_event (
    id text NOT NULL,
    topic text NOT NULL,
    "aggregateType" text NOT NULL,
    "aggregateId" text NOT NULL,
    "idempotencyKey" text NOT NULL,
    "payloadJson" jsonb NOT NULL,
    status public."QueueOutboxEventStatus" DEFAULT 'PENDING'::public."QueueOutboxEventStatus" NOT NULL,
    "availableAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lockedAt" timestamp(3) without time zone,
    "lockedBy" text,
    "dispatchedAt" timestamp(3) without time zone,
    "attemptCount" integer DEFAULT 0 NOT NULL,
    "lastError" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.queue_outbox_event OWNER TO postgres;

--
-- Name: flooring_import_entry importNumber; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_import_entry ALTER COLUMN "importNumber" SET DEFAULT nextval('public."flooring_import_entry_importNumber_seq"'::regclass);


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, password, role, "isVerified", "hiddenFlooringNavSlugs", "flooringNavOrderSlugs", "createdAt") FROM stdin;
caa7a530-641e-456a-97f2-bda717749224	admin@test.com	$2b$10$vs6EjhEfbpxr0Tw7b9Hex.jCic6U3OQ48a9.F5fnMLDmWj2p3srSu	ADMIN	t	{}	{}	2026-04-10 21:59:57.485
721d7a9c-9d92-4eba-9771-370312a6dd45	builder@test.com	$2b$10$EfvoBxqMfefFWPmbxyf2oOZ/fPuKesBFpnhjcCy/PGWjuAhTGWemG	BUILDER	t	{}	{}	2026-04-10 21:59:57.594
5314b6dc-7aeb-4318-8376-53eca9af7685	matt@crsfloorcovering.com	$2b$10$zKkE2H1XsFzEvOi7teAvNudCU6ZZxZJbWzpmJGtftxx8QRtLAmFXW	BUILDER	t	{}	{}	2026-04-13 15:55:39.479
\.


--
-- Data for Name: UserLoginActivity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserLoginActivity" (id, "userId", "userEmail", "loggedInAt") FROM stdin;
bd9f5bc2-1cc6-4b00-b00e-5a34980f8dbb	caa7a530-641e-456a-97f2-bda717749224	admin@test.com	2026-04-12 05:59:56.625
c90e5b7c-0b9e-4f6c-8b43-b99012a88264	caa7a530-641e-456a-97f2-bda717749224	admin@test.com	2026-04-12 06:38:28.471
1f6f73ea-7fe3-49ce-83eb-5764fd91a91f	caa7a530-641e-456a-97f2-bda717749224	admin@test.com	2026-04-12 07:01:37.063
84a741ae-c59c-4bd2-9142-c7e7acad1e13	caa7a530-641e-456a-97f2-bda717749224	admin@test.com	2026-04-13 14:27:30.017
d202577b-c550-46f8-abb3-9d3fcb3b6874	caa7a530-641e-456a-97f2-bda717749224	admin@test.com	2026-04-13 15:50:46.473
854814b6-719a-4ce0-a51e-27f378945ce3	5314b6dc-7aeb-4318-8376-53eca9af7685	matt@crsfloorcovering.com	2026-04-13 15:56:07.631
5199c114-ea16-424a-bc93-512482a271d9	caa7a530-641e-456a-97f2-bda717749224	admin@test.com	2026-04-13 15:56:39.665
56cda5c0-c8d4-41ae-91cc-1fe210a6cdcf	caa7a530-641e-456a-97f2-bda717749224	admin@test.com	2026-04-13 17:06:55.868
f0ebb9b1-807e-4a9d-842a-29018a75b6bf	caa7a530-641e-456a-97f2-bda717749224	admin@test.com	2026-04-13 21:08:58.907
\.


--
-- Data for Name: UserTablePreference; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserTablePreference" (id, "userId", "tableKey", "hiddenColumnKeys", "columnOrderKeys", "isAscendingSort", "isGroupingEnabled", "groupByKeys", "filtersJson", "createdAt", "updatedAt") FROM stdin;
08638e4d-d226-4915-a42b-cfb6b1f90502	caa7a530-641e-456a-97f2-bda717749224	unit-of-measures-main	{}	{name,createdAt}	t	f	{}	{}	2026-04-12 06:27:02.481	2026-04-12 06:29:19.24
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
37810612-26cd-4b98-bfa2-bbe2bc9da755	02fa3f5a0adf5c8b9d7fce34a877d39e738ede2dca9128954bfd0e8eea7fb7ba	2026-04-10 21:59:49.727142+00	20260325180000_model_a_baseline	\N	\N	2026-04-10 21:59:49.558669+00	1
34838f92-4ce9-4b75-bdd4-fb046c54a883	40c129ec62472c1fa9a704cef6cc82e3f9960ba05b1719f1d5cb074fc3c4abdd	2026-04-10 21:59:49.863028+00	20260326120000_add_work_order_invoice_state	\N	\N	2026-04-10 21:59:49.763097+00	1
62282a6b-7bf7-48bc-902a-d11168788b40	52459d6c2ff51ef402b0eca9bfeb19d5c0b800dd8fa410f0e22ad94b51b89287	2026-04-10 21:59:50.00714+00	20260326190000_invoice_outbox_architecture	\N	\N	2026-04-10 21:59:49.899079+00	1
9567f044-38ab-40fb-86b7-b672fa260653	969741b45472e955136e1f98a404b6b8c662312b0245d0b1c80ff67c02ae46d1	2026-04-10 21:59:50.154277+00	20260327113000_work_order_allocations	\N	\N	2026-04-10 21:59:50.047243+00	1
033d9f1d-a161-497f-97eb-85ef11b72651	44577b9c90579ac0af63ae2aaf7b206253a0b4f4df4ebd68a26facc328c930ca	2026-04-13 18:41:59.602531+00	20260413200000_add_manufacturer_company_name_normalized	\N	\N	2026-04-13 18:41:59.383966+00	1
72a6ba51-4861-4585-bdc9-59093ce1b740	9a0d798dd63799010a04b99943452a1d80a6d2d4d4033c9a80bd1a9d3d99afe1	2026-04-10 21:59:50.308493+00	20260328093000_work_order_mutation_receipts	\N	\N	2026-04-10 21:59:50.194548+00	1
2f85baba-02d1-461c-9b42-65d38853b4b6	1ba1df00c3d0ea58561286297968cbe801506e503762fc87e5462124dde18355	2026-04-10 21:59:50.447539+00	20260328153000_harden_inventory_allocation_workflow	\N	\N	2026-04-10 21:59:50.345728+00	1
ae0e9a77-2755-430c-844b-7357001d9258	eea99390218829c6072f79e56eeaa041c7ef5c47a0d8855bb3afe82c9a0bce49	2026-04-10 21:59:50.619846+00	20260328170000_work_order_item_allocation_status	\N	\N	2026-04-10 21:59:50.503325+00	1
9133c216-2a4f-48eb-8bab-5366be1bf556	bbcd6d275ad44f29564d013cb0c5351f88c7b79ee7c3ca5810c2a7ae223e472e	2026-04-14 02:03:34.023377+00	20260414020310_add_manufacturer_company_name_index	\N	\N	2026-04-14 02:03:33.931564+00	1
4510d41d-9db8-4efd-a4ab-7e7a9d98a926	68c28a8d646de6f7c0ff96f20639bf30944b80cd72b8b88c270d0ea0f8e7f7ff	2026-04-10 21:59:50.763955+00	20260329113000_single_section_record_revisions	\N	\N	2026-04-10 21:59:50.659508+00	1
d897f912-6450-407c-89c3-cb8517304312	0aed327d32dcfc4dfa2c5ccb394ea45c9a6bb966828508edca40a539bc303679	2026-04-10 21:59:50.915179+00	20260329221500_execution_engine_db_hardening	\N	\N	2026-04-10 21:59:50.806012+00	1
26a03197-f61c-4222-8c92-15812e5af5b8	673f14ce40e0a8b07e0ad018e3ad93dbd1b422ec391763937b4fd05cf475fb15	2026-04-10 21:59:51.053206+00	20260330113000_remove_work_order_invoice_feature	\N	\N	2026-04-10 21:59:50.952269+00	1
a4943057-e7c9-4631-bc32-ff9ecdfd0c15	9cb51e0b7636fa960d2bd9f801893d4151f9fbecb6d7514cfd9cd8926b70ca3d	2026-04-10 21:59:51.193279+00	20260408120000_make_user_password_nullable	\N	\N	2026-04-10 21:59:51.090263+00	1
fa13f63d-c2e7-4917-98e1-d5ba44422075	5bbd455c6ec98ae0345f3905e5040fe1a1ad9c66b809734963c383d0ad303f80	2026-04-10 21:59:51.32862+00	20260410180000_add_unit_of_measure_slug_abbreviation	\N	\N	2026-04-10 21:59:51.23001+00	1
\.


--
-- Data for Name: app_mutation_receipt; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.app_mutation_receipt (id, scope, "userId", "idempotencyKey", "requestHash", "responseStatus", "responseBodyJson", "createdAt", "completedAt", "expiresAt") FROM stdin;
13309d23-cec1-461a-978d-7c0931cde88d	account.tablePreferences.update	caa7a530-641e-456a-97f2-bda717749224	ee1453b5-8b2d-4692-9f50-dc8f79b089ea	8dd0832cf909242721b6ba9b596d3f5136303196f8db3fb53102125e6a95f404	200	{"sort": {"key": "name", "direction": "desc"}, "filters": {}, "grouping": {"keys": [], "enabled": false}, "columnOrder": ["name", "createdAt"], "columnVisibility": {"name": true, "createdAt": true}}	2026-04-12 06:27:02.425	2026-04-12 06:27:02.522	2026-04-13 06:27:02.424
5708b5ec-0634-46f0-a1b0-3a65613965cc	account.tablePreferences.update	caa7a530-641e-456a-97f2-bda717749224	b520863a-9650-4ab9-aa10-a62fc8fa5a13	8103c06164b7ebcdc2aef9e38f4f4b131fc0c98062d29213b620688a082fca78	200	{"sort": {"key": "name", "direction": "asc"}, "filters": {}, "grouping": {"keys": [], "enabled": false}, "columnOrder": ["name", "createdAt"], "columnVisibility": {"name": true, "createdAt": true}}	2026-04-12 06:29:17.263	2026-04-12 06:29:17.318	2026-04-13 06:29:17.262
55009140-0104-439a-a9d3-65590c34f62e	account.tablePreferences.update	caa7a530-641e-456a-97f2-bda717749224	560114b9-b5af-431e-91de-c5ef8ac2fbc0	8103c06164b7ebcdc2aef9e38f4f4b131fc0c98062d29213b620688a082fca78	200	{"sort": {"key": "name", "direction": "asc"}, "filters": {}, "grouping": {"keys": [], "enabled": false}, "columnOrder": ["name", "createdAt"], "columnVisibility": {"name": true, "createdAt": true}}	2026-04-12 06:29:19.202	2026-04-12 06:29:19.259	2026-04-13 06:29:19.201
d9e1ec70-65a0-4bcb-add2-c4040ca1b40b	users.create	caa7a530-641e-456a-97f2-bda717749224	aa161275-bf4c-4a38-93ce-f86c6810a988	5aa892f271a00fbca74ea30ddef304e6805d7eabb47b6db43342046fec462118	201	{"user": {"id": "5314b6dc-7aeb-4318-8376-53eca9af7685", "role": "BUILDER", "email": "matt@crsfloorcovering.com", "canDelete": true, "createdAt": "2026-04-13T15:55:39.479Z", "isVerified": false, "canChangeRole": true, "canUpdateStatus": true}}	2026-04-13 15:55:39.423	2026-04-13 15:55:39.535	2026-04-14 15:55:39.421
3d0a6ff1-fd27-42ed-8195-8ea5783fd988	manufacturers.create	caa7a530-641e-456a-97f2-bda717749224	106d3f78-be96-441d-a104-b466080041ab	ccb44c20cebd6d9e3503da1dac47fec6026d95279af652017528a4a0314e987c	201	{"manufacturer": {"id": "61ded67d-a518-43fe-a82c-30e736e39943", "email": "", "phone": "", "website": "", "agentName": "", "createdAt": "2026-04-13T16:15:24.991Z", "updatedAt": "2026-04-13T16:15:24.991Z", "companyName": "MSI", "productsCount": 0}}	2026-04-13 16:15:24.916	2026-04-13 16:15:25.1	2026-04-14 16:15:24.915
327a5f12-b093-4910-9303-c1b4451e2590	manufacturers.delete	caa7a530-641e-456a-97f2-bda717749224	f3ab834c-d8e9-402f-878f-d5693cb60f4d	f7b883d0f4b46c5fbbc4b037e7d29460211705900cbe7d84034b1ba3f1eb0f5e	200	{"ok": true}	2026-04-13 16:15:32.487	2026-04-13 16:15:32.572	2026-04-14 16:15:32.486
6d7e3fc4-ee8b-47a8-ad8f-6a09521924e8	contacts.create	caa7a530-641e-456a-97f2-bda717749224	b862f0b4-e4f5-4934-ac54-0a3410f0ac5e	38d5aa5a14d3692e31f1d6564f02ea5832d58d7cdc7b5cede7bf06f9d4172371	201	{"contact": {"id": "7d181d8b-35d3-4bc4-b619-4b45573a41af", "name": "Otto", "type": "CONTRACTOR", "createdAt": "2026-04-13T16:25:07.017Z", "typeLabel": "Contractor", "updatedAt": "2026-04-13T16:25:07.017Z", "assignmentsCount": 0}}	2026-04-13 16:25:06.971	2026-04-13 16:25:07.137	2026-04-14 16:25:06.97
3dcb644c-6a5e-46bd-bdec-5288af83a11e	contacts.delete	caa7a530-641e-456a-97f2-bda717749224	b1675194-6d5f-43db-860c-4bf30bec23e8	49b1116a7b72f61068dd924dda55ee7b53ef27bef87a3051cce502de52bf5c6f	200	{"ok": true}	2026-04-13 16:25:11.816	2026-04-13 16:25:11.95	2026-04-14 16:25:11.815
fa0f7df6-c971-47ca-a808-24dd2b350b85	contacts.create	caa7a530-641e-456a-97f2-bda717749224	416f6b49-b0b7-4fc9-b2cc-d5108e1bdddb	38d5aa5a14d3692e31f1d6564f02ea5832d58d7cdc7b5cede7bf06f9d4172371	201	{"contact": {"id": "64a827d7-472f-44eb-aae7-4296944133af", "name": "Otto", "type": "CONTRACTOR", "createdAt": "2026-04-13T16:25:22.696Z", "typeLabel": "Contractor", "updatedAt": "2026-04-13T16:25:22.696Z", "assignmentsCount": 0}}	2026-04-13 16:25:22.668	2026-04-13 16:25:22.775	2026-04-14 16:25:22.665
73c9f22c-598a-465a-84e6-08f28e7ca697	contacts.delete	caa7a530-641e-456a-97f2-bda717749224	43fc1a4e-9039-435b-b5b4-ac822a254f7f	7ab6f8c13f0891061bbe19867b4e4232466bb9e66bc7700a8abf3b06ef141e55	200	{"ok": true}	2026-04-13 16:25:26.029	2026-04-13 16:25:26.13	2026-04-14 16:25:26.028
be0d3a22-c299-4324-a946-3e58ffd67de7	services.create	caa7a530-641e-456a-97f2-bda717749224	c9a3625d-22c5-497b-b431-b18f4705d90d	b0683ab40a488199b8a24dc59b21a7617ca6b18e5c8ec8e4ce667eb15663004b	201	{"service": {"id": "93519345-7bdc-4c08-9d3d-9e277f66efe5", "name": "Install Trim", "notes": "", "unitId": "a81ed5b4-241d-4266-a8be-89da7a0afdbb", "baseCost": "2.5", "unitName": "Bags", "createdAt": "2026-04-13T17:07:43.736Z", "updatedAt": "2026-04-13T17:07:43.736Z", "usageCount": 0}}	2026-04-13 17:07:43.694	2026-04-13 17:07:43.967	2026-04-14 17:07:43.691
d49ba61c-aa5e-457c-a27f-35591de23e2d	services.create	caa7a530-641e-456a-97f2-bda717749224	2c2611f9-d451-442b-b92f-74fa4e22e1b4	f52b5e13b8056e81972e45833ae15f62a119b557bb396cec4d2daefa36642d75	201	{"service": {"id": "20134f39-4af7-4184-b3ef-e80fa250e2f6", "name": "Install carpet", "notes": "", "unitId": "2650b16b-f8b2-4b79-8b5f-e3fc3803e891", "baseCost": "2.5", "unitName": "Boxes", "createdAt": "2026-04-13T17:07:59.807Z", "updatedAt": "2026-04-13T17:07:59.807Z", "usageCount": 0}}	2026-04-13 17:07:59.767	2026-04-13 17:08:00.001	2026-04-14 17:07:59.764
c0074ce7-53c1-431e-88a1-6d9d702cfdf2	services.delete	caa7a530-641e-456a-97f2-bda717749224	e2a78132-5417-49a6-901b-0435f61ac2e1	a9820ec463f5026fa77b654df5c77a68d6499b643c4123169239fb399e67e49e	200	{"ok": true}	2026-04-13 17:08:06.176	2026-04-13 17:08:06.258	2026-04-14 17:08:06.175
545ddf6c-a6d6-4fbf-8baa-6709469bb7f5	services.delete	caa7a530-641e-456a-97f2-bda717749224	782d2588-b648-42da-b267-43c2c0ef549c	2cedb68f3a2a0f7c52190f07375ed5fa2f71330e09b6b695e31aec075c5b706a	200	{"ok": true}	2026-04-13 17:08:10.602	2026-04-13 17:08:10.69	2026-04-14 17:08:10.601
8a86437b-f221-4a1f-be2a-b924311151cc	manufacturers.create	caa7a530-641e-456a-97f2-bda717749224	4606995a-c220-4f73-8efb-f619fe96b85f	ccb44c20cebd6d9e3503da1dac47fec6026d95279af652017528a4a0314e987c	201	{"manufacturer": {"id": "fba12c09-30b2-45a4-bc28-dbb95586acce", "email": "", "phone": "", "website": "", "agentName": "", "createdAt": "2026-04-13T21:09:06.813Z", "updatedAt": "2026-04-13T21:09:06.813Z", "companyName": "MSI", "productsCount": 0}}	2026-04-13 21:09:06.717	2026-04-13 21:09:06.902	2026-04-14 21:09:06.716
2ea8cd6c-c26f-413b-a244-a458bd4f70c8	manufacturers.primary.section.replace	caa7a530-641e-456a-97f2-bda717749224	0859923b-becd-4c81-bd1f-ad79b935b813	93082d20ec7ae1249e99bc7659c034d5b7869b2df41d176f6d240ac3701bc50b	200	{"manufacturer": {"id": "fba12c09-30b2-45a4-bc28-dbb95586acce", "email": "", "phone": "", "website": "", "agentName": "", "createdAt": "2026-04-13T21:09:06.813Z", "updatedAt": "2026-04-13T21:09:13.764Z", "companyName": "TSI", "productsCount": 0}}	2026-04-13 21:09:13.691	2026-04-13 21:09:13.835	2026-04-14 21:09:13.69
c7f5873a-af4b-4401-acaf-55dd3617f454	manufacturers.delete	caa7a530-641e-456a-97f2-bda717749224	d3a4eb04-ec00-4c78-9a8f-cef111ccc648	f2f75b1d87f05f39ffd027ed75936a548cf0037de18fe7da97eaacc522286045	200	{"ok": true}	2026-04-13 21:09:18.033	2026-04-13 21:09:18.168	2026-04-14 21:09:18.032
\.


--
-- Data for Name: flooring_analytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_analytics (id, "workOrderId", "totalMaterialCost", "totalServiceCost", "totalCost", "createdAt") FROM stdin;
\.


--
-- Data for Name: flooring_category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_category (id, name, "categoryCode", "sendUnitId", "stockUnitId", "coverageAvailableUnitId", "itemCoverageUnitId", "serviceUnitId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: flooring_contact; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_contact (id, name, type, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: flooring_cut_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_cut_log (id, "inventoryId", "workOrderId", "workOrderItemId", before, cut, after, notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: flooring_import_entry; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_import_entry (id, "importNumber", "orderNumber", tag, "transportType", status, "warehouseId", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: flooring_inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_inventory (id, "importEntryId", "productId", "itemNumber", "dyeLot", "locationId", "stockCount", cost, freight, notes, "createdAt", "updatedAt", "reservedStockCount", "fifoReceivedAt") FROM stdin;
\.


--
-- Data for Name: flooring_location; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_location (id, "warehouseId", "sectionId", "locationCode", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: flooring_management_company; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_management_company (id, name, "streetAddress", city, state, "postalCode", phone, email, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: flooring_manufacturer; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_manufacturer (id, "companyName", "agentName", website, phone, email, "createdAt", "updatedAt", "companyNameNormalized") FROM stdin;
\.


--
-- Data for Name: flooring_product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_product (id, name, "categoryId", manufacturer, "manufacturerId", style, color, width, "sheetSize", thickness, "unitWeight", "baseColor", "coveragePerUnit", "photoUrls", cost, "isPublic", notes, "subOrder", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: flooring_section; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_section (id, "warehouseId", name, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: flooring_service; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_service (id, name, "baseCost", "unitId", "isCustom", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: flooring_template; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_template (id, template_number, "propertyId", "templateTag", store, "warehouseId", instructions, "templateNotes", "padProductId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: flooring_template_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_template_item (id, "templateId", "productId", quantity, "unitPrice", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: flooring_template_sales_rep; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_template_sales_rep (id, "templateId", "contactId", percent, "createdAt") FROM stdin;
\.


--
-- Data for Name: flooring_template_service_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_template_service_item (id, "templateId", "serviceId", name, "unitId", quantity, "unitPrice", notes, "createdAt") FROM stdin;
\.


--
-- Data for Name: flooring_unit_of_measure; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_unit_of_measure (id, name, "createdAt", "updatedAt", slug, abbreviation) FROM stdin;
936dc7bf-456a-4aec-8216-35b9a3887b31	Linear Feet	2026-04-10 21:59:57.652	2026-04-10 22:39:50.141	linear-feet	lf
4e5490c4-ba1e-4a5d-841e-9929ddacb6df	Square Feet	2026-04-10 21:59:57.716	2026-04-10 22:39:50.197	square-feet	sqft
5438c5ef-eda7-4a8c-9798-d179a04c6138	Square Yard	2026-04-10 21:59:57.751	2026-04-10 22:39:50.239	square-yard	sqyd
b78f737d-951e-4550-abb4-9c64b68c0732	Buckets	2026-04-10 21:59:57.789	2026-04-10 22:39:50.274	buckets	bkt
2650b16b-f8b2-4b79-8b5f-e3fc3803e891	Boxes	2026-04-10 21:59:57.824	2026-04-10 22:39:50.316	boxes	bx
e9e8ee86-42ba-4323-8adf-67e32d671f05	Units	2026-04-10 21:59:57.86	2026-04-10 22:39:50.352	units	ea
a81ed5b4-241d-4266-a8be-89da7a0afdbb	Bags	2026-04-10 21:59:57.898	2026-04-10 22:39:50.39	bags	bag
9deca8da-a105-44e5-bfea-819b37a63abb	Pieces	2026-04-10 21:59:57.932	2026-04-10 22:39:50.428	pieces	pc
f2e53f0d-c5e4-4f50-b773-1542c9b4772a	Sheets	2026-04-10 21:59:57.965	2026-04-10 22:39:50.459	sheets	sht
6dc4bc6e-74e0-4394-a0f4-91b50f425e7f	Rolls	2026-04-10 21:59:58.004	2026-04-10 22:39:50.496	rolls	rl
11bad7e2-5d8c-4121-a3bf-9133877fb67b	Gallons	2026-04-10 22:39:50.535	2026-04-10 22:39:50.535	gallons	gal
\.


--
-- Data for Name: flooring_warehouse; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_warehouse (id, name, address, phone, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: flooring_work_order; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_work_order (id, work_order_number, "propertyId", "templateId", "warehouseId", status, is_complete, vacancy, "scheduledFor", "unitLabel", "unitType", "customAddress", instructions, notes, "googleDriveSlip", "googleDocUrl", "templateSyncedAt", "templateSyncMode", "templateSnapshotHash", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: flooring_work_order_allocation_run; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_work_order_allocation_run (id, "workOrderId", "requestedByUserId", "sourceVersion", "idempotencyKey", status, "requestId", "queueJobId", "requestedAt", "queuedAt", "startedAt", "completedAt", "failedAt", "failureCode", "failureMessage", "allocatedRowCount", "shortageCount", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: flooring_work_order_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_work_order_item (id, "workOrderId", "productId", "sourceTemplateItemId", quantity, "unitPrice", notes, "changeOrderStatus", "createdAt", "updatedAt", "allocationStatus") FROM stdin;
\.


--
-- Data for Name: flooring_work_order_item_allocation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_work_order_item_allocation (id, "workOrderItemId", "inventoryId", quantity, "cutSize", "unitCost", method, notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: flooring_work_order_sales_rep; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_work_order_sales_rep (id, "workOrderId", "sourceTemplateSalesRepId", "contactId", percent, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: flooring_work_order_service_item; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.flooring_work_order_service_item (id, "workOrderId", "sourceTemplateServiceItemId", "serviceId", name, "unitId", quantity, "unitPrice", notes, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: property_hub; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.property_hub (id, "managementCompanyId", name, "streetAddress", city, state, "postalCode", phone, email, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: queue_outbox_event; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.queue_outbox_event (id, topic, "aggregateType", "aggregateId", "idempotencyKey", "payloadJson", status, "availableAt", "lockedAt", "lockedBy", "dispatchedAt", "attemptCount", "lastError", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: flooring_import_entry_importNumber_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."flooring_import_entry_importNumber_seq"', 1, false);


--
-- Name: flooring_template_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.flooring_template_number_seq', 1, false);


--
-- Name: flooring_work_order_number_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.flooring_work_order_number_seq', 1, false);


--
-- Name: UserLoginActivity UserLoginActivity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserLoginActivity"
    ADD CONSTRAINT "UserLoginActivity_pkey" PRIMARY KEY (id);


--
-- Name: UserTablePreference UserTablePreference_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserTablePreference"
    ADD CONSTRAINT "UserTablePreference_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: app_mutation_receipt app_mutation_receipt_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_mutation_receipt
    ADD CONSTRAINT app_mutation_receipt_pkey PRIMARY KEY (id);


--
-- Name: flooring_analytics flooring_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_analytics
    ADD CONSTRAINT flooring_analytics_pkey PRIMARY KEY (id);


--
-- Name: flooring_category flooring_category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_category
    ADD CONSTRAINT flooring_category_pkey PRIMARY KEY (id);


--
-- Name: flooring_contact flooring_contact_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_contact
    ADD CONSTRAINT flooring_contact_pkey PRIMARY KEY (id);


--
-- Name: flooring_cut_log flooring_cut_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_cut_log
    ADD CONSTRAINT flooring_cut_log_pkey PRIMARY KEY (id);


--
-- Name: flooring_import_entry flooring_import_entry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_import_entry
    ADD CONSTRAINT flooring_import_entry_pkey PRIMARY KEY (id);


--
-- Name: flooring_inventory flooring_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_inventory
    ADD CONSTRAINT flooring_inventory_pkey PRIMARY KEY (id);


--
-- Name: flooring_location flooring_location_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_location
    ADD CONSTRAINT flooring_location_pkey PRIMARY KEY (id);


--
-- Name: flooring_management_company flooring_management_company_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_management_company
    ADD CONSTRAINT flooring_management_company_pkey PRIMARY KEY (id);


--
-- Name: flooring_manufacturer flooring_manufacturer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_manufacturer
    ADD CONSTRAINT flooring_manufacturer_pkey PRIMARY KEY (id);


--
-- Name: flooring_product flooring_product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_product
    ADD CONSTRAINT flooring_product_pkey PRIMARY KEY (id);


--
-- Name: flooring_section flooring_section_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_section
    ADD CONSTRAINT flooring_section_pkey PRIMARY KEY (id);


--
-- Name: flooring_service flooring_service_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_service
    ADD CONSTRAINT flooring_service_pkey PRIMARY KEY (id);


--
-- Name: flooring_template_item flooring_template_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_template_item
    ADD CONSTRAINT flooring_template_item_pkey PRIMARY KEY (id);


--
-- Name: flooring_template flooring_template_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_template
    ADD CONSTRAINT flooring_template_pkey PRIMARY KEY (id);


--
-- Name: flooring_template_sales_rep flooring_template_sales_rep_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_template_sales_rep
    ADD CONSTRAINT flooring_template_sales_rep_pkey PRIMARY KEY (id);


--
-- Name: flooring_template_service_item flooring_template_service_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_template_service_item
    ADD CONSTRAINT flooring_template_service_item_pkey PRIMARY KEY (id);


--
-- Name: flooring_unit_of_measure flooring_unit_of_measure_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_unit_of_measure
    ADD CONSTRAINT flooring_unit_of_measure_pkey PRIMARY KEY (id);


--
-- Name: flooring_warehouse flooring_warehouse_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_warehouse
    ADD CONSTRAINT flooring_warehouse_pkey PRIMARY KEY (id);


--
-- Name: flooring_work_order_allocation_run flooring_work_order_allocation_run_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_allocation_run
    ADD CONSTRAINT flooring_work_order_allocation_run_pkey PRIMARY KEY (id);


--
-- Name: flooring_work_order_item_allocation flooring_work_order_item_allocation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_item_allocation
    ADD CONSTRAINT flooring_work_order_item_allocation_pkey PRIMARY KEY (id);


--
-- Name: flooring_work_order_item flooring_work_order_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_item
    ADD CONSTRAINT flooring_work_order_item_pkey PRIMARY KEY (id);


--
-- Name: flooring_work_order flooring_work_order_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order
    ADD CONSTRAINT flooring_work_order_pkey PRIMARY KEY (id);


--
-- Name: flooring_work_order_sales_rep flooring_work_order_sales_rep_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_sales_rep
    ADD CONSTRAINT flooring_work_order_sales_rep_pkey PRIMARY KEY (id);


--
-- Name: flooring_work_order_service_item flooring_work_order_service_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_service_item
    ADD CONSTRAINT flooring_work_order_service_item_pkey PRIMARY KEY (id);


--
-- Name: property_hub property_hub_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_hub
    ADD CONSTRAINT property_hub_pkey PRIMARY KEY (id);


--
-- Name: queue_outbox_event queue_outbox_event_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.queue_outbox_event
    ADD CONSTRAINT queue_outbox_event_pkey PRIMARY KEY (id);


--
-- Name: UserLoginActivity_loggedInAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserLoginActivity_loggedInAt_idx" ON public."UserLoginActivity" USING btree ("loggedInAt");


--
-- Name: UserLoginActivity_userEmail_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserLoginActivity_userEmail_idx" ON public."UserLoginActivity" USING btree ("userEmail");


--
-- Name: UserTablePreference_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserTablePreference_userId_idx" ON public."UserTablePreference" USING btree ("userId");


--
-- Name: UserTablePreference_userId_tableKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "UserTablePreference_userId_tableKey_key" ON public."UserTablePreference" USING btree ("userId", "tableKey");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: app_mutation_receipt_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "app_mutation_receipt_expiresAt_idx" ON public.app_mutation_receipt USING btree ("expiresAt");


--
-- Name: app_mutation_receipt_scope_userId_idempotencyKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "app_mutation_receipt_scope_userId_idempotencyKey_key" ON public.app_mutation_receipt USING btree (scope, "userId", "idempotencyKey");


--
-- Name: app_mutation_receipt_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "app_mutation_receipt_userId_idx" ON public.app_mutation_receipt USING btree ("userId");


--
-- Name: flooring_analytics_workOrderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_analytics_workOrderId_idx" ON public.flooring_analytics USING btree ("workOrderId");


--
-- Name: flooring_analytics_workOrderId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "flooring_analytics_workOrderId_key" ON public.flooring_analytics USING btree ("workOrderId");


--
-- Name: flooring_category_coverageAvailableUnitId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_category_coverageAvailableUnitId_idx" ON public.flooring_category USING btree ("coverageAvailableUnitId");


--
-- Name: flooring_category_itemCoverageUnitId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_category_itemCoverageUnitId_idx" ON public.flooring_category USING btree ("itemCoverageUnitId");


--
-- Name: flooring_category_name_ci_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX flooring_category_name_ci_key ON public.flooring_category USING btree (lower(name));


--
-- Name: flooring_category_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX flooring_category_name_key ON public.flooring_category USING btree (name);


--
-- Name: flooring_category_name_lower_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX flooring_category_name_lower_key ON public.flooring_category USING btree (lower(name));


--
-- Name: flooring_category_sendUnitId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_category_sendUnitId_idx" ON public.flooring_category USING btree ("sendUnitId");


--
-- Name: flooring_category_serviceUnitId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_category_serviceUnitId_idx" ON public.flooring_category USING btree ("serviceUnitId");


--
-- Name: flooring_category_stockUnitId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_category_stockUnitId_idx" ON public.flooring_category USING btree ("stockUnitId");


--
-- Name: flooring_contact_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flooring_contact_name_idx ON public.flooring_contact USING btree (name);


--
-- Name: flooring_contact_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flooring_contact_type_idx ON public.flooring_contact USING btree (type);


--
-- Name: flooring_cut_log_inventoryId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_cut_log_inventoryId_idx" ON public.flooring_cut_log USING btree ("inventoryId");


--
-- Name: flooring_cut_log_workOrderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_cut_log_workOrderId_idx" ON public.flooring_cut_log USING btree ("workOrderId");


--
-- Name: flooring_cut_log_workOrderItemId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_cut_log_workOrderItemId_idx" ON public.flooring_cut_log USING btree ("workOrderItemId");


--
-- Name: flooring_import_entry_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_import_entry_createdAt_idx" ON public.flooring_import_entry USING btree ("createdAt");


--
-- Name: flooring_import_entry_importNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "flooring_import_entry_importNumber_key" ON public.flooring_import_entry USING btree ("importNumber");


--
-- Name: flooring_import_entry_warehouseId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_import_entry_warehouseId_idx" ON public.flooring_import_entry USING btree ("warehouseId");


--
-- Name: flooring_inventory_importEntryId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_inventory_importEntryId_idx" ON public.flooring_inventory USING btree ("importEntryId");


--
-- Name: flooring_inventory_locationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_inventory_locationId_idx" ON public.flooring_inventory USING btree ("locationId");


--
-- Name: flooring_inventory_locationId_itemNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "flooring_inventory_locationId_itemNumber_key" ON public.flooring_inventory USING btree ("locationId", "itemNumber");


--
-- Name: flooring_inventory_productId_fifoReceivedAt_itemNumber_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_inventory_productId_fifoReceivedAt_itemNumber_id_idx" ON public.flooring_inventory USING btree ("productId", "fifoReceivedAt", "itemNumber", id);


--
-- Name: flooring_inventory_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_inventory_productId_idx" ON public.flooring_inventory USING btree ("productId");


--
-- Name: flooring_location_sectionId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_location_sectionId_idx" ON public.flooring_location USING btree ("sectionId");


--
-- Name: flooring_location_warehouseId_locationCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "flooring_location_warehouseId_locationCode_key" ON public.flooring_location USING btree ("warehouseId", "locationCode");


--
-- Name: flooring_management_company_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX flooring_management_company_name_key ON public.flooring_management_company USING btree (name);


--
-- Name: flooring_manufacturer_companyNameNormalized_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "flooring_manufacturer_companyNameNormalized_key" ON public.flooring_manufacturer USING btree ("companyNameNormalized");


--
-- Name: flooring_manufacturer_companyName_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_manufacturer_companyName_idx" ON public.flooring_manufacturer USING btree ("companyName");


--
-- Name: flooring_product_manufacturerId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_product_manufacturerId_idx" ON public.flooring_product USING btree ("manufacturerId");


--
-- Name: flooring_product_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flooring_product_name_idx ON public.flooring_product USING btree (name);


--
-- Name: flooring_section_warehouseId_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "flooring_section_warehouseId_name_key" ON public.flooring_section USING btree ("warehouseId", name);


--
-- Name: flooring_service_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flooring_service_name_idx ON public.flooring_service USING btree (name);


--
-- Name: flooring_service_unitId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_service_unitId_idx" ON public.flooring_service USING btree ("unitId");


--
-- Name: flooring_template_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_createdAt_idx" ON public.flooring_template USING btree ("createdAt");


--
-- Name: flooring_template_item_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_item_productId_idx" ON public.flooring_template_item USING btree ("productId");


--
-- Name: flooring_template_item_templateId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_item_templateId_createdAt_idx" ON public.flooring_template_item USING btree ("templateId", "createdAt");


--
-- Name: flooring_template_item_templateId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_item_templateId_idx" ON public.flooring_template_item USING btree ("templateId");


--
-- Name: flooring_template_propertyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_propertyId_idx" ON public.flooring_template USING btree ("propertyId");


--
-- Name: flooring_template_sales_rep_contactId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_sales_rep_contactId_idx" ON public.flooring_template_sales_rep USING btree ("contactId");


--
-- Name: flooring_template_sales_rep_templateId_contactId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "flooring_template_sales_rep_templateId_contactId_key" ON public.flooring_template_sales_rep USING btree ("templateId", "contactId");


--
-- Name: flooring_template_sales_rep_templateId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_sales_rep_templateId_createdAt_idx" ON public.flooring_template_sales_rep USING btree ("templateId", "createdAt");


--
-- Name: flooring_template_sales_rep_templateId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_sales_rep_templateId_idx" ON public.flooring_template_sales_rep USING btree ("templateId");


--
-- Name: flooring_template_service_item_serviceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_service_item_serviceId_idx" ON public.flooring_template_service_item USING btree ("serviceId");


--
-- Name: flooring_template_service_item_templateId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_service_item_templateId_createdAt_idx" ON public.flooring_template_service_item USING btree ("templateId", "createdAt");


--
-- Name: flooring_template_service_item_templateId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_service_item_templateId_idx" ON public.flooring_template_service_item USING btree ("templateId");


--
-- Name: flooring_template_service_item_unitId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_service_item_unitId_idx" ON public.flooring_template_service_item USING btree ("unitId");


--
-- Name: flooring_template_templateTag_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_templateTag_idx" ON public.flooring_template USING btree ("templateTag");


--
-- Name: flooring_template_template_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flooring_template_template_number_idx ON public.flooring_template USING btree (template_number);


--
-- Name: flooring_template_template_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX flooring_template_template_number_key ON public.flooring_template USING btree (template_number);


--
-- Name: flooring_template_updatedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_updatedAt_idx" ON public.flooring_template USING btree ("updatedAt");


--
-- Name: flooring_template_warehouseId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_template_warehouseId_idx" ON public.flooring_template USING btree ("warehouseId");


--
-- Name: flooring_unit_of_measure_name_ci_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX flooring_unit_of_measure_name_ci_key ON public.flooring_unit_of_measure USING btree (lower(name));


--
-- Name: flooring_unit_of_measure_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX flooring_unit_of_measure_name_key ON public.flooring_unit_of_measure USING btree (name);


--
-- Name: flooring_unit_of_measure_name_lower_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX flooring_unit_of_measure_name_lower_key ON public.flooring_unit_of_measure USING btree (lower(name));


--
-- Name: flooring_unit_of_measure_slug_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX flooring_unit_of_measure_slug_key ON public.flooring_unit_of_measure USING btree (slug);


--
-- Name: flooring_warehouse_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX flooring_warehouse_name_key ON public.flooring_warehouse USING btree (name);


--
-- Name: flooring_work_order_allocation_run_idempotencyKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "flooring_work_order_allocation_run_idempotencyKey_key" ON public.flooring_work_order_allocation_run USING btree ("idempotencyKey");


--
-- Name: flooring_work_order_allocation_run_status_requestedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_allocation_run_status_requestedAt_idx" ON public.flooring_work_order_allocation_run USING btree (status, "requestedAt");


--
-- Name: flooring_work_order_allocation_run_workOrderId_requestedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_allocation_run_workOrderId_requestedAt_idx" ON public.flooring_work_order_allocation_run USING btree ("workOrderId", "requestedAt");


--
-- Name: flooring_work_order_allocation_run_workOrderId_sourceVersion_ke; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "flooring_work_order_allocation_run_workOrderId_sourceVersion_ke" ON public.flooring_work_order_allocation_run USING btree ("workOrderId", "sourceVersion");


--
-- Name: flooring_work_order_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_createdAt_idx" ON public.flooring_work_order USING btree ("createdAt");


--
-- Name: flooring_work_order_is_complete_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flooring_work_order_is_complete_idx ON public.flooring_work_order USING btree (is_complete);


--
-- Name: flooring_work_order_item_allocation_inventoryId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_item_allocation_inventoryId_idx" ON public.flooring_work_order_item_allocation USING btree ("inventoryId");


--
-- Name: flooring_work_order_item_allocation_inventoryId_method_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_item_allocation_inventoryId_method_idx" ON public.flooring_work_order_item_allocation USING btree ("inventoryId", method);


--
-- Name: flooring_work_order_item_allocation_method_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flooring_work_order_item_allocation_method_idx ON public.flooring_work_order_item_allocation USING btree (method);


--
-- Name: flooring_work_order_item_allocation_workOrderItemId_createdAt_i; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_item_allocation_workOrderItemId_createdAt_i" ON public.flooring_work_order_item_allocation USING btree ("workOrderItemId", "createdAt", id);


--
-- Name: flooring_work_order_item_allocation_workOrderItemId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_item_allocation_workOrderItemId_idx" ON public.flooring_work_order_item_allocation USING btree ("workOrderItemId");


--
-- Name: flooring_work_order_item_productId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_item_productId_idx" ON public.flooring_work_order_item USING btree ("productId");


--
-- Name: flooring_work_order_item_sourceTemplateItemId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_item_sourceTemplateItemId_idx" ON public.flooring_work_order_item USING btree ("sourceTemplateItemId");


--
-- Name: flooring_work_order_item_workOrderId_allocationStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_item_workOrderId_allocationStatus_idx" ON public.flooring_work_order_item USING btree ("workOrderId", "allocationStatus");


--
-- Name: flooring_work_order_item_workOrderId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_item_workOrderId_createdAt_idx" ON public.flooring_work_order_item USING btree ("workOrderId", "createdAt");


--
-- Name: flooring_work_order_item_workOrderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_item_workOrderId_idx" ON public.flooring_work_order_item USING btree ("workOrderId");


--
-- Name: flooring_work_order_propertyId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_propertyId_status_idx" ON public.flooring_work_order USING btree ("propertyId", status);


--
-- Name: flooring_work_order_sales_rep_contactId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_sales_rep_contactId_idx" ON public.flooring_work_order_sales_rep USING btree ("contactId");


--
-- Name: flooring_work_order_sales_rep_sourceTemplateSalesRepI_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_sales_rep_sourceTemplateSalesRepI_idx" ON public.flooring_work_order_sales_rep USING btree ("sourceTemplateSalesRepId");


--
-- Name: flooring_work_order_sales_rep_workOrderId_contactId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "flooring_work_order_sales_rep_workOrderId_contactId_key" ON public.flooring_work_order_sales_rep USING btree ("workOrderId", "contactId");


--
-- Name: flooring_work_order_sales_rep_workOrderId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_sales_rep_workOrderId_createdAt_idx" ON public.flooring_work_order_sales_rep USING btree ("workOrderId", "createdAt");


--
-- Name: flooring_work_order_sales_rep_workOrderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_sales_rep_workOrderId_idx" ON public.flooring_work_order_sales_rep USING btree ("workOrderId");


--
-- Name: flooring_work_order_scheduledFor_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_scheduledFor_idx" ON public.flooring_work_order USING btree ("scheduledFor");


--
-- Name: flooring_work_order_service_item_serviceId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_service_item_serviceId_idx" ON public.flooring_work_order_service_item USING btree ("serviceId");


--
-- Name: flooring_work_order_service_item_sourceTemplateServiceItemI_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_service_item_sourceTemplateServiceItemI_idx" ON public.flooring_work_order_service_item USING btree ("sourceTemplateServiceItemId");


--
-- Name: flooring_work_order_service_item_unitId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_service_item_unitId_idx" ON public.flooring_work_order_service_item USING btree ("unitId");


--
-- Name: flooring_work_order_service_item_workOrderId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_service_item_workOrderId_createdAt_idx" ON public.flooring_work_order_service_item USING btree ("workOrderId", "createdAt");


--
-- Name: flooring_work_order_service_item_workOrderId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_service_item_workOrderId_idx" ON public.flooring_work_order_service_item USING btree ("workOrderId");


--
-- Name: flooring_work_order_status_scheduledFor_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_status_scheduledFor_idx" ON public.flooring_work_order USING btree (status, "scheduledFor");


--
-- Name: flooring_work_order_templateId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_templateId_idx" ON public.flooring_work_order USING btree ("templateId");


--
-- Name: flooring_work_order_updatedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_updatedAt_idx" ON public.flooring_work_order USING btree ("updatedAt");


--
-- Name: flooring_work_order_warehouseId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "flooring_work_order_warehouseId_idx" ON public.flooring_work_order USING btree ("warehouseId");


--
-- Name: flooring_work_order_work_order_number_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX flooring_work_order_work_order_number_idx ON public.flooring_work_order USING btree (work_order_number);


--
-- Name: flooring_work_order_work_order_number_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX flooring_work_order_work_order_number_key ON public.flooring_work_order USING btree (work_order_number);


--
-- Name: property_hub_managementCompanyId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "property_hub_managementCompanyId_idx" ON public.property_hub USING btree ("managementCompanyId");


--
-- Name: property_hub_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX property_hub_name_idx ON public.property_hub USING btree (name);


--
-- Name: queue_outbox_event_aggregateType_aggregateId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "queue_outbox_event_aggregateType_aggregateId_idx" ON public.queue_outbox_event USING btree ("aggregateType", "aggregateId");


--
-- Name: queue_outbox_event_idempotencyKey_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "queue_outbox_event_idempotencyKey_key" ON public.queue_outbox_event USING btree ("idempotencyKey");


--
-- Name: queue_outbox_event_status_availableAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "queue_outbox_event_status_availableAt_idx" ON public.queue_outbox_event USING btree (status, "availableAt");


--
-- Name: queue_outbox_event_status_availableAt_lockedAt_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "queue_outbox_event_status_availableAt_lockedAt_createdAt_idx" ON public.queue_outbox_event USING btree (status, "availableAt", "lockedAt", "createdAt");


--
-- Name: queue_outbox_event_topic_status_availableAt_lockedAt_createdAt_; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "queue_outbox_event_topic_status_availableAt_lockedAt_createdAt_" ON public.queue_outbox_event USING btree (topic, status, "availableAt", "lockedAt", "createdAt");


--
-- Name: UserLoginActivity UserLoginActivity_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserLoginActivity"
    ADD CONSTRAINT "UserLoginActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserTablePreference UserTablePreference_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserTablePreference"
    ADD CONSTRAINT "UserTablePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: app_mutation_receipt app_mutation_receipt_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.app_mutation_receipt
    ADD CONSTRAINT "app_mutation_receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: flooring_analytics flooring_analytics_workOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_analytics
    ADD CONSTRAINT "flooring_analytics_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES public.flooring_work_order(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: flooring_category flooring_category_coverageAvailableUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_category
    ADD CONSTRAINT "flooring_category_coverageAvailableUnitId_fkey" FOREIGN KEY ("coverageAvailableUnitId") REFERENCES public.flooring_unit_of_measure(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_category flooring_category_itemCoverageUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_category
    ADD CONSTRAINT "flooring_category_itemCoverageUnitId_fkey" FOREIGN KEY ("itemCoverageUnitId") REFERENCES public.flooring_unit_of_measure(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_category flooring_category_sendUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_category
    ADD CONSTRAINT "flooring_category_sendUnitId_fkey" FOREIGN KEY ("sendUnitId") REFERENCES public.flooring_unit_of_measure(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_category flooring_category_serviceUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_category
    ADD CONSTRAINT "flooring_category_serviceUnitId_fkey" FOREIGN KEY ("serviceUnitId") REFERENCES public.flooring_unit_of_measure(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_category flooring_category_stockUnitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_category
    ADD CONSTRAINT "flooring_category_stockUnitId_fkey" FOREIGN KEY ("stockUnitId") REFERENCES public.flooring_unit_of_measure(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_cut_log flooring_cut_log_inventoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_cut_log
    ADD CONSTRAINT "flooring_cut_log_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES public.flooring_inventory(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: flooring_cut_log flooring_cut_log_workOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_cut_log
    ADD CONSTRAINT "flooring_cut_log_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES public.flooring_work_order(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: flooring_cut_log flooring_cut_log_workOrderItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_cut_log
    ADD CONSTRAINT "flooring_cut_log_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES public.flooring_work_order_item(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: flooring_import_entry flooring_import_entry_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_import_entry
    ADD CONSTRAINT "flooring_import_entry_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public.flooring_warehouse(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: flooring_inventory flooring_inventory_importEntryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_inventory
    ADD CONSTRAINT "flooring_inventory_importEntryId_fkey" FOREIGN KEY ("importEntryId") REFERENCES public.flooring_import_entry(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_inventory flooring_inventory_locationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_inventory
    ADD CONSTRAINT "flooring_inventory_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES public.flooring_location(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: flooring_inventory flooring_inventory_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_inventory
    ADD CONSTRAINT "flooring_inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.flooring_product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_location flooring_location_sectionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_location
    ADD CONSTRAINT "flooring_location_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES public.flooring_section(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_location flooring_location_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_location
    ADD CONSTRAINT "flooring_location_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public.flooring_warehouse(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: flooring_product flooring_product_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_product
    ADD CONSTRAINT "flooring_product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.flooring_category(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_product flooring_product_manufacturerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_product
    ADD CONSTRAINT "flooring_product_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES public.flooring_manufacturer(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_section flooring_section_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_section
    ADD CONSTRAINT "flooring_section_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public.flooring_warehouse(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: flooring_service flooring_service_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_service
    ADD CONSTRAINT "flooring_service_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.flooring_unit_of_measure(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_template_item flooring_template_item_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_template_item
    ADD CONSTRAINT "flooring_template_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.flooring_product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_template_item flooring_template_item_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_template_item
    ADD CONSTRAINT "flooring_template_item_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.flooring_template(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: flooring_template flooring_template_padProductId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_template
    ADD CONSTRAINT "flooring_template_padProductId_fkey" FOREIGN KEY ("padProductId") REFERENCES public.flooring_product(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: flooring_template flooring_template_propertyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_template
    ADD CONSTRAINT "flooring_template_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES public.property_hub(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_template_sales_rep flooring_template_sales_rep_contactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_template_sales_rep
    ADD CONSTRAINT "flooring_template_sales_rep_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES public.flooring_contact(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_template_sales_rep flooring_template_sales_rep_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_template_sales_rep
    ADD CONSTRAINT "flooring_template_sales_rep_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.flooring_template(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: flooring_template_service_item flooring_template_service_item_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_template_service_item
    ADD CONSTRAINT "flooring_template_service_item_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public.flooring_service(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: flooring_template_service_item flooring_template_service_item_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_template_service_item
    ADD CONSTRAINT "flooring_template_service_item_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.flooring_template(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: flooring_template_service_item flooring_template_service_item_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_template_service_item
    ADD CONSTRAINT "flooring_template_service_item_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.flooring_unit_of_measure(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_template flooring_template_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_template
    ADD CONSTRAINT "flooring_template_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public.flooring_warehouse(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: flooring_work_order_allocation_run flooring_work_order_allocation_run_requestedByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_allocation_run
    ADD CONSTRAINT "flooring_work_order_allocation_run_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_work_order_allocation_run flooring_work_order_allocation_run_workOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_allocation_run
    ADD CONSTRAINT "flooring_work_order_allocation_run_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES public.flooring_work_order(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: flooring_work_order_item_allocation flooring_work_order_item_allocation_inventoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_item_allocation
    ADD CONSTRAINT "flooring_work_order_item_allocation_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES public.flooring_inventory(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_work_order_item_allocation flooring_work_order_item_allocation_workOrderItemId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_item_allocation
    ADD CONSTRAINT "flooring_work_order_item_allocation_workOrderItemId_fkey" FOREIGN KEY ("workOrderItemId") REFERENCES public.flooring_work_order_item(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: flooring_work_order_item flooring_work_order_item_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_item
    ADD CONSTRAINT "flooring_work_order_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.flooring_product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_work_order_item flooring_work_order_item_workOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_item
    ADD CONSTRAINT "flooring_work_order_item_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES public.flooring_work_order(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: flooring_work_order flooring_work_order_propertyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order
    ADD CONSTRAINT "flooring_work_order_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES public.property_hub(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_work_order_sales_rep flooring_work_order_sales_rep_contactId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_sales_rep
    ADD CONSTRAINT "flooring_work_order_sales_rep_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES public.flooring_contact(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_work_order_sales_rep flooring_work_order_sales_rep_workOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_sales_rep
    ADD CONSTRAINT "flooring_work_order_sales_rep_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES public.flooring_work_order(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: flooring_work_order_service_item flooring_work_order_service_item_serviceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_service_item
    ADD CONSTRAINT "flooring_work_order_service_item_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES public.flooring_service(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: flooring_work_order_service_item flooring_work_order_service_item_unitId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_service_item
    ADD CONSTRAINT "flooring_work_order_service_item_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES public.flooring_unit_of_measure(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: flooring_work_order_service_item flooring_work_order_service_item_workOrderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order_service_item
    ADD CONSTRAINT "flooring_work_order_service_item_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES public.flooring_work_order(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: flooring_work_order flooring_work_order_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order
    ADD CONSTRAINT "flooring_work_order_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.flooring_template(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: flooring_work_order flooring_work_order_warehouseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flooring_work_order
    ADD CONSTRAINT "flooring_work_order_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES public.flooring_warehouse(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: property_hub property_hub_managementCompanyId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property_hub
    ADD CONSTRAINT "property_hub_managementCompanyId_fkey" FOREIGN KEY ("managementCompanyId") REFERENCES public.flooring_management_company(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict SYDGhn5vxKjkBBvBj4MP2g7fN4m7KZ8FKpdMezUhgnhrN7pKtXSA4ZqLuouQLpH

