-- CreateEnum
CREATE TYPE "StaffHireStatus" AS ENUM ('ISSUED', 'PARTIAL', 'RETURNED', 'CANCELLED');

-- CreateTable
CREATE TABLE "staff_hires" (
    "id" UUID NOT NULL,
    "hire_number" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "issued_by_id" UUID,
    "received_by_id" UUID,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_return_at" TIMESTAMP(3),
    "returned_at" TIMESTAMP(3),
    "purpose" TEXT,
    "siteLocation" TEXT,
    "notes" TEXT,
    "status" "StaffHireStatus" NOT NULL DEFAULT 'ISSUED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_hires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_hire_items" (
    "id" UUID NOT NULL,
    "staff_hire_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "model_id" UUID NOT NULL,
    "condition_out" "AssetCondition" NOT NULL DEFAULT 'GOOD',
    "condition_in" "AssetCondition",
    "returned_at" TIMESTAMP(3),
    "accessories" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_hire_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_hires_hire_number_key" ON "staff_hires"("hire_number");

-- CreateIndex
CREATE INDEX "staff_hires_user_id_idx" ON "staff_hires"("user_id");

-- CreateIndex
CREATE INDEX "staff_hires_status_idx" ON "staff_hires"("status");

-- CreateIndex
CREATE INDEX "staff_hires_issued_at_idx" ON "staff_hires"("issued_at");

-- CreateIndex
CREATE INDEX "staff_hire_items_staff_hire_id_idx" ON "staff_hire_items"("staff_hire_id");

-- CreateIndex
CREATE INDEX "staff_hire_items_asset_id_idx" ON "staff_hire_items"("asset_id");

-- AddForeignKey
ALTER TABLE "staff_hires" ADD CONSTRAINT "staff_hires_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_hires" ADD CONSTRAINT "staff_hires_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_hires" ADD CONSTRAINT "staff_hires_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_hire_items" ADD CONSTRAINT "staff_hire_items_staff_hire_id_fkey" FOREIGN KEY ("staff_hire_id") REFERENCES "staff_hires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_hire_items" ADD CONSTRAINT "staff_hire_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "equipment_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_hire_items" ADD CONSTRAINT "staff_hire_items_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "equipment_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
