import {
    executeCode
} from "./executor.js";

import {
    extractSolutionCode
} from "./solutionExtractor.js";

import type {
    ExecutionConfig,
    TestCase
} from "./core/types.js";

import {
    buildJavaWrapper
} from "./wrappers/JavaWrapperBuilder.js";

import {
    buildCppWrapper
} from "./wrappers/CppWrapperBuilder.js";

import {
    buildPythonWrapper
} from "./wrappers/PythonWrapperBuilder.js";

import {
    buildJsWrapper
} from "./wrappers/JsWrapperBuilder.js";

export async function runFast(
    language: string,
    code: string,
    config: ExecutionConfig,
    input: string
) {

    const solutionCode =
        extractSolutionCode(
            language,
            code
        );

    const testCase: TestCase = {
        testCaseNumber: 1,
        input,
        expectedOutput: ""
    };

    const generatedCode =
        buildRunCode(
            language,
            solutionCode,
            config,
            [testCase]
        );

    const result =
        await executeCode(
            language,
            generatedCode,
            ""
        );

    return parseRunOutput(
        result.output,
        result.error,
        result.status,
        input
    );
}

function buildRunCode(
    language: string,
    solutionCode: string,
    config: ExecutionConfig,
    testCases: TestCase[]
): string {

    switch (language.toLowerCase()) {

        case "java":
            return buildJavaWrapper(
                solutionCode,
                config,
                testCases
            );

        case "cpp":
            return buildCppWrapper(
                solutionCode,
                config,
                testCases
            );

        case "python":
            return buildPythonWrapper(
                solutionCode,
                config,
                testCases
            );

        case "javascript":
            return buildJsWrapper(
                solutionCode,
                config,
                testCases
            );

        default:
            throw new Error(
                `Unsupported language: ${language}`
            );
    }
}

export function parseRunOutput(
    output: string,
    error: string | null,
    status: string,
    input: string
) {

    if (status !== "SUCCESS") {
        return {
            success: false,
            input,
            output: "",
            error: error || status,
            status
        };
    }

    const lines =
        output
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);

    for (const line of lines) {

        let event: any;

        try {
            event = JSON.parse(line);
        } catch {
            continue;
        }

        if (!event || typeof event !== "object" || event.testCase !== 1 ||
            (event.type === "RESULT" && typeof event.actual !== "string") ||
            (event.type === "ERROR" && event.error != null && typeof event.error !== "string")) {
            continue;
        }

        if (event.type === "ERROR") {
            return {
                success: false,
                input,
                output: "",
                error: event.error || "Runtime Error",
                status: "RUNTIME_ERROR"
            };
        }

        if (event.type === "RESULT") {
            return {
                success: true,
                input,
                output: event.actual,
                error: null,
                status: "SUCCESS"
            };
        }
    }

    return {
        success: false,
        input,
        output: "",
        error: "No output produced",
        status: "EXECUTION_FAILED"
    };
}
