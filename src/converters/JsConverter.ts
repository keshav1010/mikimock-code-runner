import type { TypeConverter } from "./TypeConverter.js";

export class JsConverter implements TypeConverter {

    toCodeValue(value: any, type: string): string {
        return JSON.stringify(value);
    }

    serializerCode(): string {
    return `
class ListNode {
    constructor(val = 0, next = null) {
        this.val = val;
        this.next = next;
    }
}

class TreeNode {
    constructor(val = 0, left = null, right = null) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

class Node {
    constructor(val = 0, neighbors = []) {
        this.val = val;
        this.neighbors = neighbors;
    }
}

function buildListNode(values) {
    const dummy = new ListNode(0);
    let current = dummy;

    for (const value of values) {
        current.next = new ListNode(value);
        current = current.next;
    }

    return dummy.next;
}

function buildTreeNode(values) {
    if (!values || values.length === 0 || values[0] === null) {
        return null;
    }

    const root = new TreeNode(values[0]);
    const queue = [root];

    let index = 1;

    while (queue.length > 0 && index < values.length) {
        const current = queue.shift();

        if (index < values.length && values[index] !== null) {
            current.left = new TreeNode(values[index]);
            queue.push(current.left);
        }

        index++;

        if (index < values.length && values[index] !== null) {
            current.right = new TreeNode(values[index]);
            queue.push(current.right);
        }

        index++;
    }
    
    return root;
}

function buildGraphNode(adjacency) {
        if (!adjacency || adjacency.length === 0) {
            return null;
        }

        const nodes = new Map();

        for (let i = 1; i <= adjacency.length; i++) {
            nodes.set(i, new Node(i));
        }

        for (let i = 0; i < adjacency.length; i++) {
            const current = nodes.get(i + 1);

            current.neighbors = adjacency[i].map(
                value => nodes.get(value)
            );
        }

        return nodes.get(1);
}

    

function serializeTreeNode(root) {
    if (root === null) {
        return "[]";
    }

    const result = [];
    const queue = [root];

    while (queue.length > 0) {
        const current = queue.shift();

        if (current === null) {
            result.push(null);
        } else {
            result.push(current.val);
            queue.push(current.left);
            queue.push(current.right);
        }
    }

    while (
        result.length > 0 &&
        result[result.length - 1] === null
    ) {
        result.pop();
    }

    return JSON.stringify(result);
}
    function serializeGraphNode(node) {
    if (node === null) {
        return "[]";
    }

    const visited = new Map();
    const queue = [node];

    visited.set(node.val, node);

    while (queue.length > 0) {
        const current = queue.shift();

        for (const neighbor of current.neighbors) {
            if (!visited.has(neighbor.val)) {
                visited.set(neighbor.val, neighbor);
                queue.push(neighbor);
            }
        }
    }

    const result = [];

    const keys = Array.from(visited.keys())
        .sort((a, b) => a - b);

    for (const key of keys) {
        const neighbors = visited
            .get(key)
            .neighbors
            .map(item => item.val)
            .sort((a, b) => a - b);

        result.push(neighbors);
    }

    return JSON.stringify(result);
}

function serialize(value, returnType = "") {
    if (value === undefined || value === null) {
        if (returnType === "list_node" || returnType === "tree_node"|| returnType === "graph_node") {
            return "[]";
        }

        return "null";
    }

    if (value instanceof ListNode) {
        const result = [];

        while (value !== null) {
            result.push(value.val);
            value = value.next;
        }

        return JSON.stringify(result);
    }

    if (value instanceof TreeNode) {
        return serializeTreeNode(value);
    }

    if (value instanceof Node) {
        return serializeGraphNode(value);
    }

    return JSON.stringify(value);
}
`;
}
}