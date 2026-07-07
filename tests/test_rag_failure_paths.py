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
    profile = {"user_id": "t", "mental_health_concern": "significant"}
    action, msg = evaluate_rag_impact(profile, rag_failed=True)
    assert action == "block"


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
