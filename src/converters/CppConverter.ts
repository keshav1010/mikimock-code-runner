import type { TypeConverter } from "./TypeConverter.js";

export class CppConverter implements TypeConverter {

    toCodeValue(value: any, type: string): string {

        switch (type) {

            case "char":
                return `'${escapeCppChar(value)}'`;

            case "long_array":
            case "list_long":
                return `vector<long long>{${value.join(",")}}`;

            case "double_array":
            case "list_double":
                return `vector<double>{${value.join(",")}}`;

            case "boolean_array":
            case "list_boolean":
                return `vector<bool>{${value.map((x: boolean) => x ? "true" : "false").join(",")}}`;

            case "char_array":
            case "list_char":
                return `vector<char>{${value.map((x: string) => `'${escapeCppChar(x)}'`).join(",")}}`;

            case "long_matrix":
            case "list_list_long":
                return `vector<vector<long long>>{${value
                    .map((row: number[]) => `vector<long long>{${row.join(",")}}`)
                    .join(",")}}`;

            case "double_matrix":
            case "list_list_double":
                return `vector<vector<double>>{${value
                    .map((row: number[]) => `vector<double>{${row.join(",")}}`)
                    .join(",")}}`;

            case "char_matrix":
                return `vector<vector<char>>{${value
                    .map((row: string[]) =>
                        `vector<char>{${row.map((x) => `'${escapeCppChar(x)}'`).join(",")}}`
                    )
                    .join(",")}}`;

            case "string_matrix":
                return `vector<vector<string>>{${value
                    .map((row: string[]) =>
                        `vector<string>{${row.map((x) => JSON.stringify(x)).join(",")}}`
                    )
                    .join(",")}}`;

            

            case "int":
            case "long":
            case "double":
                return String(value);

            case "boolean":
                return value ? "true" : "false";

            case "string":
                return JSON.stringify(value);

            case "int_array":
            case "list_int":
                return `vector<int>{${value.join(",")}}`;

            case "string_array":
            case "list_string":
                return `vector<string>{${value.map((x: string) => JSON.stringify(x)).join(",")}}`;

            case "int_matrix":
            case "list_list_int":
                return `vector<vector<int>>{${value
                    .map((row: number[]) => `vector<int>{${row.join(",")}}`)
                    .join(",")}}`;

            case "list_list_string":
                return `vector<vector<string>>{${value
                    .map((row: string[]) =>
                        `vector<string>{${row.map((x) => JSON.stringify(x)).join(",")}}`
                    )
                    .join(",")}}`;

            case "list_node":
                return `buildListNode(vector<int>{${value.join(",")}})`;
                    
            case "tree_node":
                return `buildTreeNode(vector<optional<int>>{${value
                    .map((item: any) => item === null ? "nullopt" : String(item))
                    .join(",")}})`;

            case "graph_node":
                return `buildGraphNode(vector<vector<int>>{${value
                    .map((row: number[]) => `vector<int>{${row.join(",")}}`)
                    .join(",")}})`;

            default:
                throw new Error(`Unsupported C++ type: ${type}`);
        }
    }

