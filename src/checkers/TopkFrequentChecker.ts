import type {
    Checker,
    CheckerContext
} from "./Checker.js";

import {
    parseJsonSafely
} from "./checkerUtils.js";

export class TopKFrequentChecker implements Checker {

    check(context: CheckerContext): boolean {

        const input =
            parseJsonSafely(context.inputRaw);

        const actual =
            parseJsonSafely(context.actualRaw);

        const parsed =
            extractInput(input);

        if (!parsed) {
            return false;
        }

        const {
            nums,
            k
        } = parsed;

        if (!Array.isArray(actual)) {
            return false;
        }

        if (actual.length !== k) {
            return false;
        }

        const uniqueActual =
            new Set(actual);

        if (uniqueActual.size !== actual.length) {
            return false;
        }

        const frequency =
            buildFrequency(nums);

        const sorted =
            [...frequency.entries()]
                .sort((a, b) => {
                    if (b[1] !== a[1]) {
                        return b[1] - a[1];
                    }

                    return String(a[0]).localeCompare(String(b[0]));
                });

        if (k <= 0 || k > sorted.length) {
            return false;
        }

        const threshold =
            sorted[k - 1][1];

        // Threshold ties are allowed, but every strictly more frequent item is mandatory.
        for (const [value, count] of frequency) {
            if (count > threshold && !uniqueActual.has(value)) return false;
        }

        for (const value of actual) {
            if (!frequency.has(value)) {
                return false;
            }

            if ((frequency.get(value) || 0) < threshold) {
                return false;
            }
        }

        return true;
    }
}

function extractInput(input: any): {
    nums: any[];
    k: number;
} | null {

    if (Array.isArray(input)) {
        const nums =
            input[0];

        const k =
            input[1];

        if (Array.isArray(nums) && typeof k === "number") {
            return {
                nums,
                k
            };
        }
    }

    if (
        input &&
        typeof input === "object" &&
        Array.isArray(input.nums) &&
        typeof input.k === "number"
    ) {
        return {
            nums: input.nums,
            k: input.k
        };
    }

    return null;
}

function buildFrequency(values: any[]): Map<any, number> {

    const map =
        new Map<any, number>();

    for (const value of values) {
        map.set(
            value,
            (map.get(value) || 0) + 1
        );
    }

    return map;
}


// import type {
//     Checker,
//     CheckerContext
// } from "./Checker.js";

// export class TopKFrequentChecker implements Checker {

//     check(context: CheckerContext): boolean {

//         const input =
//             JSON.parse(context.inputRaw);

//         const actual =
//             JSON.parse(context.actualRaw);

//         const nums =
//             Array.isArray(input)
//                 ? input[0]
//                 : input.nums;

//         const k =
//             Array.isArray(input)
//                 ? input[1]
//                 : input.k;

//         if (!Array.isArray(nums) || !Array.isArray(actual)) {
//             return false;
//         }

//         if (actual.length !== k) {
//             return false;
//         }

//         const frequency =
//             new Map<number, number>();

//         for (const num of nums) {
//             frequency.set(
//                 num,
//                 (frequency.get(num) || 0) + 1
//             );
//         }

//         const sorted =
//             [...frequency.entries()]
//                 .sort((a, b) => {
//                     if (b[1] !== a[1]) {
//                         return b[1] - a[1];
//                     }

//                     return a[0] - b[0];
//                 });

//         const minAllowedFrequency =
//             sorted[k - 1][1];

//         const actualSet =
//             new Set(actual);

//         for (const value of actual) {
//             if (!frequency.has(value)) {
//                 return false;
//             }

//             if ((frequency.get(value) || 0) < minAllowedFrequency) {
//                 return false;
//             }
//         }

//         return actualSet.size === actual.length;
//     }
// }
