import "dotenv/config";
import { createApp } from "./app.js";
import { serverConfig } from "./config.js";
import { ExecutionQueue } from "./executionQueue.js";
import { prepareExecutor, cleanupActiveContainers } from "./executor.js";

async function main() {
    const config = serverConfig();
    const queue = new ExecutionQueue(config.concurrency, config.queueSize, config.queueTimeoutMs);
    await prepareExecutor();
    const server = createApp(config, queue).listen(config.port, () => console.log(JSON.stringify({ event: "runner_started", port: config.port, concurrency: config.concurrency })));
    server.requestTimeout = 15_000;
    server.headersTimeout = 10_000;
    server.keepAliveTimeout = 5000;
    server.maxConnections = 256;
    server.on("error", () => { console.error("Runner HTTP server failed"); process.exitCode = 1; });
    let stopping = false;
    const shutdown = async () => {
        if (stopping) return;
        stopping = true;
        queue.stop();
        const closed = new Promise<void>(resolve => server.close(() => resolve()));
        server.closeIdleConnections();
        const deadline = setTimeout(() => { console.error("Shutdown deadline exceeded; startup will reconcile resources"); process.exit(1); }, 45_000);
        try {
            await queue.idle();
            await cleanupActiveContainers();
            server.closeAllConnections();
            await closed;
            clearTimeout(deadline);
            console.log("Runner stopped");
        } catch { console.error("Runner shutdown cleanup failed"); process.exit(1); }
    };
    process.on("SIGTERM", () => void shutdown());
    process.on("SIGINT", () => void shutdown());
}
main().catch(() => { console.error("Runner startup failed: verify RUNNER_SECRET, numeric settings, Docker and preloaded language images"); process.exitCode = 1; });
