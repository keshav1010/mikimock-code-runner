import type { TypeConverter } from "./TypeConverter.js";

export class PythonConverter implements TypeConverter {

    toCodeValue(
    value: any,
    type: string
): string {

    return toPythonLiteral(value);
}

    serializerCode(): string {
    return `
import json

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next


class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Node:
    def __init__(self, val=0, neighbors=None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

def build_list_node(values):
    dummy = ListNode(0)
    current = dummy

    for value in values:
        current.next = ListNode(value)
        current = current.next

    return dummy.next


def build_tree_node(values):
    if not values or values[0] is None:
        return None

    root = TreeNode(values[0])
    queue = deque([root])
    index = 1

    while queue and index < len(values):
        current = queue.popleft()

        if index < len(values) and values[index] is not None:
            current.left = TreeNode(values[index])
            queue.append(current.left)

        index += 1

        if index < len(values) and values[index] is not None:
            current.right = TreeNode(values[index])
            queue.append(current.right)

        index += 1

    return root

def build_graph_node(adjacency):
    if not adjacency:
        return None

    nodes = {
        i: Node(i)
        for i in range(1, len(adjacency) + 1)
    }

    for index, neighbors in enumerate(adjacency, start=1):
        nodes[index].neighbors = [
            nodes[neighbor]
            for neighbor in neighbors
        ]

    return nodes[1]


def serialize_tree_node(root):
    if root is None:
        return "[]"

    result = []
    queue = deque([root])

    while queue:
        current = queue.popleft()

        if current is None:
            result.append(None)
        else:
            result.append(current.val)
            queue.append(current.left)
            queue.append(current.right)

    while result and result[-1] is None:
        result.pop()

    return json.dumps(result, separators=(",", ":"))

def serialize_graph_node(node):
    if node is None:
        return "[]"

    visited = {}
    queue = deque([node])
    visited[node.val] = node

    while queue:
        current = queue.popleft()

        for neighbor in current.neighbors:
            if neighbor.val not in visited:
                visited[neighbor.val] = neighbor
                queue.append(neighbor)

    result = []

    for key in sorted(visited.keys()):
        neighbors = sorted(
            neighbor.val
            for neighbor in visited[key].neighbors
        )

        result.append(neighbors)

    return json.dumps(result, separators=(",", ":"))


def serialize(value, return_type=""):
    if value is None:
        if return_type == "list_node" or return_type == "tree_node" or return_type == "graph_node":
            return "[]"

        return "null"

    if isinstance(value, ListNode):
        result = []

        while value is not None:
            result.append(value.val)
            value = value.next

        return json.dumps(result, separators=(",", ":"))
    
    if isinstance(value, Node):
        return serialize_graph_node(value)

    if isinstance(value, TreeNode):
        return serialize_tree_node(value)

    return json.dumps(value, separators=(",", ":"))

    
`;
}
}

function toPythonLiteral(value: any): string {

    if (value === null) {
        return "None";
    }

    if (typeof value === "boolean") {
        return value ? "True" : "False";
    }

    if (typeof value === "number") {
        return String(value);
    }

    if (typeof value === "string") {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return "[" +
            value
                .map(item => toPythonLiteral(item))
                .join(",") +
            "]";
    }

    throw new Error("Unsupported Python value");
}