import type {
    ExecutionConfig,
    TestCase
} from "../core/types.js";

import {
    parseTestInput,
    getParamValue
} from "../core/input.js";

import {
    getConverter
} from "../converters/ConverterFactory.js";

export function buildJavaWrapper(
    solutionCode: string,
    config: ExecutionConfig,
    testCases: TestCase[]
): string {

    const converter =
        getConverter("java");

    const testLines =
        testCases.map((tc) => {

            const input =
                parseTestInput(tc.input);

            const args =
                config.params.map((param, index) => {

                    const value =
                        getParamValue(
                            input,
                            param.name,
                            index,
                            config.params.length
                        );

                    return converter.toCodeValue(
                        value,
                        param.type
                    );
                }).join(", ");

            return `
        runTest(
            ${tc.testCaseNumber},
            ${JSON.stringify(tc.expectedOutput || "")},
            () -> solution.${config.functionName}(${args})
        );`;
        }).join("\n");

    return `
import java.util.*;
import java.io.*;
import java.math.*;

interface TestExecutor {
    Object execute();
}

public class Main {

    public static void main(String[] args) {

        Solution solution =
                new Solution();

${testLines}
    }

    private static void runTest(
            int testCaseNumber,
            String expected,
            TestExecutor executor
    ) {
        try {
            Object result =
                    executor.execute();

            String actual =
                    "void".equals("${config.returnType}")
                            ? "null"
                            : MikiMockSerializer.serialize(
                                    result,
                                    "${config.returnType}"
                            );

            printJson(
                    "RESULT",
                    testCaseNumber,
                    expected,
                    actual,
                    null
            );

        } catch (Throwable error) {
            printJson(
                    "ERROR",
                    testCaseNumber,
                    "",
                    "",
                    error.toString()
            );
        }
    }

    private static void printJson(
            String type,
            int testCaseNumber,
            String expected,
            String actual,
            String error
    ) {
        System.out.println(
                "{"
                + "\\\"type\\\":" + MikiMockSerializer.quote(type) + ","
                + "\\\"testCase\\\":" + testCaseNumber + ","
                + "\\\"expected\\\":" + MikiMockSerializer.quote(expected) + ","
                + "\\\"actual\\\":" + MikiMockSerializer.quote(actual) + ","
                + "\\\"error\\\":" + MikiMockSerializer.quote(error)
                + "}"
        );
    }
}

${converter.serializerCode()}

${solutionCode}
`;
}