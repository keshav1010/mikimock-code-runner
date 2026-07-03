export type CheckerContext = {
    inputRaw: string;
    expectedRaw: string;
    actualRaw: string;
};

export interface Checker {
    check(context: CheckerContext): boolean;
}