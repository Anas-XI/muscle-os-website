#!/usr/bin/env python3
"""
migrate_rules_ast.py — Migrates all 40 original trigger_js rules to precise declarative AST matchers.
"""

import json
import os
import subprocess

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RULES_PATH = os.path.join(ROOT_DIR, "website", "assets", "data", "decision_rules.json")

# Mapping table from rule_id and original trigger_js to declarative matcher
# 100% precise translation of each of the 40 original rules
MATCHER_MAP = {
    "SH-TR-05": {"field": "goal", "op": "in", "value": ["hypertrophy", "build muscle", "recomp"]},
    "SH-TR-06": {"op": "always"},
    "SH-TR-08": {"op": "always"},
    "SH-TR-04": {"field": "goal", "op": "in", "value": ["hypertrophy", "build muscle", "strength"]},
    "SH-NU-01": {"op": "always"},
    "SH-NU-03": {"field": "goal", "op": "in", "value": ["hypertrophy", "build muscle", "recomp"]},
    "SH-PL-02": {"op": "always"},
    "SH-IN-01": {"field": "age", "op": "gte", "value": 65},
    "SH-FA-01": {"op": "always"},
    "ML-TR-04": {"field": "goal", "op": "in", "value": ["hypertrophy", "build muscle", "recomp"]},
    "ML-TR-07": {"op": "always"},
    "ML-SC-01": {"all": [{"field": "experience_years", "op": "gt", "value": 2}, {"field": "training_days", "op": "lte", "value": 3}]},
    "ML-PL-03": {"op": "always"},
    "NSCA-PD-01": {"op": "always"},
    "NSCA-PD-03": {"op": "always"},
    "NSCA-FM-01": {"op": "always"},
    "NSCA-FM-03": {"op": "always"},
    "NSCA-EX-03": {"op": "always"},
    "NSCA-EX-05": {"op": "always"},
    "NSCA-AS-02": {"field": "age", "op": "gte", "value": 50},
    "NSCA-AS-03": {"all": [{"field": "sex", "op": "eq", "value": "female"}, {"field": "goal", "op": "in", "value": ["hypertrophy", "strength", "fat_loss"]}]},
    "ACE-BC-02": {"op": "always"},
    "ACE-SP-03": {"field": "bmi", "op": "gt", "value": 30},
    "ACE-IFT-01": {"op": "always"},
    "ISSA-NC-01": {"op": "always"},
    "IPTA-PD-02": {"op": "always"},
    "IPTA-PD-02S": {"field": "goal", "op": "in", "value": ["strength", "powerlifting", "strongman"]},
    "IPTA-PD-03": {"op": "always"},
    "IPTA-PD-07": {"op": "always"},
    "IPTA-SP-03": {"field": "age", "op": "gte", "value": 65},
    "IPTA-CE-02": {"op": "always"},
    "IPTA-PE-01": {"op": "always"},
    "CNS-EB-01": {"field": "goal", "op": "in", "value": ["fat_loss", "cut"]},
    "CNS-EB-02": {"field": "goal", "op": "in", "value": ["hypertrophy", "build muscle", "strength", "recomp"]},
    "CNS-MA-01": {"op": "always"},
    "CNS-MA-04": {"op": "always"},
    "CNS-SU-01": {"op": "always"},
    "BB-HP-03": {"field": "goal", "op": "in", "value": ["hypertrophy", "build muscle"]},
    "BB-NU-01": {"field": "goal", "op": "in", "value": ["hypertrophy", "build muscle"]},
    "BB-RI-01": {"op": "always"}
}

def migrate():
    with open(RULES_PATH, "r", encoding="utf-8") as f:
        rules = json.load(f)

    assert len(rules) == 40, f"Expected 40 rules, found {len(rules)}"
    print(f"Loaded {len(rules)} rules.")

    for r in rules:
        rid = r["rule_id"]
        assert rid in MATCHER_MAP, f"Unknown rule_id: {rid}"
        r["matcher"] = MATCHER_MAP[rid]
        # Remove any legacy trigger_js if still present
        if "trigger_js" in r:
            del r["trigger_js"]

    with open(RULES_PATH, "w", encoding="utf-8") as f:
        json.dump(rules, f, indent=2, ensure_ascii=False)
    
    root_rules = os.path.join(ROOT_DIR, "assets", "data", "decision_rules.json")
    with open(root_rules, "w", encoding="utf-8") as f:
        json.dump(rules, f, indent=2, ensure_ascii=False)

    print("Migrated all 40 rules to declarative matchers successfully!")

if __name__ == "__main__":
    migrate()
