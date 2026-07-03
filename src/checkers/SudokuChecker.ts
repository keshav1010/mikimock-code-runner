import type {
    Checker,
    CheckerContext
} from "./Checker.js";

import {
    parseJsonSafely
} from "./checkerUtils.js";

export class SudokuChecker implements Checker {

    check(context: CheckerContext): boolean {

        const original =
            parseJsonSafely(context.inputRaw);

        const actual =
            parseJsonSafely(context.actualRaw);

        if (!isBoard(original) || !isBoard(actual)) {
            return false;
        }

        if (!keepsOriginalCells(original, actual)) {
            return false;
        }

        return isSolvedSudoku(actual);
    }
}

function isBoard(board: any): board is string[][] {
    return (
        Array.isArray(board) &&
        board.length === 9 &&
        board.every((row) =>
            Array.isArray(row) &&
            row.length === 9 &&
            row.every((cell) =>
                typeof cell === "string"
            )
        )
    );
}

function keepsOriginalCells(
    original: string[][],
    actual: string[][]
): boolean {

    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {

            const given =
                original[row][col];

            if (
                given !== "." &&
                given !== actual[row][col]
            ) {
                return false;
            }
        }
    }

    return true;
}

function isSolvedSudoku(board: string[][]): boolean {
    return (
        rowsValid(board) &&
        columnsValid(board) &&
        boxesValid(board)
    );
}

function rowsValid(board: string[][]): boolean {
    for (let row = 0; row < 9; row++) {
        if (!validGroup(board[row])) {
            return false;
        }
    }

    return true;
}

function columnsValid(board: string[][]): boolean {
    for (let col = 0; col < 9; col++) {
        const group = [];

        for (let row = 0; row < 9; row++) {
            group.push(board[row][col]);
        }

        if (!validGroup(group)) {
            return false;
        }
    }

    return true;
}

function boxesValid(board: string[][]): boolean {
    for (let boxRow = 0; boxRow < 9; boxRow += 3) {
        for (let boxCol = 0; boxCol < 9; boxCol += 3) {

            const group = [];

            for (let row = boxRow; row < boxRow + 3; row++) {
                for (let col = boxCol; col < boxCol + 3; col++) {
                    group.push(board[row][col]);
                }
            }

            if (!validGroup(group)) {
                return false;
            }
        }
    }

    return true;
}

function validGroup(values: string[]): boolean {

    const seen =
        new Set<string>();

    for (const value of values) {
        if (!/^[1-9]$/.test(value)) {
            return false;
        }

        if (seen.has(value)) {
            return false;
        }

        seen.add(value);
    }

    return seen.size === 9;
}


// import type {
//     Checker,
//     CheckerContext
// } from "./Checker.js";

// export class SudokuChecker implements Checker {

//     check(context: CheckerContext): boolean {

//         const board =
//             JSON.parse(context.actualRaw);

//         if (!Array.isArray(board) || board.length !== 9) {
//             return false;
//         }

//         for (const row of board) {
//             if (!Array.isArray(row) || row.length !== 9) {
//                 return false;
//             }
//         }

//         return (
//             areRowsValid(board) &&
//             areColumnsValid(board) &&
//             areBoxesValid(board)
//         );
//     }
// }

// function areRowsValid(board: string[][]): boolean {
//     for (let row = 0; row < 9; row++) {
//         if (!isValidGroup(board[row])) {
//             return false;
//         }
//     }

//     return true;
// }

// function areColumnsValid(board: string[][]): boolean {
//     for (let col = 0; col < 9; col++) {
//         const group = [];

//         for (let row = 0; row < 9; row++) {
//             group.push(board[row][col]);
//         }

//         if (!isValidGroup(group)) {
//             return false;
//         }
//     }

//     return true;
// }

// function areBoxesValid(board: string[][]): boolean {
//     for (let boxRow = 0; boxRow < 9; boxRow += 3) {
//         for (let boxCol = 0; boxCol < 9; boxCol += 3) {

//             const group = [];

//             for (let row = boxRow; row < boxRow + 3; row++) {
//                 for (let col = boxCol; col < boxCol + 3; col++) {
//                     group.push(board[row][col]);
//                 }
//             }

//             if (!isValidGroup(group)) {
//                 return false;
//             }
//         }
//     }

//     return true;
// }

// function isValidGroup(values: string[]): boolean {

//     const expected =
//         new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);

//     for (const value of values) {
//         if (!expected.has(value)) {
//             return false;
//         }

//         expected.delete(value);
//     }

//     return expected.size === 0;
// }