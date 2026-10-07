import express, { type Request, type Response, type NextFunction } from "express";
import { timingSafeEqual, createHash, randomUUID } from "node:crypto";
import { runFast } from "./fastRunExecutor.js";
import { submitFast } from "./fastSubmitExecutor.js";
import { executionHealthy } from "./executor.js";
import { BusyError, ExecutionQueue } from "./executionQueue.js";
import { RequestError, validateRequest } from "./requestValidation.js";
import type { serverConfig } from "./config.js";

function failure(submit: boolean, error: string, status: string) {
    return submit ? { totalTests: 0, passedTests: 0, allPassed: false, results: [{ testCaseNumber: 1, input: "", expectedOutput: "", actualOutput: "", passed: false, error, status, executionTimeMs: 0 }] }
        : { success: false, input: "", output: "", error, status };
}
export function createApp(config: ReturnType<typeof serverConfig>, queue: ExecutionQueue) {
    const app = express();
    app.disable("x-powered-by");
    const digest = (value: string) => createHash("sha256").update(value).digest();
    const expected = digest(config.secret);
    app.get("/health", (_req, res) => {
        const healthy = !queue.stats().stopping && executionHealthy();
        res.status(healthy ? 200 : 503).json({ status: healthy ? "ok" : "unavailable", ...queue.stats() });
    });
    app.use((req, res, next) => {
        const supplied = req.header("X-Runner-Secret");
        if (!supplied || !config.secret.trim() || !timingSafeEqual(expected, digest(supplied))) {
            res.status(401).json(failure(req.path === "/submit", "Unauthorized", "UNAUTHORIZED")); return;
        }
        next();
    });
    app.use(express.json({ limit: "200kb", inflate: false }));
    for (const path of ["/run", "/submit"]) {
        app.post(path, async (req, res) => {
            const submit = path === "/submit", id = randomUUID(), started = Date.now();
            const abort = new AbortController();
            res.on("close", () => { if (!res.writableEnded) abort.abort(); });
            try {
                validateRequest(req.body, submit, config);
                if (!executionHealthy()) throw new BusyError("Executor unavailable");
                const result = await queue.run(async () => {
                    if (submit) return submitFast(req.body.language, req.body.code, req.body.executionConfig, req.body.testCases);
                    return runFast(req.body.language, req.body.code, req.body.executionConfig, req.body.input || "");
                }, abort.signal);
                if (!res.destroyed) res.json(result);
            } catch (error) {
                const httpStatus = error instanceof RequestError ? 400 : error instanceof BusyError ? 503 : 500;
                if (httpStatus === 503) res.setHeader("Retry-After", "5");
                if (!res.destroyed) res.status(httpStatus).json(failure(submit,
                    httpStatus === 400 ? (error as Error).message : httpStatus === 503 ? "Runner busy or unavailable" : "Runner execution failed", "EXECUTION_FAILED"));
            } finally {
                console.log(JSON.stringify({ event: "request_complete", id, endpoint: path, httpStatus: res.statusCode, durationMs: Date.now() - started, ...queue.stats() }));
            }
        });
    }
    app.use((_req, res) => res.status(404).json({ error: "Not found" }));
    app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
        const status = error?.type === "entity.too.large" ? 413 : error?.status === 415 ? 415 : 400;
        res.status(status).json(failure(req.path === "/submit", status === 413 ? "Request body too large" : "Invalid JSON request", "EXECUTION_FAILED"));
    });
    return app;
}
