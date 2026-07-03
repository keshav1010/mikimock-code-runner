import type {
    CompareMode
} from "./types.js";

const DEFAULT_FLOAT_TOLERANCE =
    1e-6;

export function compareOutput(
    actualRaw: string,
    expectedRaw: string,
    compareMode: CompareMode = "EXACT"
): boolean {

    const actual =
        parseJson(actualRaw);

    const expected =
        parseJson(expectedRaw);

    switch (compareMode) {

        case "EXACT":
            return deepEqual(
                actual,
                expected
            );

        case "UNORDERED_LIST":
            return deepEqual(
                normalizeUnorderedList(actual),
                normalizeUnorderedList(expected)
            );

        case "UNORDERED_LIST_OF_LIST":
            return deepEqual(
                normalizeUnorderedListOfList(actual),
                normalizeUnorderedListOfList(expected)
            );

        case "FLOAT_WITH_TOLERANCE":
            return compareFloatWithTolerance(
                actual,
                expected,
                DEFAULT_FLOAT_TOLERANCE
            );

        case "TREE":
            return deepEqual(
                normalizeTree(actual),
                normalizeTree(expected)
            );

        case "LINKED_LIST":
            return deepEqual(
                normalizeLinkedList(actual),
                normalizeLinkedList(expected)
            );

        case "GRAPH":
            return deepEqual(
                normalizeGraph(actual),
                normalizeGraph(expected)
            );

        default:
            return false;
    }
}

function parseJson(value: string): any {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function deepEqual(
    first: any,
    second: any
): boolean {
    return JSON.stringify(first) === JSON.stringify(second);
}

function normalizeUnorderedList(value: any): any {
    if (!Array.isArray(value)) {
        return value;
    }

    return [...value].sort(compareAny);
}

function normalizeUnorderedListOfList(value: any): any {
    if (!Array.isArray(value)) {
        return value;
    }

    return value
        .map((row) =>
            Array.isArray(row)
                ? [...row].sort(compareAny)
                : row
        )
        .sort((a, b) =>
            JSON.stringify(a).localeCompare(
                JSON.stringify(b)
            )
        );
}

function compareFloatWithTolerance(
    actual: any,
    expected: any,
    tolerance: number
): boolean {

    if (
        typeof actual === "number" &&
        typeof expected === "number"
    ) {
        return Math.abs(actual - expected) <= tolerance;
    }

    if (
        Array.isArray(actual) &&
        Array.isArray(expected)
    ) {
        if (actual.length !== expected.length) {
            return false;
        }

        for (let i = 0; i < actual.length; i++) {
            if (
                !compareFloatWithTolerance(
                    actual[i],
                    expected[i],
                    tolerance
                )
            ) {
                return false;
            }
        }

        return true;
    }

    return deepEqual(actual, expected);
}

function normalizeTree(value: any): any {

    if (!Array.isArray(value)) {
        return value;
    }

    const result =
        [...value];

    while (
        result.length > 0 &&
        result[result.length - 1] === null
    ) {
        result.pop();
    }

    return result;
}

function normalizeLinkedList(value: any): any {

    if (value === null) {
        return [];
    }

    if (!Array.isArray(value)) {
        return value;
    }

    return value;
}

function normalizeGraph(value: any): any {

    if (value === null) {
        return [];
    }

    if (!Array.isArray(value)) {
        return value;
    }

    return value.map((neighbors) => {
        if (!Array.isArray(neighbors)) {
            return neighbors;
        }

        return [...neighbors].sort((a, b) => a - b);
    });
}

function compareAny(
    a: any,
    b: any
): number {

    if (
        typeof a === "number" &&
        typeof b === "number"
    ) {
        return a - b;
    }

    return JSON.stringify(a).localeCompare(
        JSON.stringify(b)
    );
}