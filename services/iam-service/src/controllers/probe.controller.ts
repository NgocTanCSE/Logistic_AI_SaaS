import { Controller, Get } from "@nestjs/common"

@Controller("admin")
export class ProbeController {
  @Get("keys")
  keys() {
    return { ok: true, keys: [], message: "No API keys configured" }
  }

  @Get("env")
  env() {
    return { ok: true, environment: process.env.NODE_ENV || "development" }
  }

  @Get("models")
  models() {
    return { ok: true, models: ["User", "Order", "Product", "Warehouse"] }
  }
}