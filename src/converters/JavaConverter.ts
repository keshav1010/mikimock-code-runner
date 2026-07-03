import type { TypeConverter } from "./TypeConverter.js";

export class JavaConverter implements TypeConverter {

    toCodeValue(value: any, type: string): string {

        switch (type) {

            case "char":
                return `'${escapeJavaChar(value)}'`;

            case "long_array":
                assertArray(value, type);
                return `new long[]{${value.map((x: number) => `${x}L`).join(",")}}`;

            case "double_array":
                assertArray(value, type);
                return `new double[]{${value.join(",")}}`;

            case "boolean_array":
                assertArray(value, type);
                return `new boolean[]{${value.map((x: boolean) => x ? "true" : "false").join(",")}}`;

            case "char_array":
                assertArray(value, type);
                return `new char[]{${value.map((x: string) => `'${escapeJavaChar(x)}'`).join(",")}}`;

            case "list_long":
                assertArray(value, type);
                return `new ArrayList<>(Arrays.asList(${value.map((x: number) => `${x}L`).join(",")}))`;

            case "list_double":
                assertArray(value, type);
                return `new ArrayList<>(Arrays.asList(${value.join(",")}))`;

            case "list_boolean":
                assertArray(value, type);
                return `new ArrayList<>(Arrays.asList(${value.map((x: boolean) => x ? "true" : "false").join(",")}))`;

            case "list_char":
                assertArray(value, type);
                return `new ArrayList<>(Arrays.asList(${value.map((x: string) => `'${escapeJavaChar(x)}'`).join(",")}))`;

            case "long_matrix":
                assertArray(value, type);
                return `new long[][]{${value.map((row: number[]) => `{${row.map((x) => `${x}L`).join(",")}}`).join(",")}}`;

            case "double_matrix":
                assertArray(value, type);
                return `new double[][]{${value.map((row: number[]) => `{${row.join(",")}}`).join(",")}}`;

            case "char_matrix":
                assertArray(value, type);
                return `new char[][]{${value.map((row: string[]) => `{${row.map((x) => `'${escapeJavaChar(x)}'`).join(",")}}`).join(",")}}`;

            case "string_matrix":
                assertArray(value, type);
                return `new String[][]{${value.map((row: string[]) => `{${row.map((x) => JSON.stringify(x)).join(",")}}`).join(",")}}`;

            case "list_list_long":
                assertArray(value, type);
                return `new ArrayList<>(Arrays.asList(${value
                    .map((row: number[]) => `new ArrayList<>(Arrays.asList(${row.map((x) => `${x}L`).join(",")}))`)
                    .join(",")}))`;

            case "list_list_double":
                assertArray(value, type);
                return `new ArrayList<>(Arrays.asList(${value
                    .map((row: number[]) => `new ArrayList<>(Arrays.asList(${row.join(",")}))`)
                    .join(",")}))`;

            case "int":
            case "double":
                return String(value);

            case "long":
                return `${value}L`;

            case "boolean":
                return value ? "true" : "false";

            case "string":
                return JSON.stringify(value);

            case "int_array":
                assertArray(value, type);
                return `new int[]{${value.join(",")}}`;

            case "string_array":
                assertArray(value, type);
                return `new String[]{${value.map((x: string) => JSON.stringify(x)).join(",")}}`;

            case "list_int":
                assertArray(value, type);
                return `new ArrayList<>(Arrays.asList(${value.join(",")}))`;

            case "list_string":
                assertArray(value, type);
                return `new ArrayList<>(Arrays.asList(${value.map((x: string) => JSON.stringify(x)).join(",")}))`;

            case "int_matrix":
                assertArray(value, type);
                return `new int[][]{${value.map((row: number[]) => `{${row.join(",")}}`).join(",")}}`;

            case "list_list_int":
                assertArray(value, type);
                return `new ArrayList<>(Arrays.asList(${value
                    .map((row: number[]) => `new ArrayList<>(Arrays.asList(${row.join(",")}))`)
                    .join(",")}))`;

            case "list_list_string":
                assertArray(value, type);
                return `new ArrayList<>(Arrays.asList(${value
                    .map((row: string[]) =>
                        `new ArrayList<>(Arrays.asList(${row.map((x) => JSON.stringify(x)).join(",")}))`
                    )
                    .join(",")}))`;

            case "list_node":
                assertArray(value, type);
                return `MikiMockListNodeBuilder.build(new int[]{${value.join(",")}})`;

            case "tree_node":
                assertArray(value, type);
                return `MikiMockTreeNodeBuilder.build(${toJavaIntegerList(value)})`;

            case "graph_node":
                assertArray(value, type);
                return `MikiMockGraphNodeBuilder.build(${toJavaGraphList(value)})`;

            default:
                throw new Error(`Unsupported Java type: ${type}`);
        }
    }

    

