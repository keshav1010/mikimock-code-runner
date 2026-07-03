export function extractSolutionCode(
    language: string,
    code: string
): string {

    if (language.toLowerCase() === "python") {
        return extractPythonSolution(code);
    }

    return extractBraceSolution(code);
}

function extractBraceSolution(code: string): string {

    const start =
        code.indexOf("class Solution");

    if (start === -1) {
        throw new Error("class Solution not found");
    }

    const braceStart =
        code.indexOf("{", start);

    if (braceStart === -1) {
        throw new Error("Invalid Solution class");
    }

    let depth = 0;

    for (let i = braceStart; i < code.length; i++) {

        if (code[i] === "{") {
            depth++;
        }

        if (code[i] === "}") {
            depth--;
        }

        if (depth === 0) {
            let end = i + 1;

            while (
                end < code.length &&
                /\s/.test(code[end])
            ) {
                end++;
            }

            if (code[end] === ";") {
                end++;
            }

            return code.substring(start, end);
        }
    }

    throw new Error("Could not extract Solution class");
}

function extractPythonSolution(code: string): string {

    const start =
        code.indexOf("class Solution");

    if (start === -1) {
        throw new Error("class Solution not found");
    }

    const lines =
        code.substring(start).split(/\r?\n/);

    const result: string[] = [];

    result.push(lines[0]);

    for (let i = 1; i < lines.length; i++) {

        const line =
            lines[i];

        if (
            line.trim() !== "" &&
            !line.startsWith(" ") &&
            !line.startsWith("\t")
        ) {
            break;
        }

        result.push(line);
    }

    return result.join("\n");
}