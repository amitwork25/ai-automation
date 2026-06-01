import type { FastifyInstance } from "fastify";

import { FrameworkController } from "../controllers/framework.controller.js";

export async function frameworkRoutes(
  app: FastifyInstance,
  controller: FrameworkController
): Promise<void> {
  app.post("/api/framework/refresh", async (req, reply) => controller.refresh(req, reply));
  app.get("/api/framework/status", async (req, reply) => controller.status(req, reply));
}
