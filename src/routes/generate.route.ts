import type { FastifyInstance } from "fastify";

import { GenerateController } from "../controllers/generate.controller.js";

export async function generateRoutes(
  app: FastifyInstance,
  controller: GenerateController
): Promise<void> {
  app.post("/generate", async (req, reply) => controller.generate(req, reply));
  app.get<{ Params: { runId: string } }>("/generate/:runId/files", async (req, reply) =>
    controller.getFiles(req, reply)
  );
}
