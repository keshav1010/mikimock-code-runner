import type {
    Checker,
    CheckerContext
} from "./Checker.js";

import {
    parseJsonSafely
} from "./checkerUtils.js";

export class NQueensChecker implements Checker {

    check(context: CheckerContext): boolean {

        const input =
            parseJsonSafely(context.inputRaw);

        const actual =
            parseJsonSafely(context.actualRaw);

        const n =
            typeof input === "number"
                ? input
                : undefined;

        if (
            typeof n !== "number" ||
            !Array.isArray(actual)
        ) {
            return false;
        }

        for (const board of actual) {
            if (!isValidBoard(board, n)) {
                return false;
            }
        }

        return true;
    }
}

function isValidBoard(
    board: any,
    n: number
): boolean {

    if (
        !Array.isArray(board) ||
        board.length !== n
    ) {
        return false;
    }

    const cols =
        new Set<number>();

    const diag1 =
        new Set<number>();

    const diag2 =
        new Set<number>();

    for (let row = 0; row < n; row++) {

        if (
            typeof board[row] !== "string" ||
            board[row].length !== n
        ) {
            return false;
        }

        let queensInRow = 0;

        for (let col = 0; col < n; col++) {

            const cell =
                board[row][col];

            if (cell !== "." && cell !== "Q") {
                return false;
            }

            if (cell === "Q") {
                queensInRow++;

                if (
                    cols.has(col) ||
                    diag1.has(row - col) ||
                    diag2.has(row + col)
                ) {
                    return false;
                }

                cols.add(col);
                diag1.add(row - col);
                diag2.add(row + col);
            }
        }

        if (queensInRow !== 1) {
            return false;
        }
    }

    return cols.size === n;
}


// import type {
//     Checker,
//     CheckerContext
// } from "./Checker.js";

// export class NQueensChecker implements Checker {

//     check(context: CheckerContext): boolean {

//         const actual =
//             JSON.parse(context.actualRaw);

//         if (!Array.isArray(actual)) {
//             return false;
//         }

//         for (const board of actual) {
//             if (!isValidBoard(board)) {
//                 return false;
//             }
//         }

//         return true;
//     }
// }

// function isValidBoard(board: string[]): boolean {

//     const n =
//         board.length;

//     const cols =
//         new Set<number>();

//     const diag1 =
//         new Set<number>();

//     const diag2 =
//         new Set<number>();

//     for (let row = 0; row < n; row++) {

//         if (typeof board[row] !== "string") {
//             return false;
//         }

//         let queensInRow = 0;

//         for (let col = 0; col < n; col++) {

//             if (board[row][col] === "Q") {
//                 queensInRow++;

//                 if (
//                     cols.has(col) ||
//                     diag1.has(row - col) ||
//                     diag2.has(row + col)
//                 ) {
//                     return false;
//                 }

//                 cols.add(col);
//                 diag1.add(row - col);
//                 diag2.add(row + col);
//             }
//         }

//         if (queensInRow !== 1) {
//             return false;
//         }
//     }

//     return cols.size === n;
// }