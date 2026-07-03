export type ExecutionStatus =
    | "SUCCESS"
    | "COMPILE_ERROR"
    | "RUNTIME_ERROR"
    | "TIME_LIMIT_EXCEEDED"
    | "EXECUTION_FAILED"
    | "WRONG_ANSWER";

export type CompareMode =
    | "EXACT"
    | "UNORDERED_LIST"
    | "UNORDERED_LIST_OF_LIST"
    | "FLOAT_WITH_TOLERANCE"
    | "TREE"
    | "LINKED_LIST"
    | "GRAPH";

export type ExecutionParam = {
    name: string;
    type: string;
};
export type CheckerType =
    | "DEFAULT"
    | "ANY_ORDER"
    | "N_QUEENS"
    | "SUDOKU"
    | "TOP_K_FREQUENT"
    | "GEOMETRY";

export type ExecutionConfig = {
    functionName: string;
    params: ExecutionParam[];
    returnType: string;
    compareMode?: CompareMode;
    checkerType?: CheckerType;
    outputParam?: string;
};

export type TestCase = {
    testCaseNumber: number;
    input: string;
    expectedOutput: string;
};

export type RunnerEvent = {
    type: "RESULT" | "ERROR";
    testCase: number;
    expected: string;
    actual: string;
    error: string | null;
};

export type CodeTestResult = {
    testCaseNumber: number;
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    error: string | null;
    status: string;
    executionTimeMs: number;
};
export type SupportedLanguage =
    | "java"
    | "cpp"
    | "python"
    | "javascript";

export type ParamType =
    | "int"
    | "long"
    | "double"
    | "boolean"
    | "string"
    | "int_array"
    | "string_array"
    | "int_matrix"
    | "string_matrix"
    | "list_int"
    | "list_string"
    | "list_list_int"
    | "list_list_string"
    | "linked_list_int"
    | "binary_tree_int";







export type RunCodeRequest = {
    language: "java" | "cpp" | "python" | "javascript";
    code: string;
    input?: string;
};


export type SubmitCodeRequest = {
    language: "java";
    code: string;
    testCases: TestCase[];
};

export type TestCaseResult = {
    testCaseNumber: number;
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    error: string | null;
    status: string;
    executionTimeMs: number;
};

export type SubmitCodeResponse = {
    totalTests: number;
    passedTests: number;
    allPassed: boolean;
    results: TestCaseResult[];
};


// export type TestCase = {
//     testCaseNumber: number;
//     input: string;
//     expectedOutput: string;
// };

// export type SubmitCodeRequest = {
//     language: "java" | "cpp" | "python" | "javascript";
//     code: string;
//     testCases: TestCase[];
// };

// export type TestCaseResult = {
//     testCaseNumber: number;
//     input: string;
//     expectedOutput: string;
//     actualOutput: string;
//     passed: boolean;
//     error: string | null;
//     status: string;
//     executionTimeMs: number;
// };

// export type SubmitCodeResponse = {
//     totalTests: number;
//     passedTests: number;
//     allPassed: boolean;
//     results: TestCaseResult[];
// };

// export type SupportedLanguage =
//     | "java"
//     | "cpp"
//     | "python"
//     | "javascript";

// export type RunCodeRequest = {
//     language: SupportedLanguage;
//     code: string;
//     input?: string;
// };

// export type RunCodeResponse = {
//     success: boolean;
//     output: string;
//     error: string | null;
//     status:
//         | "SUCCESS"
//         | "COMPILE_ERROR"
//         | "RUNTIME_ERROR"
//         | "TIME_LIMIT_EXCEEDED"
//         | "EXECUTION_FAILED";
//     executionTimeMs: number;
// };