export async function generateRoutes(app, controller) {
    app.post("/generate", async (req, reply) => controller.generate(req, reply));
    app.get("/generate/:runId/files", async (req, reply) => controller.getFiles(req, reply));
}
