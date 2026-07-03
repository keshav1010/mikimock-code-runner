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

export function buildPythonWrapper(
    solutionCode: string,
    config: ExecutionConfig,
    testCases: TestCase[]
): string {

    const converter =
        getConverter("python");

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
                            `build_list_node(${codeValue})`;
                    }
                    if (param.type === "tree_node") {
                        codeValue =
                            `build_tree_node(${codeValue})`;
                    }
                    if (param.type === "graph_node") {
                        codeValue =
                            `build_graph_node(${codeValue})`;
                    }

                    return codeValue;
                }).join(", ");

            return `
run_test(
    ${tc.testCaseNumber},
    ${JSON.stringify(tc.expectedOutput || "")},
    lambda: Solution().${config.functionName}(${args})
)`;
        }).join("\n");

    return `
from typing import *
from collections import *
from functools import *
from itertools import *

import bisect
import heapq
import math
import random
import statistics
import json

${converter.serializerCode()}

${solutionCode}

def print_json(type_name, test_case_number, expected, actual, error):
    print(json.dumps({
        "type": type_name,
        "testCase": test_case_number,
        "expected": expected,
        "actual": actual,
        "error": error
    }, separators=(",", ":")))


def run_test(test_case_number, expected, executor):
    try:
        result = executor()
        actual = serialize(result, "${config.returnType}")

        print_json(
            "RESULT",
            test_case_number,
            expected,
            actual,
            None
        )

    except Exception as error:
        print_json(
            "ERROR",
            test_case_number,
            "",
            "",
            str(error)
        )


${testLines}
`;
}