import os
import json
import ast
import glob

MOS_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BOOK_ENGINE_PATH = os.path.join(MOS_ROOT, "mos_bot", "core", "book_engine.py")
VAULT_ROOT = os.path.join(MOS_ROOT, "Muscle Operating System")
DATA_OUT_DIR = os.path.join(MOS_ROOT, "website", "assets", "data")

os.makedirs(DATA_OUT_DIR, exist_ok=True)

class JSTranslator(ast.NodeVisitor):
    def visit_Lambda(self, node):
        return self.visit(node.body)
        
    def visit_Compare(self, node):
        left = self.visit(node.left)
        if len(node.ops) != 1:
            raise NotImplementedError("Multiple operators not supported")
        op = node.ops[0]
        right = self.visit(node.comparators[0])
        
        if isinstance(op, ast.In):
            # ["hypertrophy", "cut"].includes(p.goal.toLowerCase())
            return f"({right}).includes({left})"
        elif isinstance(op, ast.Eq):
            return f"({left} === {right})"
        elif isinstance(op, ast.Gt):
            return f"({left} > {right})"
        elif isinstance(op, ast.GtE):
            return f"({left} >= {right})"
        elif isinstance(op, ast.Lt):
            return f"({left} < {right})"
        elif isinstance(op, ast.LtE):
            return f"({left} <= {right})"
        else:
            raise NotImplementedError(f"Op {type(op)} not supported")
            
    def visit_BoolOp(self, node):
        op = " && " if isinstance(node.op, ast.And) else " || "
        values = [self.visit(v) for v in node.values]
        return "(" + op.join(values) + ")"
        
    def visit_Call(self, node):
        func = self.visit(node.func)
        if func == "isinstance":
            var = self.visit(node.args[0])
            return f"(typeof {var} === 'number')"
        # p.goal.lower() -> p.goal.toLowerCase()
        if isinstance(node.func, ast.Attribute) and node.func.attr == "lower":
            obj = self.visit(node.func.value)
            return f"{obj}.toLowerCase()"
        raise NotImplementedError(f"Call {func} not supported")
        
    def visit_Attribute(self, node):
        value = self.visit(node.value)
        return f"{value}.{node.attr}"
        
    def visit_Name(self, node):
        if node.id == "True":
            return "true"
        if node.id == "False":
            return "false"
        return node.id
        
    def visit_Constant(self, node):
        if isinstance(node.value, str):
            return repr(node.value)
        if isinstance(node.value, bool):
            return "true" if node.value else "false"
        return str(node.value)
        
    def visit_Tuple(self, node):
        elts = [self.visit(e) for e in node.elts]
        return "[" + ", ".join(elts) + "]"
        
    def visit_List(self, node):
        elts = [self.visit(e) for e in node.elts]
        return "[" + ", ".join(elts) + "]"

    def visit_BinOp(self, node):
        left = self.visit(node.left)
        right = self.visit(node.right)
        if isinstance(node.op, ast.Div):
            op = "/"
        elif isinstance(node.op, ast.Pow):
            op = "**"
        elif isinstance(node.op, ast.Add):
            op = "+"
        elif isinstance(node.op, ast.Sub):
            op = "-"
        elif isinstance(node.op, ast.Mult):
            op = "*"
        else:
            raise NotImplementedError(f"BinOp {type(node.op)} not supported")
        return f"({left} {op} {right})"
        
def parse_book_rules():
    with open(BOOK_ENGINE_PATH, "r", encoding="utf-8") as f:
        source = f.read()
        
    tree = ast.parse(source)
    rules = []
    
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and getattr(node.func, "id", None) == "BookRule":
            rule_data = {}
            for kw in node.keywords:
                if kw.arg == "trigger":
                    try:
                        translator = JSTranslator()
                        js_expr = translator.visit(kw.value)
                        rule_data["trigger_js"] = js_expr
                    except Exception as e:
                        print(f"Error parsing trigger for rule: {e}")
                        rule_data["trigger_js"] = "false"
                elif isinstance(kw.value, ast.Constant):
                    rule_data[kw.arg] = kw.value.value
                elif isinstance(kw.value, ast.List):
                    rule_data[kw.arg] = [elt.value for elt in kw.value.elts if isinstance(elt, ast.Constant)]
            rules.append(rule_data)
            
    return rules

def parse_vault_data():
    vault_data = {}
    
    # Pillars
    pillars_dir = os.path.join(VAULT_ROOT, "02_PILLARS")
    vault_data["pillars"] = {}
    if os.path.exists(pillars_dir):
        for f in glob.glob(os.path.join(pillars_dir, "*.md")):
            name = os.path.basename(f).replace(".md", "")
            with open(f, "r", encoding="utf-8") as file:
                vault_data["pillars"][name] = file.read()
                
    # Protocols
    protocols_dir = os.path.join(VAULT_ROOT, "04_PROTOCOLS")
    vault_data["protocols"] = {}
    if os.path.exists(protocols_dir):
        for f in glob.glob(os.path.join(protocols_dir, "**/*.md"), recursive=True):
            name = os.path.relpath(f, protocols_dir).replace("\\", "/").replace(".md", "")
            with open(f, "r", encoding="utf-8") as file:
                vault_data["protocols"][name] = file.read()
                
    # Injury Matrix
    matrix_path = os.path.join(VAULT_ROOT, "04_TOOLS", "Injury-Training Compatibility Matrix.md")
    if os.path.exists(matrix_path):
        with open(matrix_path, "r", encoding="utf-8") as file:
            vault_data["injury_matrix"] = file.read()
            
    return vault_data

def main():
    print("Parsing BookDecisionEngine rules...")
    rules = parse_book_rules()
    rules_out = os.path.join(DATA_OUT_DIR, "decision_rules.json")
    with open(rules_out, "w", encoding="utf-8") as f:
        json.dump(rules, f, indent=2)
    print(f"Saved {len(rules)} rules to {rules_out}")
    
    print("Parsing Vault data...")
    vault = parse_vault_data()
    vault_out = os.path.join(DATA_OUT_DIR, "vault_data.json")
    with open(vault_out, "w", encoding="utf-8") as f:
        json.dump(vault, f, separators=(',', ':')) # Compressed
    print(f"Saved Vault data to {vault_out}")

if __name__ == "__main__":
    main()
