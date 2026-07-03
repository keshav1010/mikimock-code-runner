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

import {
    validateSubmitPayload
} from "./core/validation.js";

import {
    getChecker
} from "./checkers/CheckerFactory.js";

export async function submitFast(
    language: string,
    code: string,
    config: ExecutionConfig,
    testCases: TestCase[]
) {

    validateSubmitPayload(
        language,
        code,
        config,
        testCases
    );

    const solutionCode =
        extractSolutionCode(
            language,
            code
        );

    const generatedCode =
        buildSubmitCode(
            language,
            solutionCode,
            config,
            testCases
        );

    const result =
        await executeCode(
            language,
            generatedCode,
            ""
        );

    return parseRunnerOutput(
        result.output,
        result.error,
        result.status,
        config,
        testCases
    );
}

function buildSubmitCode(
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

function parseRunnerOutput(
    output: string,
    error: string | null,
    status: string,
    config: ExecutionConfig,
    testCases: TestCase[]
) {

    if (status !== "SUCCESS") {
        return {
            totalTests: testCases.length,
            passedTests: 0,
            allPassed: false,
            results: [
                {
                    testCaseNumber: 1,
                    input: testCases[0]?.input || "",
                    expectedOutput: testCases[0]?.expectedOutput || "",
                    actualOutput: "",
                    passed: false,
                    error: error || status,
                    status,
                    executionTimeMs: 0
                }
            ]
        };
    }

    const results = [];

    const checker =
        getChecker(
            config.checkerType,
            config.compareMode || "EXACT"
        );

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

        const testCase =
            testCases.find((tc) =>
                tc.testCaseNumber === event.testCase
            );

        if (!testCase) {
            continue;
        }

        if (event.type === "ERROR") {
            results.push({
                testCaseNumber: event.testCase,
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                actualOutput: "",
                passed: false,
                error: event.error || "Runtime Error",
                status: "RUNTIME_ERROR",
                executionTimeMs: 0
            });

            break;
        }

        if (event.type === "RESULT") {

            const passed =
                checker.check({
                    inputRaw: testCase.input,
                    expectedRaw: testCase.expectedOutput,
                    actualRaw: event.actual
                });

            results.push({
                testCaseNumber: event.testCase,
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                actualOutput: event.actual,
                passed,
                error: null,
                status:
                    passed
                        ? "SUCCESS"
                        : "WRONG_ANSWER",
                executionTimeMs: 0
            });

            if (!passed) {
                break;
            }
        }
    }

    const passedTests =
        results.filter((item) => item.passed).length;

    return {
        totalTests: testCases.length,
        passedTests,
        allPassed:
            testCases.length > 0 &&
            passedTests === testCases.length,
        results
    };
}