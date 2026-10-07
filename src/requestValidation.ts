import { validateSubmitPayload } from "./core/validation.js";
import { getParamValue, parseTestInput } from "./core/input.js";
import type { ExecutionConfig, TestCase } from "./core/types.js";
import type { serverConfig } from "./config.js";

export class RequestError extends Error {}
type Limits = ReturnType<typeof serverConfig>;
const languages = new Set(["java", "cpp", "python", "javascript"]);

function object(value: unknown): value is Record<string, any> {
    return !!value && typeof value === "object" && !Array.isArray(value);
}

function boundedString(value: unknown, max: number, label: string): asserts value is string {
    if (typeof value !== "string" || Buffer.byteLength(value) > max) throw new RequestError(`Invalid or oversized ${label}`);
}

// Limit nesting before recursive converters/checkers run on the Node event loop.
function boundedJson(raw: string) {
    let value: unknown;
    try { value = JSON.parse(raw); } catch { throw new RequestError("Invalid test input/output JSON"); }
    const pending = [{ value, depth: 0 }];
    let nodes = 0;
    while (pending.length) {
        const item = pending.pop()!;
        if (++nodes > 25_000 || item.depth > 32) throw new RequestError("Test data too complex");
        if (item.value && typeof item.value === "object") {
            for (const value of Object.values(item.value)) pending.push({ value, depth: item.depth + 1 });
        }
    }
}

export function validateRequest(body: unknown, submit: boolean, limits: Limits): void {
    if (!object(body)) throw new RequestError("JSON object required");
    if (typeof body.language !== "string" || !languages.has(body.language.toLowerCase())) throw new RequestError("Unsupported language");
    boundedString(body.code, limits.maxCodeBytes, "source code");
    if (!body.code.trim()) throw new RequestError("Code is required");
    const config = body.executionConfig;
    if (!object(config) || !Array.isArray(config.params) || config.params.length > 32) throw new RequestError("Invalid execution config");
    const identifier = /^[A-Za-z_][A-Za-z0-9_]{0,99}$/;
    if (typeof config.functionName !== "string" || !identifier.test(config.functionName)) throw new RequestError("Invalid function name");
    const names = new Set<string>();
    for (const param of config.params) {
        if (!object(param) || typeof param.name !== "string" || !identifier.test(param.name) || names.has(param.name) || param.type === "void") throw new RequestError("Invalid parameter");
        names.add(param.name);
    }
    let cases: TestCase[];
    if (submit) {
        if (!Array.isArray(body.testCases) || !body.testCases.length || body.testCases.length > limits.maxTestCases) throw new RequestError("Invalid test cases");
        cases = body.testCases;
    } else {
        if (body.input !== undefined && body.input !== null) boundedString(body.input, limits.maxInputBytes, "input");
        cases = [{ testCaseNumber: 1, input: body.input || "", expectedOutput: "null" }];
    }
    const ids = new Set<number>();
    for (const tc of cases) {
        if (!object(tc) || !Number.isSafeInteger(tc.testCaseNumber) || tc.testCaseNumber < 1 || tc.testCaseNumber > 1_000_000 || ids.has(tc.testCaseNumber)) throw new RequestError("Invalid test case number");
        ids.add(tc.testCaseNumber);
        boundedString(tc.input, limits.maxInputBytes, "input");
        boundedString(tc.expectedOutput, limits.maxInputBytes, "expected output");
        boundedJson(tc.input);
        boundedJson(tc.expectedOutput);
        const input = parseTestInput(tc.input);
        for (let index = 0; index < config.params.length; index++) {
            const param = config.params[index];
            if (getParamValue(input, param.name, index, config.params.length) === undefined) throw new RequestError("Missing parameter input");
        }
    }
    try { validateSubmitPayload(body.language, body.code, config as ExecutionConfig, cases); }
    catch { throw new RequestError("Invalid execution config or test cases"); }
}
