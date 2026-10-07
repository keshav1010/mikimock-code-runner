import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, writeFile, rm, readdir, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";

const MAX_OUTPUT_BYTES = 20_000;
const LABEL = "mikimock.runner.managed=true";
const WORK_ROOT = resolve(tmpdir(), "mikimock-runner");
const activeContainers = new Set<string>();
let unhealthy = false;
export function executionHealthy() { return !unhealthy; }
type ExecutionStatus = "SUCCESS" | "COMPILE_ERROR" | "RUNTIME_ERROR" | "TIME_LIMIT_EXCEEDED" | "MEMORY_LIMIT_EXCEEDED" | "EXECUTION_FAILED";
export type ExecutionResult = { success: boolean; output: string; error: string | null; status: ExecutionStatus; executionTimeMs: number; memoryKb?: number };
type LanguageConfig = { fileName: string; image: string; command: string };
const configs: Record<string, LanguageConfig> = {
    java: { fileName: "Main.java", image: "eclipse-temurin:21-jdk", command: "timeout -k 1s 15s javac Main.java && timeout -k 1s 5s java Main" },
    cpp: { fileName: "main.cpp", image: "gcc:13", command: "timeout -k 1s 15s g++ main.cpp -std=c++17 -O2 -o main && timeout -k 1s 5s ./main" },
    python: { fileName: "main.py", image: "python:3.11-slim", command: "timeout -k 1s 5s python main.py" },
    javascript: { fileName: "main.js", image: "node:22-slim", command: "timeout -k 1s 5s node main.js" },
};
export function dockerArguments(config: LanguageConfig, dir: string, name: string): string[] {
    return ["run", "--rm", "--pull", "never", "--name", name, "--label", LABEL,
        "--network", "none", "--memory", "256m", "--memory-swap", "256m", "--cpus", "1", "--pids-limit", "128",
        "--user", "65534:65534", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--read-only",
        "--log-driver", "none", "--ulimit", "core=0:0", "--ulimit", "fsize=67108864:67108864",
        "--tmpfs", "/app:rw,exec,nosuid,nodev,size=67108864,nr_inodes=4096,mode=1777",
        "--tmpfs", "/tmp:rw,nosuid,nodev,noexec,size=16777216,mode=1777",
        "-i", "--mount", `type=bind,src=${dir},dst=/source,readonly`, "-w", "/app", config.image,
        "bash", "-lc", `cp /source/${config.fileName} /app/${config.fileName} && ${config.command}`];
}
export type CommandResult = { stdout: string; stderr: string; exitCode: number | null; killed: boolean; outputExceeded: boolean; spawnFailed: boolean };
export function runCommand(command: string, args: string[], input: string, timeoutMs: number): Promise<CommandResult> {
    return new Promise(resolveResult => {
        const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], shell: false });
        const stdout: Buffer[] = [], stderr: Buffer[] = [];
        let bytes = 0, killed = false, outputExceeded = false, spawnFailed = false;
        const kill = () => { killed = true; child.kill("SIGKILL"); };
        const timer = setTimeout(kill, timeoutMs);
        const collect = (target: Buffer[], data: Buffer) => {
            const remaining = Math.max(0, MAX_OUTPUT_BYTES - bytes);
            if (remaining) target.push(data.subarray(0, remaining));
            bytes += data.length;
            if (bytes > MAX_OUTPUT_BYTES && !outputExceeded) { outputExceeded = true; kill(); }
        };
        child.stdout.on("data", data => collect(stdout, data));
        child.stderr.on("data", data => collect(stderr, data));
        child.stdin.on("error", () => { /* Early exit/EPIPE is handled by close. */ });
        child.on("error", () => { spawnFailed = true; });
        child.on("close", code => {
            clearTimeout(timer);
            resolveResult({ stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8"), exitCode: code, killed, outputExceeded, spawnFailed });
        });
        child.stdin.end(input);
    });
}
async function removeContainer(name: string): Promise<void> {
    for (let attempt = 0; attempt < 2; attempt++) {
        const result = await runCommand("docker", ["rm", "--force", name], "", 5000);
        if (result.exitCode === 0 || /No such container/i.test(result.stderr)) { activeContainers.delete(name); return; }
    }
    unhealthy = true;
    throw new Error("Execution container cleanup failed");
}
export async function cleanupActiveContainers(): Promise<void> {
    await Promise.all([...activeContainers].map(removeContainer));
}
export async function prepareExecutor(): Promise<void> {
    // Dedicated host, one process: reconcile only this runner's labelled containers.
    const leftovers = await runCommand("docker", ["ps", "-aq", "--filter", `label=${LABEL}`], "", 5000);
    if (leftovers.exitCode !== 0 || leftovers.outputExceeded) throw new Error("Docker unavailable or too many stale containers");
    for (const id of leftovers.stdout.trim().split(/\s+/).filter(Boolean)) {
        if (!/^[a-f0-9]{12,64}$/.test(id)) throw new Error("Invalid container identifier");
        await removeContainer(id);
    }
    await mkdir(WORK_ROOT, { recursive: true, mode: 0o700 });
    for (const entry of await readdir(WORK_ROOT, { withFileTypes: true })) {
        const path = resolve(WORK_ROOT, entry.name);
        if (entry.name.startsWith("job-") && dirname(path) === WORK_ROOT) await rm(path, { recursive: true, force: true });
    }
    for (const config of Object.values(configs)) {
        const result = await runCommand("docker", ["image", "inspect", config.image, "--format", "{{.Id}}"], "", 5000);
        if (result.exitCode !== 0) throw new Error(`Required execution image unavailable: ${config.image}`);
    }
}
export async function executeCode(language: string, code: string, input = ""): Promise<ExecutionResult> {
    const config = configs[language.trim().toLowerCase()];
    if (!config) throw new Error("Unsupported language");
    const started = Date.now();
    let dir: string | undefined;
    const name = `mikimock-job-${randomUUID()}`;
    let result: ExecutionResult = { success: false, output: "", error: "Execution failed", status: "EXECUTION_FAILED", executionTimeMs: 0 };
    try {
        if (unhealthy) throw new Error("Executor unavailable");
        await mkdir(WORK_ROOT, { recursive: true, mode: 0o700 });
        dir = await mkdtemp(join(WORK_ROOT, "job-"));
        await chmod(dir, 0o755);
        await writeFile(join(dir, config.fileName), code, { encoding: "utf8", mode: 0o644 });
        activeContainers.add(name);
        const command = await runCommand("docker", dockerArguments(config, dir, name), input, 20_000);
        const status = resolveStatus(command);
        result = { success: status === "SUCCESS", output: status === "SUCCESS" ? command.stdout : "", status,
            error: command.outputExceeded ? "Output limit exceeded" : buildExecutionError(status, command.stderr), executionTimeMs: Date.now() - started };
    } catch { result.error = "Execution infrastructure unavailable"; }
    finally {
        try { if (activeContainers.has(name)) await removeContainer(name); }
        catch { result = { ...result, success: false, output: "", status: "EXECUTION_FAILED", error: "Execution cleanup failed" }; }
        try { if (dir && dirname(resolve(dir)) === WORK_ROOT) await rm(dir, { recursive: true, force: true }); }
        catch { unhealthy = true; result = { ...result, success: false, output: "", status: "EXECUTION_FAILED", error: "Temporary execution cleanup failed" }; }
    }
    return { ...result, executionTimeMs: Date.now() - started };
}
function resolveStatus(result: CommandResult): ExecutionStatus {
    if (result.outputExceeded || result.spawnFailed || [125, 126, 127].includes(result.exitCode ?? -1)) return "EXECUTION_FAILED";
    if (result.killed || result.exitCode === null || result.exitCode === 124) return "TIME_LIMIT_EXCEEDED";
    const error = result.stderr.toLowerCase();
    if (error.includes("out of memory") || error.includes("cannot allocate memory") || error.includes("memoryerror") || result.exitCode === 137) return "MEMORY_LIMIT_EXCEEDED";
    if (/segmentation fault|dumped core|core dumped/i.test(error)) return "RUNTIME_ERROR";
    if (result.exitCode === 0) return "SUCCESS";
    if (/error:|syntaxerror|compilation|compile|javac|g\+\+/i.test(error)) return "COMPILE_ERROR";
    return "RUNTIME_ERROR";
}
function buildExecutionError(status: ExecutionStatus, stderr: string): string | null {
    if (status === "SUCCESS") return null;
    if (status === "TIME_LIMIT_EXCEEDED") return "Time Limit Exceeded";
    if (status === "MEMORY_LIMIT_EXCEEDED") return "Memory Limit Exceeded";
    if (status === "EXECUTION_FAILED") return "Execution infrastructure failed";
    if (/segmentation fault|dumped core|core dumped/i.test(stderr)) return "Segmentation Fault";
    return stderr || (status === "COMPILE_ERROR" ? "Compilation failed" : "Runtime Error");
}
