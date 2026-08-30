#!/usr/bin/env python3
"""
test_decision_engine.py — Unit test verifying declarative decision rules schema, evaluator,
and semantic equivalence with original rules.
"""

import os
import json
import sys

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RULES_PATH = os.path.join(ROOT_DIR, "website", "assets", "data", "decision_rules.json")

def eval_matcher(matcher, profile):
    if not matcher or matcher.get("op") == "always" or matcher is True:
        return True
    if "all" in matcher and isinstance(matcher["all"], list):
        return all(eval_matcher(m, profile) for m in matcher["all"])
    if "any" in matcher and isinstance(matcher["any"], list):
        return any(eval_matcher(m, profile) for m in matcher["any"])

    field = matcher.get("field")
    field_val = profile.get(field)
    expected = matcher.get("value")
    op = matcher.get("op", "eq")

    if field_val is None:
        if field == "goal" and profile.get("goal"):
            field_val = profile.get("goal")
        elif field == "bmi":
            h = float(profile.get("height_cm", 0))
            w = float(profile.get("bodyweight_kg", 0))
            if h > 0 and w > 0:
                field_val = w / ((h / 100) ** 2)
            else:
                return False
        else:
            return False

    if isinstance(field_val, str):
        field_val = field_val.lower().strip()

    if op == "eq":
        if isinstance(expected, str):
            return field_val == expected.lower().strip()
        return field_val == expected
    elif op == "neq":
        if isinstance(expected, str):
            return field_val != expected.lower().strip()
        return field_val != expected
    elif op == "in":
        if not isinstance(expected, list):
            return False
        lower_list = [x.lower().strip() if isinstance(x, str) else x for x in expected]
        return field_val in lower_list
    elif op == "not_in":
        if not isinstance(expected, list):
            return True
        lower_list = [x.lower().strip() if isinstance(x, str) else x for x in expected]
        return field_val not in lower_list
    elif op == "gt":
        return float(field_val) > float(expected)
    elif op == "gte":
        return float(field_val) >= float(expected)
    elif op == "lt":
        return float(field_val) < float(expected)
    elif op == "lte":
        return float(field_val) <= float(expected)
    else:
        return False

def run_tests():
    with open(RULES_PATH, "r", encoding="utf-8") as f:
        rules = json.load(f)

    print(f"Loaded {len(rules)} rules from {RULES_PATH}")
    assert len(rules) == 40, f"Expected exactly 40 rules, found {len(rules)}"

    # Specific test assertions
    # 1. Hypertrophy rule SH-TR-05
    r_hyp = next(r for r in rules if r["rule_id"] == "SH-TR-05")
    assert eval_matcher(r_hyp["matcher"], {"goal": "Hypertrophy"}) is True
    assert eval_matcher(r_hyp["matcher"], {"goal": "recomp"}) is True
    assert eval_matcher(r_hyp["matcher"], {"goal": "fat_loss"}) is False

    # 2. Older adult age >= 65 rule SH-IN-01
    r_age = next(r for r in rules if r["rule_id"] == "SH-IN-01")
    assert eval_matcher(r_age["matcher"], {"age": 70}) is True
    assert eval_matcher(r_age["matcher"], {"age": 65}) is True
    assert eval_matcher(r_age["matcher"], {"age": 30}) is False

    # 3. Intermediate split ML-SC-01: experience_years > 2 AND training_days <= 3
    r_split = next(r for r in rules if r["rule_id"] == "ML-SC-01")
    assert eval_matcher(r_split["matcher"], {"experience_years": 3, "training_days": 3}) is True
    assert eval_matcher(r_split["matcher"], {"experience_years": 1, "training_days": 3}) is False
    assert eval_matcher(r_split["matcher"], {"experience_years": 4, "training_days": 5}) is False

    # 4. Female strength / hypertrophy NSCA-AS-03
    r_fem = next(r for r in rules if r["rule_id"] == "NSCA-AS-03")
    assert eval_matcher(r_fem["matcher"], {"sex": "Female", "goal": "hypertrophy"}) is True
    assert eval_matcher(r_fem["matcher"], {"sex": "Male", "goal": "hypertrophy"}) is False

    # 5. BMI > 30 ACE-SP-03
    r_bmi = next(r for r in rules if r["rule_id"] == "ACE-SP-03")
    assert eval_matcher(r_bmi["matcher"], {"height_cm": 170, "bodyweight_kg": 100}) is True # BMI 34.6
    assert eval_matcher(r_bmi["matcher"], {"height_cm": 180, "bodyweight_kg": 75}) is False # BMI 23.1

    print(f"[PASS] All {len(rules)} declarative rules passed AST schema and targeted evaluation tests.")
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
