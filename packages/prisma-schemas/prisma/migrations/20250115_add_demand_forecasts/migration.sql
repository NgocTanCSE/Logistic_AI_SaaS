-- Migration: add demand_forecasts table for AI demand predictions
CREATE TABLE "demand_forecasts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "product_id" UUID NOT NULL,
  "forecast_date" TIMESTAMPTZ NOT NULL,
  "demand_quantity" INT NOT NULL,
  "model_version" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "fk_demand_forecast_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_demand_forecasts_product_id" ON "demand_forecasts"("product_id");
CREATE INDEX IF NOT EXISTS "idx_demand_forecasts_forecast_date" ON "demand_forecasts"("forecast_date");
CREATE INDEX IF NOT EXISTS "idx_demand_forecasts_product_date" ON "demand_forecasts"("product_id", "forecast_date");
