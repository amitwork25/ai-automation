import type { FastifyInstance } from "fastify";

import { RunsController } from "../controllers/runs.controller.js";
import type { CreateRunRequest } from "../services/runs/run.service.js";

export async function runsRoutes(app: FastifyInstance, controller: RunsController): Promise<void> {
  app.post<{ Body: CreateRunRequest }>("/api/runs", async (req, reply) =>
    controller.create(req, reply)
  );
  app.get<{ Params: { runId: string } }>("/api/runs/:runId", async (req, reply) =>
    controller.get(req, reply)
  );
  app.post<{ Params: { runId: string } }>("/api/runs/:runId/approve", async (req, reply) =>
    controller.approve(req, reply)
  );
}
