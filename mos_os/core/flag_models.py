"""
flag_models.py — Data models for Mental Health Concern Flags and Audit Logging.
"""

from datetime import datetime, timezone
from typing import List, Optional, Literal
from pydantic import BaseModel, Field


FlagStatus = Literal["open", "in_review", "monitoring", "cleared", "escalated"]
FlagType = Literal["mental_health_moderate"]


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class FlagAuditEntry(BaseModel):
    """Immutable audit record for flag state transitions."""
    audit_id: str
    flag_id: str
    actor: str
    from_status: Optional[str]
    to_status: str
    timestamp: str = Field(default_factory=_utc_now_iso)
    note: str = ""


class MentalHealthFlag(BaseModel):
    """Stateful record representing a moderate mental-health concern flag."""
    flag_id: str
    user_id: str
    flag_type: FlagType = "mental_health_moderate"
    trigger_context: str  # Short sanitized clinical summary (no raw chat log excerpts)
    created_at: str = Field(default_factory=_utc_now_iso)
    status: FlagStatus = "open"
    claimed_by: Optional[str] = None
    cleared_by: Optional[str] = None
    cleared_at: Optional[str] = None
    clearance_note: Optional[str] = None
    recheck_at: Optional[str] = None  # Required when status == 'monitoring'
    escalated_at: Optional[str] = None
    escalated_by: Optional[str] = None
    linked_flag_ids: List[str] = Field(default_factory=list)


class FlagListResponse(BaseModel):
    flags: List[MentalHealthFlag]
    total: int
