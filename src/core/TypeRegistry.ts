export const SupportedTypes = new Set([
    "void",

    "int",
    "long",
    "double",
    "boolean",
    "char",
    "string",

    "int_array",
    "long_array",
    "double_array",
    "boolean_array",
    "char_array",
    "string_array",

    "list_int",
    "list_long",
    "list_double",
    "list_boolean",
    "list_char",
    "list_string",

    "int_matrix",
    "long_matrix",
    "double_matrix",
    "char_matrix",
    "string_matrix",

    "list_list_int",
    "list_list_long",
    "list_list_double",
    "list_list_string",

    "list_node",
    "tree_node",
    "graph_node"
]);

export const SupportedCompareModes = new Set([
    "EXACT",
    "UNORDERED_LIST",
    "UNORDERED_LIST_OF_LIST",
    "FLOAT_WITH_TOLERANCE",
    "TREE",
    "LINKED_LIST",
    "GRAPH"
]);

export function isSupportedType(type: string): boolean {
    return SupportedTypes.has(type);
}

export function isSupportedCompareMode(compareMode: string): boolean {
    return SupportedCompareModes.has(compareMode);
}

export const SupportedCheckerTypes = new Set([
    "DEFAULT",
    "ANY_ORDER",
    "N_QUEENS",
    "SUDOKU",
    "TOP_K_FREQUENT",
    "GEOMETRY"
]);

export function isSupportedCheckerType(
    checkerType: string
): boolean {
    return SupportedCheckerTypes.has(checkerType);
}