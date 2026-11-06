-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TrackingMode" AS ENUM ('INDIVIDUAL', 'QUANTITY', 'HYBRID');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED', 'MISSING');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'RENTED', 'IN_TRANSIT', 'INSPECTION', 'MAINTENANCE', 'RETIRED', 'LOST');

-- CreateEnum
CREATE TYPE "PricingUnit" AS ENUM ('HOUR', 'DAY', 'WEEK', 'MONTH');

-- CreateEnum
CREATE TYPE "RentalRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'QUOTED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'ISSUED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'CONFIRMED', 'DISPATCHED', 'ACTIVE', 'OVERDUE', 'RETURNED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RentalItemStatus" AS ENUM ('PENDING', 'DISPATCHED', 'ACTIVE', 'RETURNED', 'DAMAGED', 'MISSING', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DispatchStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReturnStatus" AS ENUM ('DRAFT', 'INSPECTING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InspectionOutcome" AS ENUM ('PASS', 'FAIL', 'NEEDS_MAINTENANCE');

-- CreateEnum
CREATE TYPE "MaintenancePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERPAID', 'VOID', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('RECORDED', 'ALLOCATED', 'REVERSED');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('PENDING', 'HELD', 'PARTIALLY_REFUNDED', 'REFUNDED', 'APPLIED', 'CLOSED');

-- CreateEnum
CREATE TYPE "DepositTransactionType" AS ENUM ('COLLECT', 'REFUND', 'APPLY_TO_CHARGE', 'REVERSAL');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INTAKE', 'DISPATCH', 'RETURN', 'ADJUSTMENT', 'MAINTENANCE', 'RETIRE', 'RESTORE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" "RoleName" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "customer_code" TEXT NOT NULL,
    "customer_type" "CustomerType" NOT NULL DEFAULT 'INDIVIDUAL',
    "full_name" TEXT NOT NULL,
    "company_name" TEXT,
    "contact_person" TEXT,
    "phone" TEXT NOT NULL,
    "alternate_phone" TEXT,
    "email" TEXT,
    "billing_address" TEXT,
    "site_address" TEXT,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_guarantors" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "rental_id" UUID,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relationship" TEXT,
    "identification_type" TEXT,
    "identification_number_enc" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_guarantors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "tracking_mode" "TrackingMode" NOT NULL DEFAULT 'INDIVIDUAL',
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_models" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "model_number" TEXT,
    "description" TEXT,
    "specifications_json" JSONB,
    "default_deposit" DECIMAL(18,2),
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_assets" (
    "id" UUID NOT NULL,
    "asset_code" TEXT NOT NULL,
    "model_id" UUID NOT NULL,
    "serial_number" TEXT,
    "qr_code_value" TEXT,
    "purchase_date" DATE,
    "purchase_cost" DECIMAL(18,2),
    "current_location" TEXT,
    "condition" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "status" "AssetStatus" NOT NULL DEFAULT 'AVAILABLE',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_images" (
    "id" UUID NOT NULL,
    "asset_id" UUID,
    "model_id" UUID,
    "file_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_accessories" (
    "id" UUID NOT NULL,
    "model_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "equipment_accessories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_accessories" (
    "id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "accessory_id" UUID NOT NULL,
    "quantity_owned" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "asset_accessories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "asset_id" UUID,
    "model_id" UUID NOT NULL,
    "movement_type" "MovementType" NOT NULL,
    "quantity_delta" INTEGER NOT NULL DEFAULT 0,
    "from_status" TEXT,
    "to_status" TEXT,
    "reference_type" TEXT,
    "reference_id" UUID,
    "reason" TEXT,
    "performed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_prices" (
    "id" UUID NOT NULL,
    "model_id" UUID NOT NULL,
    "asset_id" UUID,
    "pricing_unit" "PricingUnit" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "minimum_duration" INTEGER,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_requests" (
    "id" UUID NOT NULL,
    "request_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "requested_start_at" TIMESTAMP(3) NOT NULL,
    "requested_end_at" TIMESTAMP(3) NOT NULL,
    "site_location" TEXT,
    "notes" TEXT,
    "status" "RentalRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_request_items" (
    "id" UUID NOT NULL,
    "rental_request_id" UUID NOT NULL,
    "model_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "requested_asset_id" UUID,
    "notes" TEXT,

    CONSTRAINT "rental_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" UUID NOT NULL,
    "quotation_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "rental_request_id" UUID,
    "valid_until" TIMESTAMP(3),
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "delivery_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
    "prepared_by" UUID,
    "approved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rentals" (
    "id" UUID NOT NULL,
    "rental_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "quotation_id" UUID,
    "start_at" TIMESTAMP(3) NOT NULL,
    "expected_return_at" TIMESTAMP(3) NOT NULL,
    "actual_return_at" TIMESTAMP(3),
    "site_location" TEXT,
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "delivery_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "amount_paid_cached" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balance_cached" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "RentalStatus" NOT NULL DEFAULT 'DRAFT',
    "terms_snapshot" TEXT,
    "remarks" TEXT,
    "created_by" UUID,
    "approved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rentals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_items" (
    "id" UUID NOT NULL,
    "rental_id" UUID NOT NULL,
    "model_id" UUID NOT NULL,
    "asset_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "pricing_unit" "PricingUnit" NOT NULL,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "agreed_duration" DECIMAL(10,2) NOT NULL,
    "line_subtotal" DECIMAL(18,2) NOT NULL,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "RentalItemStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_approvals" (
    "id" UUID NOT NULL,
    "rental_id" UUID NOT NULL,
    "rental_item_id" UUID NOT NULL,
    "standard_price" DECIMAL(18,2) NOT NULL,
    "proposed_price" DECIMAL(18,2) NOT NULL,
    "approved_price" DECIMAL(18,2),
    "discount_reason" TEXT,
    "requested_by" UUID NOT NULL,
    "approved_by" UUID,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "price_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatches" (
    "id" UUID NOT NULL,
    "dispatch_number" TEXT NOT NULL,
    "rental_id" UUID NOT NULL,
    "dispatched_at" TIMESTAMP(3) NOT NULL,
    "issued_by" UUID,
    "recipient_name" TEXT,
    "site_location" TEXT,
    "notes" TEXT,
    "status" "DispatchStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_items" (
    "id" UUID NOT NULL,
    "dispatch_id" UUID NOT NULL,
    "rental_item_id" UUID NOT NULL,
    "asset_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "condition_out" "AssetCondition" NOT NULL,
    "accessories_json" JSONB,
    "meter_reading" TEXT,
    "notes" TEXT,

    CONSTRAINT "dispatch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "returns" (
    "id" UUID NOT NULL,
    "return_number" TEXT NOT NULL,
    "rental_id" UUID NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,
    "received_by" UUID,
    "notes" TEXT,
    "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "returns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "return_items" (
    "id" UUID NOT NULL,
    "return_id" UUID NOT NULL,
    "rental_item_id" UUID NOT NULL,
    "asset_id" UUID,
    "quantity_returned" INTEGER NOT NULL DEFAULT 1,
    "condition_in" "AssetCondition" NOT NULL,
    "accessories_returned_json" JSONB,
    "damage_notes" TEXT,
    "missing_items_json" JSONB,
    "inspection_status" TEXT,
    "additional_charge_draft" DECIMAL(18,2),
    "notes" TEXT,

    CONSTRAINT "return_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "return_item_id" UUID,
    "checklist_json" JSONB,
    "outcome" "InspectionOutcome" NOT NULL,
    "notes" TEXT,
    "inspected_by" UUID,
    "inspected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_jobs" (
    "id" UUID NOT NULL,
    "maintenance_number" TEXT NOT NULL,
    "asset_id" UUID NOT NULL,
    "issue_description" TEXT NOT NULL,
    "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "MaintenanceStatus" NOT NULL DEFAULT 'OPEN',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "labor_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "parts_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "other_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "reported_by" UUID,
    "approved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "rental_id" UUID NOT NULL,
    "issued_at" TIMESTAMP(3),
    "due_at" TIMESTAMP(3),
    "subtotal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "discount_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "delivery_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "pdf_file_key" TEXT,
    "issued_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "line_total" DECIMAL(18,2) NOT NULL,
    "source_rental_item_id" UUID,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "payment_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "method" "PaymentMethod" NOT NULL,
    "provider" TEXT,
    "reference_number" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'RECORDED',
    "notes" TEXT,
    "received_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "allocated_amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_deposits" (
    "id" UUID NOT NULL,
    "rental_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "required_amount" DECIMAL(18,2) NOT NULL,
    "collected_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "refunded_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "applied_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "DepositStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_transactions" (
    "id" UUID NOT NULL,
    "security_deposit_id" UUID NOT NULL,
    "transaction_type" "DepositTransactionType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reference" TEXT,
    "reason" TEXT,
    "performed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "expense_number" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "expense_date" DATE NOT NULL,
    "supplier" TEXT,
    "payment_method" "PaymentMethod",
    "reference_number" TEXT,
    "related_asset_id" UUID,
    "related_rental_id" UUID,
    "attachment_key" TEXT,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" UUID,
    "approved_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "before_json" JSONB,
    "after_json" JSONB,
    "reason" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" UUID NOT NULL,
    "legal_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "logo_file_key" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "tax_identifiers_json" JSONB,
    "invoice_prefix" TEXT NOT NULL DEFAULT 'INV',
    "rental_prefix" TEXT NOT NULL DEFAULT 'RN',
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Dar_es_Salaam',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_code_key" ON "customers"("customer_code");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_full_name_idx" ON "customers"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_categories_code_key" ON "equipment_categories"("code");

-- CreateIndex
CREATE INDEX "equipment_models_category_id_idx" ON "equipment_models"("category_id");

-- CreateIndex
CREATE INDEX "equipment_models_name_idx" ON "equipment_models"("name");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_assets_asset_code_key" ON "equipment_assets"("asset_code");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_assets_qr_code_value_key" ON "equipment_assets"("qr_code_value");

-- CreateIndex
CREATE INDEX "equipment_assets_model_id_idx" ON "equipment_assets"("model_id");

-- CreateIndex
CREATE INDEX "equipment_assets_status_idx" ON "equipment_assets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "asset_accessories_asset_id_accessory_id_key" ON "asset_accessories"("asset_id", "accessory_id");

-- CreateIndex
CREATE INDEX "inventory_movements_asset_id_idx" ON "inventory_movements"("asset_id");

-- CreateIndex
CREATE INDEX "inventory_movements_model_id_idx" ON "inventory_movements"("model_id");

-- CreateIndex
CREATE INDEX "equipment_prices_model_id_pricing_unit_is_active_idx" ON "equipment_prices"("model_id", "pricing_unit", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "rental_requests_request_number_key" ON "rental_requests"("request_number");

-- CreateIndex
CREATE INDEX "rental_requests_customer_id_idx" ON "rental_requests"("customer_id");

-- CreateIndex
CREATE INDEX "rental_requests_status_idx" ON "rental_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_quotation_number_key" ON "quotations"("quotation_number");

-- CreateIndex
CREATE UNIQUE INDEX "rentals_rental_number_key" ON "rentals"("rental_number");

-- CreateIndex
CREATE INDEX "rentals_customer_id_idx" ON "rentals"("customer_id");

-- CreateIndex
CREATE INDEX "rentals_status_idx" ON "rentals"("status");

-- CreateIndex
CREATE INDEX "rentals_expected_return_at_idx" ON "rentals"("expected_return_at");

-- CreateIndex
CREATE INDEX "rental_items_rental_id_idx" ON "rental_items"("rental_id");

-- CreateIndex
CREATE INDEX "rental_items_asset_id_idx" ON "rental_items"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "dispatches_dispatch_number_key" ON "dispatches"("dispatch_number");

-- CreateIndex
CREATE UNIQUE INDEX "returns_return_number_key" ON "returns"("return_number");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_jobs_maintenance_number_key" ON "maintenance_jobs"("maintenance_number");

-- CreateIndex
CREATE INDEX "maintenance_jobs_asset_id_idx" ON "maintenance_jobs"("asset_id");

-- CreateIndex
CREATE INDEX "maintenance_jobs_status_idx" ON "maintenance_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_rental_id_idx" ON "invoices"("rental_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_number_key" ON "payments"("payment_number");

-- CreateIndex
CREATE INDEX "payments_customer_id_idx" ON "payments"("customer_id");

-- CreateIndex
CREATE INDEX "payments_received_at_idx" ON "payments"("received_at");

-- CreateIndex
CREATE INDEX "payment_allocations_payment_id_idx" ON "payment_allocations"("payment_id");

-- CreateIndex
CREATE INDEX "payment_allocations_invoice_id_idx" ON "payment_allocations"("invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_expense_number_key" ON "expenses"("expense_number");

-- CreateIndex
CREATE UNIQUE INDEX "files_storage_key_key" ON "files"("storage_key");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_guarantors" ADD CONSTRAINT "customer_guarantors_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_guarantors" ADD CONSTRAINT "customer_guarantors_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_models" ADD CONSTRAINT "equipment_models_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "equipment_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_assets" ADD CONSTRAINT "equipment_assets_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "equipment_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_images" ADD CONSTRAINT "equipment_images_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "equipment_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_images" ADD CONSTRAINT "equipment_images_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "equipment_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_accessories" ADD CONSTRAINT "equipment_accessories_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "equipment_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_accessories" ADD CONSTRAINT "asset_accessories_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "equipment_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_accessories" ADD CONSTRAINT "asset_accessories_accessory_id_fkey" FOREIGN KEY ("accessory_id") REFERENCES "equipment_accessories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "equipment_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "equipment_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_prices" ADD CONSTRAINT "equipment_prices_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "equipment_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_prices" ADD CONSTRAINT "equipment_prices_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "equipment_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_requests" ADD CONSTRAINT "rental_requests_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_request_items" ADD CONSTRAINT "rental_request_items_rental_request_id_fkey" FOREIGN KEY ("rental_request_id") REFERENCES "rental_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_request_items" ADD CONSTRAINT "rental_request_items_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "equipment_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_rental_request_id_fkey" FOREIGN KEY ("rental_request_id") REFERENCES "rental_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_prepared_by_fkey" FOREIGN KEY ("prepared_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rentals" ADD CONSTRAINT "rentals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_items" ADD CONSTRAINT "rental_items_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_items" ADD CONSTRAINT "rental_items_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "equipment_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_items" ADD CONSTRAINT "rental_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "equipment_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_approvals" ADD CONSTRAINT "price_approvals_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_approvals" ADD CONSTRAINT "price_approvals_rental_item_id_fkey" FOREIGN KEY ("rental_item_id") REFERENCES "rental_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_approvals" ADD CONSTRAINT "price_approvals_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_approvals" ADD CONSTRAINT "price_approvals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatches" ADD CONSTRAINT "dispatches_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_dispatch_id_fkey" FOREIGN KEY ("dispatch_id") REFERENCES "dispatches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_rental_item_id_fkey" FOREIGN KEY ("rental_item_id") REFERENCES "rental_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "equipment_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_id_fkey" FOREIGN KEY ("return_id") REFERENCES "returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_rental_item_id_fkey" FOREIGN KEY ("rental_item_id") REFERENCES "rental_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "equipment_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "equipment_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_return_item_id_fkey" FOREIGN KEY ("return_item_id") REFERENCES "return_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_inspected_by_fkey" FOREIGN KEY ("inspected_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_jobs" ADD CONSTRAINT "maintenance_jobs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "equipment_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_jobs" ADD CONSTRAINT "maintenance_jobs_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_jobs" ADD CONSTRAINT "maintenance_jobs_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_issued_by_fkey" FOREIGN KEY ("issued_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_source_rental_item_id_fkey" FOREIGN KEY ("source_rental_item_id") REFERENCES "rental_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rentals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_security_deposit_id_fkey" FOREIGN KEY ("security_deposit_id") REFERENCES "security_deposits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_related_asset_id_fkey" FOREIGN KEY ("related_asset_id") REFERENCES "equipment_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_related_rental_id_fkey" FOREIGN KEY ("related_rental_id") REFERENCES "rentals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
