export async function runsRoutes(app, controller) {
    app.post("/api/runs", async (req, reply) => controller.create(req, reply));
    app.get("/api/runs/:runId", async (req, reply) => controller.get(req, reply));
    app.post("/api/runs/:runId/approve", async (req, reply) => controller.approve(req, reply));
}
