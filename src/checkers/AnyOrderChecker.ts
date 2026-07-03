import type {
    Checker,
    CheckerContext
} from "./Checker.js";

export class AnyOrderChecker implements Checker {

    check(context: CheckerContext): boolean {

        const actual =
            parseJson(context.actualRaw);

        const expected =
            parseJson(context.expectedRaw);

        return JSON.stringify(normalize(actual)) ===
            JSON.stringify(normalize(expected));
    }
}

function parseJson(value: string): any {
    return JSON.parse(value);
}

function normalize(value: any): any {

    if (Array.isArray(value)) {
        return value
            .map((item) => normalize(item))
            .sort((a, b) =>
                JSON.stringify(a).localeCompare(JSON.stringify(b))
            );
    }

    return value;
}