    serializerCode(): string {
        return `

    class ListNode {
        int val;
        ListNode next;

        ListNode() {}

        ListNode(int val) {
            this.val = val;
        }

        ListNode(int val, ListNode next) {
            this.val = val;
            this.next = next;
        }
    }

class MikiMockListNodeBuilder {

    static ListNode build(int[] values) {

        ListNode dummy =
                new ListNode(0);

        ListNode current =
                dummy;

        for (int value : values) {
            current.next =
                    new ListNode(value);

            current =
                    current.next;
        }

        return dummy.next;
    }
}

class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;

    TreeNode() {}

    TreeNode(int val) {
        this.val = val;
    }

    TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

class MikiMockTreeNodeBuilder {

    static TreeNode build(Integer[] values) {

        if (values.length == 0 || values[0] == null) {
            return null;
        }

        TreeNode root =
                new TreeNode(values[0]);

        Queue<TreeNode> queue =
                new LinkedList<>();

        queue.add(root);

        int index = 1;

        while (!queue.isEmpty() && index < values.length) {

            TreeNode current =
                    queue.poll();

            if (index < values.length && values[index] != null) {
                current.left =
                        new TreeNode(values[index]);

                queue.add(current.left);
            }

            index++;

            if (index < values.length && values[index] != null) {
                current.right =
                        new TreeNode(values[index]);

                queue.add(current.right);
            }

            index++;
        }

        return root;
    }
}

class Node {
    public int val;
    public List<Node> neighbors;

    public Node() {
        val = 0;
        neighbors = new ArrayList<>();
    }

    public Node(int val) {
        this.val = val;
        neighbors = new ArrayList<>();
    }

    public Node(int val, ArrayList<Node> neighbors) {
        this.val = val;
        this.neighbors = neighbors;
    }
}

class MikiMockGraphNodeBuilder {

    static Node build(int[][] adjacency) {

        if (adjacency.length == 0) {
            return null;
        }

        Map<Integer, Node> nodes =
                new HashMap<>();

        for (int i = 1; i <= adjacency.length; i++) {
            nodes.put(i, new Node(i));
        }

        for (int i = 0; i < adjacency.length; i++) {
            Node current =
                    nodes.get(i + 1);

            for (int neighborValue : adjacency[i]) {
                current.neighbors.add(
                        nodes.get(neighborValue)
                );
            }
        }

        return nodes.get(1);
    }
}

class MikiMockSerializer {

    static String serializeTreeNode(TreeNode root) {

        if (root == null) {
            return "[]";
        }

        List<String> result =
                new ArrayList<>();

        Queue<TreeNode> queue =
                new LinkedList<>();

        queue.add(root);

        while (!queue.isEmpty()) {

            TreeNode current =
                    queue.poll();

            if (current == null) {
                result.add("null");
            } else {
                result.add(String.valueOf(current.val));
                queue.add(current.left);
                queue.add(current.right);
            }
        }

        int last =
                result.size() - 1;

        while (
                last >= 0 &&
                "null".equals(result.get(last))
        ) {
            last--;
        }

        return "[" + String.join(",", result.subList(0, last + 1)) + "]";
    }

    static String serialize(Object value, String returnType) {
        if (value instanceof Character) {
            return quote(String.valueOf(value));
        }

        if (value instanceof long[]) {
            long[] arr = (long[]) value;
            List<String> items = new ArrayList<>();

            for (long item : arr) {
                items.add(String.valueOf(item));
            }

            return "[" + String.join(",", items) + "]";
        }

        if (value instanceof double[]) {
            double[] arr = (double[]) value;
            List<String> items = new ArrayList<>();

            for (double item : arr) {
                items.add(String.valueOf(item));
            }

            return "[" + String.join(",", items) + "]";
        }

        if (value instanceof boolean[]) {
            boolean[] arr = (boolean[]) value;
            List<String> items = new ArrayList<>();

            for (boolean item : arr) {
                items.add(String.valueOf(item));
            }

            return "[" + String.join(",", items) + "]";
        }

        if (value instanceof char[]) {
            char[] arr = (char[]) value;
            List<String> items = new ArrayList<>();

            for (char item : arr) {
                items.add(quote(String.valueOf(item)));
            }

            return "[" + String.join(",", items) + "]";
        }

        if (value instanceof long[][]) {
            long[][] matrix = (long[][]) value;
            List<String> rows = new ArrayList<>();

            for (long[] row : matrix) {
                rows.add(serialize(row, "long_array"));
            }

            return "[" + String.join(",", rows) + "]";
        }

        if (value instanceof double[][]) {
            double[][] matrix = (double[][]) value;
            List<String> rows = new ArrayList<>();

            for (double[] row : matrix) {
                rows.add(serialize(row, "double_array"));
            }

            return "[" + String.join(",", rows) + "]";
        }

        if (value instanceof char[][]) {
            char[][] matrix = (char[][]) value;
            List<String> rows = new ArrayList<>();

            for (char[] row : matrix) {
                rows.add(serialize(row, "char_array"));
            }

            return "[" + String.join(",", rows) + "]";
        }

        if (value instanceof String[][]) {
            String[][] matrix = (String[][]) value;
            List<String> rows = new ArrayList<>();

            for (String[] row : matrix) {
                rows.add(serialize(row, "string_array"));
            }

            return "[" + String.join(",", rows) + "]";
        }


        if (value == null) {
            if ("list_node".equals(returnType) || "tree_node".equals(returnType) ||
            "graph_node".equals(returnType)) {
                return "[]";
            }

            return "null";
        }

        if (value instanceof String) {
            return quote((String) value);
        }

        if (value instanceof Boolean || value instanceof Number) {
            return String.valueOf(value);
        }

        if (value instanceof int[]) {
            int[] arr = (int[]) value;
            List<String> items = new ArrayList<>();

            for (int item : arr) {
                items.add(String.valueOf(item));
            }

            return "[" + String.join(",", items) + "]";
        }

        if (value instanceof String[]) {
            String[] arr = (String[]) value;
            List<String> items = new ArrayList<>();

            for (String item : arr) {
                items.add(quote(item));
            }

            return "[" + String.join(",", items) + "]";
        }

        if (value instanceof int[][]) {
            int[][] matrix = (int[][]) value;
            List<String> rows = new ArrayList<>();

            for (int[] row : matrix) {
                rows.add(serialize(row, "int_array"));
            }

            return "[" + String.join(",", rows) + "]";
        }

        if (value instanceof List) {
            List<?> list = (List<?>) value;
            List<String> items = new ArrayList<>();

            for (Object item : list) {
                items.add(serialize(item, ""));
            }

            return "[" + String.join(",", items) + "]";
        }

        if (value instanceof ListNode) {
            ListNode node = (ListNode) value;
            List<String> items = new ArrayList<>();

            while (node != null) {
                items.add(String.valueOf(node.val));
                node = node.next;
            }

            return "[" + String.join(",", items) + "]";
        }

        if (value instanceof TreeNode) {
            return serializeTreeNode((TreeNode) value);
        }

        if (value instanceof Node) {
            return serializeGraphNode((Node) value);
        }

        return quote(String.valueOf(value));
    }

    static String serializeGraphNode(Node node) {

            if (node == null) {
                return "[]";
            }

            Map<Integer, Node> visited =
                    new TreeMap<>();

            Queue<Node> queue =
                    new LinkedList<>();

            queue.add(node);
            visited.put(node.val, node);

            while (!queue.isEmpty()) {

                Node current =
                        queue.poll();

                for (Node neighbor : current.neighbors) {
                    if (!visited.containsKey(neighbor.val)) {
                        visited.put(neighbor.val, neighbor);
                        queue.add(neighbor);
                    }
                }
            }

            List<String> rows =
                    new ArrayList<>();

            for (Integer key : visited.keySet()) {
                Node current =
                        visited.get(key);

                List<Integer> neighbors =
                        new ArrayList<>();

                for (Node neighbor : current.neighbors) {
                    neighbors.add(neighbor.val);
                }

                Collections.sort(neighbors);

                List<String> values =
                        new ArrayList<>();

                for (Integer neighbor : neighbors) {
                    values.add(String.valueOf(neighbor));
                }

                rows.add("[" + String.join(",", values) + "]");
            }

            return "[" + String.join(",", rows) + "]";
        }

    static String quote(String value) {

        if (value == null) {
            return "null";
        }

        return "\\\"" +
                value
                    .replace("\\\\", "\\\\\\\\")
                    .replace("\\\"", "\\\\\\\"")
                    .replace("\\n", "\\\\n")
                    .replace("\\r", "\\\\r")
                + "\\\"";
    }
}
`;
    }
}

function toJavaIntegerList(value: any[]): string {
    return `new Integer[]{${value
        .map((item) => item === null ? "null" : String(item))
        .join(",")}}`;
}

function assertArray(value: any, type: string): void {
    if (!Array.isArray(value)) {
        throw new Error(`Expected ${type}, but got ${JSON.stringify(value)}`);
    }
}

function escapeJavaChar(value: string): string {
    if (value === "\\") return "\\\\";
    if (value === "'") return "\\'";
    if (value === "\n") return "\\n";
    if (value === "\r") return "\\r";
    if (value === "\t") return "\\t";

    return value;
}

function toJavaGraphList(value: any[]): string {
    return `new int[][]{${value
        .map((row: number[]) => `{${row.join(",")}}`)
        .join(",")}}`;
}