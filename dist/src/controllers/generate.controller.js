export class GenerateController {
    generateService;
    constructor(generateService) {
        this.generateService = generateService;
    }
    async generate(req, reply) {
        try {
            const payload = await this.parseMultipart(req);
            const result = await this.generateService.generate(payload);
            const statusCode = result.status === "failed" ? 422 : 201;
            reply.code(statusCode).send(result);
        }
        catch (error) {
            reply.code(400).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async getFiles(req, reply) {
        try {
            const result = await this.generateService.getGeneratedFiles(req.params.runId);
            reply.code(200).send(result);
        }
        catch (error) {
            reply.code(404).send({
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    async parseMultipart(req) {
        if (!req.isMultipart()) {
            throw new Error("Content-Type must be multipart/form-data with apiContract (YAML) and manualTestCases (JSON) files");
        }
        let apiContractYaml = "";
        let manualTestCasesJson = "";
        let productId;
        let mode;
        let mappingThreshold;
        let strictMapping;
        let llmProfile;
        let useVectorRetrieval;
        for await (const part of req.parts()) {
            if (part.type === "file") {
                const buffer = await part.toBuffer();
                const text = buffer.toString("utf8");
                if (part.fieldname === "apiContract" || part.fieldname === "apiContractYaml") {
                    apiContractYaml = text;
                }
                else if (part.fieldname === "manualTestCases" || part.fieldname === "manualTestCasesJson") {
                    manualTestCasesJson = text;
                }
                continue;
            }
            const value = typeof part.value === "string" ? part.value : String(part.value);
            switch (part.fieldname) {
                case "productId":
                    productId = value.trim() || undefined;
                    break;
                case "mode":
                    mode = value;
                    break;
                case "mappingThreshold":
                    mappingThreshold = Number(value);
                    break;
                case "strictMapping":
                    strictMapping = value === "true" || value === "1";
                    break;
                case "llmProfile":
                    if (value === "minimal" || value === "standard" || value === "full") {
                        llmProfile = value;
                    }
                    break;
                case "useVectorRetrieval":
                    useVectorRetrieval = value === "true" || value === "1";
                    break;
                default:
                    break;
            }
        }
        if (!apiContractYaml.trim()) {
            throw new Error("apiContract file is required (OpenAPI YAML)");
        }
        if (!manualTestCasesJson.trim()) {
            throw new Error("manualTestCases file is required (JSON)");
        }
        return {
            productId,
            mode,
            apiContractYaml,
            manualTestCasesJson,
            mappingThreshold: Number.isFinite(mappingThreshold) ? mappingThreshold : undefined,
            strictMapping,
            llmProfile,
            useVectorRetrieval
        };
    }
}
