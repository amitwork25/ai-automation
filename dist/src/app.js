import Fastify from "fastify";
import path from "node:path";
import { loadFrameworkConfig, loadServerConfig } from "./config/framework.config.js";
import { FrameworkController } from "./controllers/framework.controller.js";
import { RunsController } from "./controllers/runs.controller.js";
import { FileArtifactStore } from "./infrastructure/artifact-store/fileArtifactStore.js";
import { frameworkRoutes } from "./routes/framework.route.js";
import { runsRoutes } from "./routes/runs.route.js";
import { FrameworkIntelligenceService } from "./services/framework-intelligence/frameworkIntelligence.service.js";
import { GitService } from "./services/git/git.service.js";
import { RunService } from "./services/runs/run.service.js";
import "dotenv/config";
export async function createApp() {
    const frameworkConfig = loadFrameworkConfig();
    const serverConfig = loadServerConfig();
    const app = Fastify({ logger: true });
    const gitService = new GitService(frameworkConfig);
    const frameworkIntelligence = new FrameworkIntelligenceService(gitService, frameworkConfig);
    const frameworkController = new FrameworkController(frameworkIntelligence);
    const artifactStore = new FileArtifactStore(path.resolve("runs"));
    const runService = new RunService(frameworkIntelligence, artifactStore);
    const runsController = new RunsController(runService);
    await frameworkRoutes(app, frameworkController);
    await runsRoutes(app, runsController);
    await frameworkIntelligence.initOnStartup();
    return {
        app,
        serverConfig
    };
}
export async function startServer() {
    const { app, serverConfig } = await createApp();
    await app.listen({
        port: serverConfig.port,
        host: serverConfig.host
    });
}
if (import.meta.url === `file://${process.argv[1]}`) {
    startServer().catch((error) => {
        // Keep startup failure explicit for container/process managers.
        console.error(error);
        process.exit(1);
    });
}
