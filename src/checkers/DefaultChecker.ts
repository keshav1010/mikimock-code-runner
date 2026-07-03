import type {
    Checker,
    CheckerContext
} from "./Checker.js";

import {
    compareOutput
} from "../core/comparison.js";

import type {
    CompareMode
} from "../core/types.js";

export class DefaultChecker implements Checker {

    constructor(
        private readonly compareMode: CompareMode
    ) {}

    check(context: CheckerContext): boolean {

        return compareOutput(
            context.actualRaw,
            context.expectedRaw,
            this.compareMode
        );
    }
}