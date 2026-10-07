import type {
    ExecutionConfig,
    TestCase
} from "./types.js";

import {
    isSupportedType,
    isSupportedCompareMode
} from "./TypeRegistry.js";

import {
    isSupportedCheckerType
} from "./TypeRegistry.js";

export function validateSubmitPayload(
    language: string,
    code: string,
    config: ExecutionConfig,
    testCases: TestCase[]
): void {

    if (!config) {
        throw new Error("Execution config is required");
    }

    if (
        config.checkerType &&
        !isSupportedCheckerType(config.checkerType)
    ) {
        throw new Error(
            `Unsupported checker type: ${config.checkerType}`
        );
    }

    if (!language || !language.trim()) {
        throw new Error("Language is required");
    }

    if (!code || !code.trim()) {
        throw new Error("Code is required");
    }

    if (!config) {
        throw new Error("Execution config is required");
    }

    if (!config.functionName || !config.functionName.trim()) {
        throw new Error("Function name is required");
    }

    if (!Array.isArray(config.params)) {
        throw new Error("Params must be an array");
    }

    for (const param of config.params) {
        if (!param.name || !param.name.trim()) {
            throw new Error("Param name is required");
        }

        if (!isSupportedType(param.type)) {
            throw new Error(`Unsupported param type: ${param.type}`);
        }
    }

    if (!isSupportedType(config.returnType)) {
        throw new Error(`Unsupported return type: ${config.returnType}`);
    }

    if (
        config.compareMode &&
        !isSupportedCompareMode(config.compareMode)
    ) {
        throw new Error(`Unsupported compare mode: ${config.compareMode}`);
    }

    if (!Array.isArray(testCases) || testCases.length === 0) {
        throw new Error("At least one test case is required");
    }

    for (const testCase of testCases) {
        try {
            JSON.parse(testCase.input);
        } catch {
            throw new Error(
                `Invalid input JSON for test case ${testCase.testCaseNumber}`
            );
        }

        try {
            JSON.parse(testCase.expectedOutput);
        } catch {
            throw new Error(
                `Invalid expected output JSON for test case ${testCase.testCaseNumber}`
            );
        }
    }
}
