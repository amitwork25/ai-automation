export async function frameworkRoutes(app, controller) {
    app.post("/api/framework/refresh", async (req, reply) => controller.refresh(req, reply));
    app.get("/api/framework/status", async (req, reply) => controller.status(req, reply));
}
