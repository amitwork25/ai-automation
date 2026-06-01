export class RunsController {
    runService;
    constructor(runService) {
        this.runService = runService;
    }
    async create(req, reply) {
        try {
            const result = await this.runService.createRun(req.body || {});
            reply.code(201).send(result);
        }
        catch (error) {
            reply.code(503).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async get(req, reply) {
        try {
            const result = await this.runService.getRun(req.params.runId);
            reply.code(200).send(result);
        }
        catch (error) {
            reply.code(404).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async approve(req, reply) {
        try {
            const result = await this.runService.approveRun(req.params.runId);
            reply.code(200).send(result);
        }
        catch (error) {
            reply.code(400).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
}
