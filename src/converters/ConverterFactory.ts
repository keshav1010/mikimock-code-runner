import type { TypeConverter } from "./TypeConverter.js";
import { JavaConverter } from "./JavaConverter.js";
import { CppConverter } from "./CppConverter.js";
import { PythonConverter } from "./PythonConverter.js";
import { JsConverter } from "./JsConverter.js";

export function getConverter(language: string): TypeConverter {

    switch (language.toLowerCase()) {

        case "java":
            return new JavaConverter();

        case "cpp":
            return new CppConverter();

        case "python":
            return new PythonConverter();

        case "javascript":
            return new JsConverter();

        default:
            throw new Error(`Unsupported language converter: ${language}`);
    }
}