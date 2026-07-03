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

export function buildCppWrapper(
    solutionCode: string,
    config: ExecutionConfig,
    testCases: TestCase[]
): string {

    const converter =
        getConverter("cpp");

    const testLines =
        testCases.map((tc) => {

            const input =
                parseTestInput(tc.input);

            const declarations =
                config.params.map((param, index) => {

                    const value =
                        getParamValue(
                            input,
                            param.name,
                            index,
                            config.params.length
                        );

                    return `
        auto ${param.name}_${tc.testCaseNumber} =
                ${converter.toCodeValue(value, param.type)};`;
                }).join("\n");

            const args =
                config.params.map((param) =>
                    `${param.name}_${tc.testCaseNumber}`
                ).join(", ");

            return `
    {
${declarations}

        runTest(
            ${tc.testCaseNumber},
            ${JSON.stringify(tc.expectedOutput || "")},
            [&]() {
                Solution solution;
                return solution.${config.functionName}(${args});
            }
        );
    }`;
        }).join("\n");

    return `
#include <bits/stdc++.h>
using namespace std;

${converter.serializerCode()}

${solutionCode}


void printJson(
        string type,
        int testCaseNumber,
        string expected,
        string actual,
        string error
) {
    cout
        << "{"
        << "\\\"type\\\":" << quote(type) << ","
        << "\\\"testCase\\\":" << testCaseNumber << ","
        << "\\\"expected\\\":" << quote(expected) << ","
        << "\\\"actual\\\":" << quote(actual) << ","
        << "\\\"error\\\":" << quote(error)
        << "}"
        << endl;
}

template<typename Func>
void runTest(
        int testCaseNumber,
        string expected,
        Func executor
) {
    try {
        auto result =
                executor();

        string actual =
                serialize(
                        result,
                        "${config.returnType}"
                );

        printJson(
                "RESULT",
                testCaseNumber,
                expected,
                actual,
                ""
        );

    } catch (...) {
        printJson(
                "ERROR",
                testCaseNumber,
                "",
                "",
                "Runtime Error"
        );
    }
}

int main() {
${testLines}
    return 0;
}
`;
}