    serializerCode(): string {
    return `
struct ListNode {
    int val;
    ListNode *next;

    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;

    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right)
            : val(x), left(left), right(right) {}
};

class Node {
public:
    int val;
    vector<Node*> neighbors;

    Node() {
        val = 0;
        neighbors = vector<Node*>();
    }

    Node(int _val) {
        val = _val;
        neighbors = vector<Node*>();
    }

    Node(int _val, vector<Node*> _neighbors) {
        val = _val;
        neighbors = _neighbors;
    }
};

string escapeJson(string value) {
    string result;

    for (char ch : value) {
        if (ch == '\\\\') result += "\\\\\\\\";
        else if (ch == '"') result += "\\\\\\\"";
        else if (ch == '\\n') result += "\\\\n";
        else if (ch == '\\r') result += "\\\\r";
        else result += ch;
    }

    return result;
}

string quote(string value) {
    return "\\\"" + escapeJson(value) + "\\\"";
}

ListNode* buildListNode(vector<int> values) {
    ListNode dummy(0);
    ListNode* current = &dummy;

    for (int value : values) {
        current->next = new ListNode(value);
        current = current->next;
    }

    return dummy.next;
}

TreeNode* buildTreeNode(vector<optional<int>> values) {
    if (values.empty() || !values[0].has_value()) {
        return nullptr;
    }

    TreeNode* root = new TreeNode(values[0].value());

    queue<TreeNode*> q;
    q.push(root);

    int index = 1;

    while (!q.empty() && index < values.size()) {
        TreeNode* current = q.front();
        q.pop();

        if (index < values.size() && values[index].has_value()) {
            current->left = new TreeNode(values[index].value());
            q.push(current->left);
        }

        index++;

        if (index < values.size() && values[index].has_value()) {
            current->right = new TreeNode(values[index].value());
            q.push(current->right);
        }

        index++;
    }

    return root;
}
Node* buildGraphNode(vector<vector<int>> adjacency) {

    if (adjacency.empty()) {
        return nullptr;
    }

    unordered_map<int, Node*> nodes;

    for (int i = 1; i <= adjacency.size(); i++) {
        nodes[i] = new Node(i);
    }

    for (int i = 0; i < adjacency.size(); i++) {
        Node* current = nodes[i + 1];

        for (int neighborValue : adjacency[i]) {
            current->neighbors.push_back(
                    nodes[neighborValue]
            );
        }
    }

    return nodes[1];
}
string serialize(char value) {
    return quote(string(1, value));
}

string serialize(int value) {
    return to_string(value);
}

string serialize(long long value) {
    return to_string(value);
}

string serialize(double value) {
    ostringstream out;
    out << value;
    return out.str();
}

string serialize(bool value) {
    return value ? "true" : "false";
}

string serialize(string value) {
    return quote(value);
}

string serialize(vector<int> values) {
    string out = "[";

    for (int i = 0; i < values.size(); i++) {
        if (i > 0) out += ",";
        out += to_string(values[i]);
    }

    out += "]";
    return out;
}

string serialize(vector<long long> values) {
    string out = "[";

    for (int i = 0; i < values.size(); i++) {
        if (i > 0) out += ",";
        out += to_string(values[i]);
    }

    out += "]";
    return out;
}

string serialize(vector<double> values) {
    string out = "[";

    for (int i = 0; i < values.size(); i++) {
        if (i > 0) out += ",";

        ostringstream item;
        item << values[i];
        out += item.str();
    }

    out += "]";
    return out;
}

string serialize(vector<bool> values) {
    string out = "[";

    for (int i = 0; i < values.size(); i++) {
        if (i > 0) out += ",";
        out += values[i] ? "true" : "false";
    }

    out += "]";
    return out;
}

string serialize(vector<char> values) {
    string out = "[";

    for (int i = 0; i < values.size(); i++) {
        if (i > 0) out += ",";
        out += quote(string(1, values[i]));
    }

    out += "]";
    return out;
}

string serialize(vector<string> values) {
    string out = "[";

    for (int i = 0; i < values.size(); i++) {
        if (i > 0) out += ",";
        out += quote(values[i]);
    }

    out += "]";
    return out;
}

string serialize(vector<vector<int>> values) {
    string out = "[";

    for (int i = 0; i < values.size(); i++) {
        if (i > 0) out += ",";
        out += serialize(values[i]);
    }

    out += "]";
    return out;
}

string serialize(vector<vector<long long>> values) {
    string out = "[";

    for (int i = 0; i < values.size(); i++) {
        if (i > 0) out += ",";
        out += serialize(values[i]);
    }

    out += "]";
    return out;
}

string serialize(vector<vector<double>> values) {
    string out = "[";

    for (int i = 0; i < values.size(); i++) {
        if (i > 0) out += ",";
        out += serialize(values[i]);
    }

    out += "]";
    return out;
}

string serialize(vector<vector<char>> values) {
    string out = "[";

    for (int i = 0; i < values.size(); i++) {
        if (i > 0) out += ",";
        out += serialize(values[i]);
    }

    out += "]";
    return out;
}

string serialize(vector<vector<string>> values) {
    string out = "[";

    for (int i = 0; i < values.size(); i++) {
        if (i > 0) out += ",";
        out += serialize(values[i]);
    }

    out += "]";
    return out;
}

string serialize(ListNode* node) {
    string out = "[";
    bool first = true;

    while (node != nullptr) {
        if (!first) out += ",";
        out += to_string(node->val);
        first = false;
        node = node->next;
    }

    out += "]";
    return out;
}

string serialize(TreeNode* root) {
    if (root == nullptr) {
        return "[]";
    }

    vector<string> result;
    queue<TreeNode*> q;
    q.push(root);

    while (!q.empty()) {
        TreeNode* current = q.front();
        q.pop();

        if (current == nullptr) {
            result.push_back("null");
        } else {
            result.push_back(to_string(current->val));
            q.push(current->left);
            q.push(current->right);
        }
    }

    while (!result.empty() && result.back() == "null") {
        result.pop_back();
    }

    string out = "[";

    for (int i = 0; i < result.size(); i++) {
        if (i > 0) out += ",";
        out += result[i];
    }

    out += "]";
    return out;
}

string serialize(char value, string returnType) {
    return serialize(value);
}

string serialize(int value, string returnType) {
    return serialize(value);
}

string serialize(long long value, string returnType) {
    return serialize(value);
}

string serialize(double value, string returnType) {
    return serialize(value);
}

string serialize(bool value, string returnType) {
    return serialize(value);
}

string serialize(string value, string returnType) {
    return serialize(value);
}

string serialize(vector<int> value, string returnType) {
    return serialize(value);
}

string serialize(vector<long long> value, string returnType) {
    return serialize(value);
}

string serialize(vector<double> value, string returnType) {
    return serialize(value);
}

string serialize(vector<bool> value, string returnType) {
    return serialize(value);
}

string serialize(vector<char> value, string returnType) {
    return serialize(value);
}

string serialize(vector<string> value, string returnType) {
    return serialize(value);
}

string serialize(vector<vector<int>> value, string returnType) {
    return serialize(value);
}

string serialize(vector<vector<long long>> value, string returnType) {
    return serialize(value);
}

string serialize(vector<vector<double>> value, string returnType) {
    return serialize(value);
}

string serialize(vector<vector<char>> value, string returnType) {
    return serialize(value);
}

string serialize(vector<vector<string>> value, string returnType) {
    return serialize(value);
}

string serialize(ListNode* node, string returnType) {
    if (node == nullptr) {
        return returnType == "list_node" ? "[]" : "null";
    }

    return serialize(node);
}

string serialize(TreeNode* root, string returnType) {
    if (root == nullptr) {
        return returnType == "tree_node" ? "[]" : "null";
    }

    return serialize(root);
}
    string serialize(Node* node) {

    if (node == nullptr) {
        return "[]";
    }

    map<int, Node*> visited;
    queue<Node*> q;

    q.push(node);
    visited[node->val] = node;

    while (!q.empty()) {
        Node* current = q.front();
        q.pop();

        for (Node* neighbor : current->neighbors) {
            if (!visited.count(neighbor->val)) {
                visited[neighbor->val] = neighbor;
                q.push(neighbor);
            }
        }
    }

    string out = "[";
    bool firstRow = true;

    for (auto &entry : visited) {
        if (!firstRow) {
            out += ",";
        }

        vector<int> neighbors;

        for (Node* neighbor : entry.second->neighbors) {
            neighbors.push_back(neighbor->val);
        }

        sort(neighbors.begin(), neighbors.end());

        out += "[";
        for (int i = 0; i < neighbors.size(); i++) {
            if (i > 0) {
                out += ",";
            }

            out += to_string(neighbors[i]);
        }

        out += "]";
        firstRow = false;
    }

    out += "]";
    return out;
}

string serialize(Node* node, string returnType) {
    if (node == nullptr) {
        if (returnType == "graph_node") {
            return "[]";
        }

        return "null";
    }

    return serialize(node);
}
`;
}
}

function escapeCppChar(value: string): string {
    if (value === "\\") return "\\\\";
    if (value === "'") return "\\'";
    if (value === "\n") return "\\n";
    if (value === "\r") return "\\r";
    if (value === "\t") return "\\t";

    return value;
}