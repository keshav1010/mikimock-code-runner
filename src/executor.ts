import { spawn } from "child_process";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const MAX_OUTPUT_SIZE = 20_000;
const DEFAULT_MEMORY_LIMIT_MB = 256;
const DOCKER_TIMEOUT_MS = 20_000;

type ExecutionStatus =
    | "SUCCESS"
    | "COMPILE_ERROR"
    | "RUNTIME_ERROR"
    | "TIME_LIMIT_EXCEEDED"
    | "MEMORY_LIMIT_EXCEEDED"
    | "EXECUTION_FAILED";

export type ExecutionResult = {
    success: boolean;
    output: string;
    error: string | null;
    status: ExecutionStatus;
    executionTimeMs: number;
    memoryKb?: number;
};

type LanguageConfig = {
    fileName: string;
    image: string;
    command: string;
};

export async function executeCode(
    language: string,
    code: string,
    input = ""
): Promise<ExecutionResult> {

    const normalizedLanguage =
        language.trim().toLowerCase();

    const config =
        getLanguageConfig(normalizedLanguage);

    return executeInDocker(
        config,
        code,
        input
    );
}

function getLanguageConfig(
    language: string
): LanguageConfig {

    switch (language) {

        case "java":
            return {
                fileName: "Main.java",
                image: "eclipse-temurin:21-jdk",
                command: "javac Main.java && timeout -k 1s 5s java Main"
            };

        case "cpp":
            return {
                fileName: "main.cpp",
                image: "gcc:13",
                command: "g++ main.cpp -std=c++17 -O2 -o main && timeout -k 1s 5s ./main"
            };

        case "python":
            return {
                fileName: "main.py",
                image: "python:3.11-slim",
                command: "timeout -k 1s 5s python main.py"
            };

        case "javascript":
            return {
                fileName: "main.js",
                image: "node:20-slim",
                command: "timeout -k 1s 5s node main.js"
            };

        default:
            throw new Error(
                `Unsupported language: ${language}`
            );
    }
}

async function executeInDocker(
    config: LanguageConfig,
    code: string,
    input: string
): Promise<ExecutionResult> {

    const startedAt =
        Date.now();

    const dir =
        await mkdtemp(
            join(tmpdir(), "mikimock-")
        );

    try {

        await writeFile(
            join(dir, config.fileName),
            code,
            "utf8"
        );

        const args = [
            "run",
            "--rm",
            "--network", "none",
            "--memory", `${DEFAULT_MEMORY_LIMIT_MB}m`,
            "--memory-swap", `${DEFAULT_MEMORY_LIMIT_MB}m`,
            "--cpus", "1",
            "--pids-limit", "128",
            "--security-opt", "no-new-privileges",
            "-i",
            "-v", `${dir}:/app`,
            "-w", "/app",
            config.image,
            "bash",
            "-lc",
            config.command
        ];

        const result =
            await runCommand(
                "docker",
                args,
                input,
                DOCKER_TIMEOUT_MS
            );

        const status =
            resolveStatus(
                result.exitCode,
                result.stderr,
                result.killed
            );

        const executionTimeMs =
            Date.now() - startedAt;

        const error =
            buildExecutionError(
                status,
                result.stderr
            );

        return {
            success: status === "SUCCESS",
            output:
                status === "SUCCESS"
                    ? result.stdout
                    : "",
            error,
            status,
            executionTimeMs
        };

    } catch (error: any) {

        return {
            success: false,
            output: "",
            error:
                error?.message ||
                "Execution failed",
            status: "EXECUTION_FAILED",
            executionTimeMs:
                Date.now() - startedAt
        };

    } finally {

        await rm(
            dir,
            {
                recursive: true,
                force: true
            }
        );
    }
}

function resolveStatus(
    exitCode: number | null,
    stderr: string,
    killed: boolean
): ExecutionStatus {

    const errorText =
        (stderr || "").toLowerCase();

    if (
        errorText.includes("out of memory") ||
        errorText.includes("cannot allocate memory") ||
        errorText.includes("memoryerror") ||
        exitCode === 137
    ) {
        return "MEMORY_LIMIT_EXCEEDED";
    }

    if (
        errorText.includes("segmentation fault") ||
        errorText.includes("dumped core") ||
        errorText.includes("core dumped")
    ) {
        return "RUNTIME_ERROR";
    }

    if (
        killed ||
        exitCode === null ||
        exitCode === 124 ||
        errorText.includes("time limit exceeded") ||
        errorText.includes("timeout")
    ) {
        return "TIME_LIMIT_EXCEEDED";
    }

    if (exitCode === 0) {
        return "SUCCESS";
    }

    if (
        errorText.includes("error:") ||
        errorText.includes("syntaxerror") ||
        errorText.includes("compilation") ||
        errorText.includes("compile") ||
        errorText.includes("javac") ||
        errorText.includes("g++")
    ) {
        return "COMPILE_ERROR";
    }

    return "RUNTIME_ERROR";
}

function buildExecutionError(
    status: ExecutionStatus,
    stderr: string
): string | null {

    const cleanError =
        stderr || "";

    if (status === "SUCCESS") {
        return null;
    }

    if (status === "TIME_LIMIT_EXCEEDED") {
        return "Time Limit Exceeded";
    }

    if (status === "MEMORY_LIMIT_EXCEEDED") {
        return "Memory Limit Exceeded";
    }

    if (status === "COMPILE_ERROR") {
        return cleanError || "Compilation failed";
    }

    if (status === "RUNTIME_ERROR") {

        const lowerError =
            cleanError.toLowerCase();

        if (
            lowerError.includes("segmentation fault") ||
            lowerError.includes("dumped core") ||
            lowerError.includes("core dumped")
        ) {
            return "Segmentation Fault";
        }

        return cleanError || "Runtime Error";
    }

    return cleanError || "Execution failed";
}

function appendLimited(
    current: string,
    data: Buffer
): string {

    const next =
        current + data.toString();

    return next.length > MAX_OUTPUT_SIZE
        ? next.substring(0, MAX_OUTPUT_SIZE)
        : next;
}

function runCommand(
    command: string,
    args: string[],
    input: string,
    timeoutMs: number
): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
    killed: boolean;
}> {

    return new Promise((resolve) => {

        const child =
            spawn(
                command,
                args,
                {
                    stdio: [
                        "pipe",
                        "pipe",
                        "pipe"
                    ]
                }
            );

        let stdout = "";
        let stderr = "";
        let killed = false;

        const timer =
            setTimeout(() => {
                killed = true;
                child.kill("SIGKILL");
            }, timeoutMs);

        child.stdout.on("data", (data) => {
            stdout =
                appendLimited(stdout, data);
        });

        child.stderr.on("data", (data) => {
            stderr =
                appendLimited(stderr, data);
        });

        child.on("error", (error) => {

            clearTimeout(timer);

            resolve({
                stdout: "",
                stderr: error.message,
                exitCode: 1,
                killed
            });
        });

        child.on("close", (code) => {

            clearTimeout(timer);

            resolve({
                stdout,
                stderr,
                exitCode: code,
                killed
            });
        });

        if (input) {
            child.stdin.write(input);
        }

        child.stdin.end();
    });
}