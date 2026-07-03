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

export function buildJsWrapper(
    solutionCode: string,
    config: ExecutionConfig,
    testCases: TestCase[]
): string {

    const converter =
        getConverter("javascript");

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

                    let codeValue =
                        converter.toCodeValue(
                            value,
                            param.type
                        );

                    if (param.type === "list_node") {
                        codeValue =
                            `buildListNode(${codeValue})`;
                    }

                    if (param.type === "tree_node") {
                        codeValue =
                            `buildTreeNode(${codeValue})`;
                    }

                    if (param.type === "graph_node") {
                        codeValue =
                            `buildGraphNode(${codeValue})`;
                    }

                    return codeValue;

                }).join(", ");

            return `
runTest(
    ${tc.testCaseNumber},
    ${JSON.stringify(tc.expectedOutput || "")},
    () => new Solution().${config.functionName}(${args})
);`;
        }).join("\n");

    return `
${solutionCode}

${converter.serializerCode()}

function printJson(type, testCase, expected, actual, error) {
    console.log(
        JSON.stringify({
            type,
            testCase,
            expected,
            actual,
            error
        })
    );
}

function runTest(testCaseNumber, expected, executor) {
    try {
        const result =
            executor();

        const actual =
            serialize(result, "${config.returnType}");

        printJson(
            "RESULT",
            testCaseNumber,
            expected,
            actual,
            null
        );

    } catch (error) {
        printJson(
            "ERROR",
            testCaseNumber,
            "",
            "",
            error.message || "Runtime Error"
        );
    }
}

${testLines}
`;
}