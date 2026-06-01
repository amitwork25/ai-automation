export class FrameworkController {
    frameworkIntelligence;
    constructor(frameworkIntelligence) {
        this.frameworkIntelligence = frameworkIntelligence;
    }
    async refresh(_req, reply) {
        try {
            const result = await this.frameworkIntelligence.runRefresh();
            reply.code(result.success ? 200 : 503).send(result);
        }
        catch (error) {
            reply.code(503).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async status(_req, reply) {
        const status = await this.frameworkIntelligence.getStatus();
        reply.code(status.ready ? 200 : 503).send(status);
    }
}
