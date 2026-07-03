import type {
    Checker
} from "./Checker.js";

import type {
    CompareMode,
    CheckerType
} from "../core/types.js";

import {
    DefaultChecker
} from "./DefaultChecker.js";

import {
    AnyOrderChecker
} from "./AnyOrderChecker.js";

import {
    NQueensChecker
} from "./NQueensChecker.js";

import {
    SudokuChecker
} from "./SudokuChecker.js";

import {
    TopKFrequentChecker
} from "./TopkFrequentChecker.js";

import {
    GeometryChecker
} from "./GeometryChecker.js";

export function getChecker(
    checkerType: CheckerType | undefined,
    compareMode: CompareMode = "EXACT"
): Checker {

    switch (checkerType || "DEFAULT") {

        case "DEFAULT":
            return new DefaultChecker(compareMode);

        case "ANY_ORDER":
            return new AnyOrderChecker();

        case "N_QUEENS":
            return new NQueensChecker();

        case "SUDOKU":
            return new SudokuChecker();

        case "TOP_K_FREQUENT":
            return new TopKFrequentChecker();

        case "GEOMETRY":
            return new GeometryChecker();

        default:
            throw new Error(
                `Unsupported checker type: ${checkerType}`
            );
    }
}

// import type {
//     Checker
// } from "./Checker.js";

// import type {
//     CompareMode,
//     CheckerType
// } from "../core/types.js";

// import {
//     DefaultChecker
// } from "./DefaultChecker.js";

// import {
//     AnyOrderChecker
// } from "./AnyOrderChecker.js";

// import {
//     NQueensChecker
// } from "./NQueensChecker.js";

// import {
//     SudokuChecker
// } from "./SudokuChecker.js";

// import {
//     TopKFrequentChecker
// } from "./TopkFrequentChecker.js";

// import {
//     GeometryChecker
// } from "./GeometryChecker.js";

// export function getChecker(
//     checkerType: CheckerType | undefined,
//     compareMode: CompareMode = "EXACT"
// ): Checker {

//     switch (checkerType || "DEFAULT") {

//         case "DEFAULT":
//             return new DefaultChecker(compareMode);

//         case "ANY_ORDER":
//             return new AnyOrderChecker();

//         case "N_QUEENS":
//             return new NQueensChecker();

//         case "SUDOKU":
//             return new SudokuChecker();

//         case "TOP_K_FREQUENT":
//             return new TopKFrequentChecker();

//         case "GEOMETRY":
//             return new GeometryChecker();

//         default:
//             throw new Error(
//                 `Unsupported checker type: ${checkerType}`
//             );
//     }
// }