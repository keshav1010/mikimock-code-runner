export function getParamValue(
    input: any,
    paramName: string,
    paramIndex: number,
    totalParams: number
): any {

    if (totalParams === 1) {
        return input;
    }

    if (
        input !== null &&
        typeof input === "object" &&
        !Array.isArray(input)
    ) {
        return input[paramName];
    }

    if (Array.isArray(input)) {
        return input[paramIndex];
    }

    throw new Error("Invalid test case input format");
}

export function parseTestInput(rawInput: string): any {
    try {
        return JSON.parse(rawInput);
    } catch {
        throw new Error(`Invalid JSON input: ${rawInput}`);
    }
}