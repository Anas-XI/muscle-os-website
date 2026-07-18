from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Literal, List, Optional, Set
import logging

from mos_bot.core.models import ClientProfile, PillarAssignment
from mos_bot.core.context_loader import evaluate_ed_screening, run_safety_triage, assign_pillars
from mos_bot.core.intake_builder import load_supplemental

logger = logging.getLogger(__name__)
router = APIRouter()

# Fields that must be present from some source before arbitration can produce
# a safe verdict. Crisis incident fields are excluded — they always have safe
# defaults ("" = no active incident).
# Fields that must be present in the profile or supplemental before arbitration
# can produce a safe verdict. ED answers (ED1-ED4) are not included — they are
# passed as a separate dict to evaluate_ed_screening(), which defaults missing
# values to "no" (green-safe). Crisis incident fields are also excluded (always
# have safe defaults: "" = no active incident).
REQUIRED_FOR_ARBITRATION: Set[str] = {
    "mental_health_concern",
    "known_deficiencies",
    "injuries", "medical",
}

# Fields that elitefit's own onboarding natively collects.
# These pass the gate even when no supplemental record exists
# (empty-but-present is a valid "user said none" answer).
ELITEFIT_NATIVE_FIELDS: Set[str] = {"medical"}


class ArbitrateRequest(BaseModel):
    profile: ClientProfile
    ed_answers: dict


class ArbitrateResponse(BaseModel):
    v: int = 1
    verdict: Literal["block", "proceed"]
    triage_tier: Literal["red", "yellow", "green"]
    block_reason: Optional[str] = None
    ed_classification: Literal["red", "yellow", "green"]
    modifiers: List[str] = Field(default_factory=list)
    caution_note: str = ""
    pillar_assignment: Optional[PillarAssignment] = None


def _merge_supplemental(profile: ClientProfile, supplemental: dict) -> dict:
    """Merge supplemental form data into the profile.

    Supplemental only fills fields that are absent on the profile
    (empty string, None, empty list). Profile values always win.

    Returns the merged ed_answers dict from supplemental (as base)
    to be overridden by request-level ed_answers.
    """
    _merge_if_absent(profile, "known_deficiencies", supplemental)
    _merge_if_absent(profile, "deficiency_confirmed", supplemental)
    _merge_if_absent(profile, "deficiency_status", supplemental)
    _merge_if_absent(profile, "mental_health_concern", supplemental)

    # Union injuries — combine both
    if "injuries" in supplemental:
        existing = set(profile.injuries or ())
        existing.update(supplemental["injuries"] or ())
        profile.injuries = list(existing)

    ed_answers = {}
    for key in ("ED1", "ED2", "ED3", "ED4"):
        if key in supplemental:
            ed_answers[key] = supplemental[key]
    return ed_answers


def _merge_if_absent(profile: ClientProfile, field: str, supplemental: dict) -> None:
    """Set profile field from supplemental iff currently empty/default."""
    if field not in supplemental:
        return
    current = getattr(profile, field)
    if current in (None, "", []):
        setattr(profile, field, supplemental[field])


def _check_required_fields(
    profile: ClientProfile, supplemental: dict | None
) -> list[str]:
    """Return list of REQUIRED_FOR_ARBITRATION fields not covered by any source.

    A field is covered if:
    - It is in ELITEFIT_NATIVE_FIELDS (always passes — elitefit always maps it), OR
    - profile.model_fields_set contains the field (explicitly set via from_dict,
      e.g. a complete bot-intake profile), OR
    - supplemental record exists AND contains the field as a key

    Key presence is the right check — even empty/zero values (``, `[]`, `False`)
    are valid user answers for these fields.
    """
    profile_fields = profile.model_fields_set
    missing = []
    for field in REQUIRED_FOR_ARBITRATION:
        if field in ELITEFIT_NATIVE_FIELDS:
            continue
        if field in profile_fields:
            continue
        if supplemental and field in supplemental:
            continue
        missing.append(field)
    return missing


@router.post("/arbitrate", response_model=ArbitrateResponse)
def arbitrate(req: ArbitrateRequest) -> ArbitrateResponse:
    try:
        supplemental = load_supplemental(req.profile.user_id)

        # Gate: check all required fields are covered by some source
        missing = _check_required_fields(req.profile, supplemental)
        if missing:
            form_url = f"/supplemental/{req.profile.user_id}"
            return ArbitrateResponse(
                verdict="block",
                triage_tier="red",
                block_reason="incomplete_profile",
                ed_classification="red",
                caution_note=(
                    f"BLOCKED: Safety profile incomplete. "
                    f"Please complete the supplemental intake form to provide "
                    f"required safety information.\n\n"
                    f"Missing fields: {', '.join(missing)}\n\n"
                    f"Form: {form_url}"
                ),
            )

        # Merge supplemental data into profile
        suppl_ed = _merge_supplemental(req.profile, supplemental or {})

        # ED answers: supplemental merge as base, request overrides
        merged_ed = dict(suppl_ed)
        merged_ed.update(req.ed_answers or {})

        # Standalone ED-completeness check — ED1-ED4 are a separate dict from
        # profile fields, so they get a separate gate from REQUIRED_FOR_ARBITRATION.
        # All four keys must be present in the merged dict; if neither the
        # supplemental form nor the request provided them, block with a targeted
        # message rather than silently defaulting to green.
        missing_ed = [k for k in ("ED1", "ED2", "ED3", "ED4") if k not in merged_ed]
        if missing_ed:
            return ArbitrateResponse(
                verdict="block",
                triage_tier="red",
                block_reason="incomplete_profile",
                ed_classification="red",
                caution_note=(
                    f"BLOCKED: Eating-disorder screening answers are incomplete. "
                    f"Missing: {', '.join(missing_ed)}\n\n"
                    f"Please complete the supplemental intake form."
                ),
            )

        ed_result = evaluate_ed_screening(merged_ed)
        ed_classification, ed_items = ed_result

        triage = run_safety_triage(req.profile, ed_result)

        if triage.blocked:
            return ArbitrateResponse(
                verdict="block",
                triage_tier=triage.triage,
                block_reason=triage.block_reason,
                ed_classification=ed_classification,
                modifiers=triage.modifiers,
                caution_note=triage.caution_note,
                pillar_assignment=None,
            )

        pillars = assign_pillars(req.profile, triage)

        return ArbitrateResponse(
            verdict="proceed",
            triage_tier=triage.triage,
            block_reason=None,
            ed_classification=ed_classification,
            modifiers=triage.modifiers,
            caution_note=triage.caution_note,
            pillar_assignment=pillars,
        )

    except Exception:
        logger.exception("arbitrate() raised unexpectedly — failing closed")
        return ArbitrateResponse(
            verdict="block",
            triage_tier="red",
            block_reason="arbitration_error",
            ed_classification="red",
            caution_note="A system error prevented safety evaluation. Please try again or contact support.",
        )
