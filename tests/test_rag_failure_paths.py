"""Test rag_failed flag combinations across the decision-gate path."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from mos_bot.core.context_loader import evaluate_rag_impact
from mos_bot.core.models import ClientProfile


def test_evaluate_rag_impact_no_failure():
    action, msg = evaluate_rag_impact({"user_id": "t"}, rag_failed=False)
    assert action == "proceed"
    assert msg == ""


def test_evaluate_rag_impact_failure_clean_profile():
    profile = {"user_id": "t", "name": "Clean"}
    action, msg = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "warn"
    assert "unavailable" in msg


def test_evaluate_rag_impact_failure_with_medical():
    profile = {"user_id": "t", "medical_conditions": ["anemia"]}
    action, msg = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "block"
    assert "unavailable" in msg


def test_evaluate_rag_impact_failure_with_injuries():
    profile = {"user_id": "t", "injuries": ["knee pain"]}
    action, msg = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "block"


def test_evaluate_rag_impact_failure_with_bloodwork():
    profile = {"user_id": "t", "last_bloodwork": "2yr_plus"}
    action, msg = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "block"


def test_evaluate_rag_impact_failure_with_mental_health():
    profile = {"user_id": "t", "mental_health_concern": "significant",
               "crisis_incident_id": "inc_001"}
    action, msg = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "block"


def test_evaluate_rag_impact_failure_with_known_deficiencies():
    """Deficiencies alone no longer block in evaluate_rag_impact — upstream now."""
    profile = {"user_id": "t", "known_deficiencies": ["vitamin_d"]}
    action, msg = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "warn"


def test_evaluate_rag_impact_clientprofile_known_deficiencies_blocks():
    """Deficiencies alone no longer block in evaluate_rag_impact — upstream now."""
    p = ClientProfile(user_id="t", name="T", known_deficiencies=["vitamin_d"])
    action, msg = evaluate_rag_impact(p, rag_failed=True)
    assert action == "warn"


def test_evaluate_rag_impact_bmi_low_blocks():
    profile = {"user_id": "t", "height_cm": 170, "bodyweight_kg": 50}
    action, msg = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "block"


def test_evaluate_rag_impact_clientprofile_bmi_low_blocks():
    p = ClientProfile(user_id="t", name="T", bodyweight_kg=50, height_cm=170)
    action, msg = evaluate_rag_impact(p, rag_failed=True)
    assert action == "block"


def test_evaluate_rag_impact_rapid_weight_loss_blocks():
    profile = {"user_id": "t", "rapid_weight_loss": True}
    action, msg = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "block"


def test_evaluate_rag_impact_clientprofile_rapid_weight_loss_blocks():
    p = ClientProfile(user_id="t", name="T", rapid_weight_loss=True)
    action, msg = evaluate_rag_impact(p, rag_failed=True)
    assert action == "block"


def test_evaluate_rag_impact_bmi_exactly_18_5_not_blocked():
    # 18.5 * (1.7^2) = 53.465; use slightly above to confirm strict <
    profile = {"user_id": "t", "height_cm": 170, "bodyweight_kg": 53.5}
    action, msg = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "warn"


def test_evaluate_rag_impact_clientprofile_clean():
    p = ClientProfile(user_id="t", name="Clean")
    action, msg = evaluate_rag_impact(p, rag_failed=True)
    assert action == "warn"


def test_evaluate_rag_impact_clientprofile_flagged():
    p = ClientProfile(user_id="t", name="T", medical=["thyroid"], last_bloodwork="never")
    action, msg = evaluate_rag_impact(p, rag_failed=True)
    assert action == "block"


def test_generate_program_returns_markdown_for_clean_profile():
    """Verify a minimal profile generates markdown (rag_failed=False, no flags → proceed)."""
    from mos_bot.core.program_generator import generate_program
    profile = {"user_id": "t", "name": "Test", "goal": "hypertrophy"}
    result = generate_program(profile)
    assert result is not None
    assert "Coaching Program" in result


# ── deficiency_status + deficiency_confirmed branching ──

def test_deficiency_evaluate_rag_impact_clean_does_not_block():
    """Deficiency-only profiles no longer block in evaluate_rag_impact."""
    profile = {"user_id": "t", "known_deficiencies": ["vitamin_d"]}
    action, _ = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "warn"


def test_deficiency_evaluate_rag_impact_confirmed_current_does_not_block():
    """Confirmed+current deficiency no longer blocks in evaluate_rag_impact."""
    p = ClientProfile(user_id="t", name="T", known_deficiencies=["vitamin_d"],
                      deficiency_status="current", deficiency_confirmed=True)
    action, _ = evaluate_rag_impact(p, rag_failed=True)
    assert action == "warn"


def test_deficiency_confirmed_resolved_warns():
    """Confirmed+resolved deficiency → warn (no other flags in evaluate_rag_impact)."""
    p = ClientProfile(user_id="t", name="T", known_deficiencies=["vitamin_d"],
                      deficiency_status="resolved", deficiency_confirmed=True)
    action, _ = evaluate_rag_impact(p, rag_failed=True)
    assert action == "warn"


def test_deficiency_dict_confirmed_resolved_warns():
    """Dict-profile branch: confirmed+resolved → warn."""
    profile = {"user_id": "t", "known_deficiencies": ["vitamin_d"],
               "deficiency_status": "resolved", "deficiency_confirmed": True}
    action, _ = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "warn"


def test_deficiency_empty_does_not_block():
    """Empty known_deficiencies list — no flag regardless of status fields."""
    p = ClientProfile(user_id="t", name="T", deficiency_status="current",
                      deficiency_confirmed=False)
    action, _ = evaluate_rag_impact(p, rag_failed=True)
    assert action == "warn"
