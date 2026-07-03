import type {
    Checker,
    CheckerContext
} from "./Checker.js";

import {
    parseJsonSafely,
    compareWithTolerance
} from "./checkerUtils.js";

const DEFAULT_EPSILON =
    1e-6;

export class GeometryChecker implements Checker {

    constructor(
        private readonly epsilon = DEFAULT_EPSILON
    ) {}

    check(context: CheckerContext): boolean {

        const actual =
            parseJsonSafely(context.actualRaw);

        const expected =
            parseJsonSafely(context.expectedRaw);

        if (
            actual === undefined ||
            expected === undefined
        ) {
            return false;
        }

        return compareWithTolerance(
            actual,
            expected,
            this.epsilon
        );
    }
}

// import type {
//     Checker,
//     CheckerContext
// } from "./Checker.js";

// const EPSILON =
//     1e-6;

// export class GeometryChecker implements Checker {

//     check(context: CheckerContext): boolean {

//         const actual =
//             JSON.parse(context.actualRaw);

//         const expected =
//             JSON.parse(context.expectedRaw);

//         return compareWithTolerance(
//             actual,
//             expected
//         );
//     }
// }

// function compareWithTolerance(
//     actual: any,
//     expected: any
// ): boolean {

//     if (
//         typeof actual === "number" &&
//         typeof expected === "number"
//     ) {
//         return Math.abs(actual - expected) <= EPSILON;
//     }

//     if (
//         Array.isArray(actual) &&
//         Array.isArray(expected)
//     ) {
//         if (actual.length !== expected.length) {
//             return false;
//         }

//         for (let i = 0; i < actual.length; i++) {
//             if (!compareWithTolerance(actual[i], expected[i])) {
//                 return false;
//             }
//         }

//         return true;
//     }

//     return actual === expected;
// }