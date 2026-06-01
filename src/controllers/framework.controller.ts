import type { FastifyReply, FastifyRequest } from "fastify";

import type { IFrameworkIntelligenceService } from "../ports/IFrameworkIntelligenceService.js";

export class FrameworkController {
  constructor(private readonly frameworkIntelligence: IFrameworkIntelligenceService) {}

  async refresh(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const result = await this.frameworkIntelligence.runRefresh();
      reply.code(result.success ? 200 : 503).send(result);
    } catch (error) {
      reply.code(503).send({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async status(_req: FastifyRequest, reply: FastifyReply): Promise<void> {
    const status = await this.frameworkIntelligence.getStatus();
    reply.code(status.ready ? 200 : 503).send(status);
  }
}
