export function parseJsonSafely(value: string): any {
    try {
        return JSON.parse(value);
    } catch {
        return undefined;
    }
}

export function deepEqual(first: any, second: any): boolean {
    return JSON.stringify(first) === JSON.stringify(second);
}

export function compareWithTolerance(
    actual: any,
    expected: any,
    epsilon = 1e-6
): boolean {

    if (
        typeof actual === "number" &&
        typeof expected === "number"
    ) {
        return Math.abs(actual - expected) <= epsilon;
    }

    if (
        Array.isArray(actual) &&
        Array.isArray(expected)
    ) {
        if (actual.length !== expected.length) {
            return false;
        }

        for (let i = 0; i < actual.length; i++) {
            if (!compareWithTolerance(actual[i], expected[i], epsilon)) {
                return false;
            }
        }

        return true;
    }

    return actual === expected;
}