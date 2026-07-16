-- Migration: add billing, payment, and API usage tables
-- Invoice
CREATE TABLE "invoices" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "client_id" UUID,
  "invoice_number" VARCHAR(100) NOT NULL UNIQUE,
  "total_amount" NUMERIC(12,2) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "issued_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "due_at" TIMESTAMPTZ,
  "paid_at" TIMESTAMPTZ,
  CONSTRAINT "fk_invoice_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_invoice_client" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL
);

-- Invoice line items
CREATE TABLE "invoice_line_items" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "invoice_id" UUID NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INT NOT NULL,
  "unit_price" NUMERIC(12,2) NOT NULL,
  "line_total" NUMERIC(12,2) NOT NULL,
  CONSTRAINT "fk_line_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE
);

-- Payment transactions
CREATE TABLE "payment_transactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "invoice_id" UUID NOT NULL,
  "amount" NUMERIC(12,2) NOT NULL,
  "method" VARCHAR(30) NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'INITIATED',
  "transaction_id" VARCHAR(200),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fk_payment_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_payment_invoice" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE
);

-- API usage daily statistics
CREATE TABLE "api_usage_daily" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "date" DATE NOT NULL,
  "endpoint" VARCHAR(200) NOT NULL,
  "method" VARCHAR(10) NOT NULL,
  "count" INT NOT NULL DEFAULT 0,
  CONSTRAINT "fk_api_usage_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
  CONSTRAINT "api_usage_unique" UNIQUE ("tenant_id", "date", "endpoint", "method")
);
