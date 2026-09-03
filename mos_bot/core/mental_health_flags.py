"""
mental_health_flags.py — State Machine, Persistence, Audit Logging, and Safety Gating
for Moderate Mental-Health Concern Flags.
"""

import os
import json
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any

from mos_bot.config import DATA_ROOT, OWNER_ID
from mos_bot.core.flag_models import MentalHealthFlag, FlagAuditEntry, FlagStatus
from mos_bot.core.analytics import track

logger = logging.getLogger(__name__)

FLAGS_DIR = os.path.join(DATA_ROOT, "flags")
AUDIT_FILE = os.path.join(FLAGS_DIR, "audit_trail.jsonl")

# SLA Constant: Flags remaining unclaimed past 48h escalate notification urgency to owner directly
SLA_UNCLAIMED_HOURS = 48


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _ensure_dirs():
    os.makedirs(FLAGS_DIR, exist_ok=True)


def _get_flag_path(flag_id: str) -> str:
    _ensure_dirs()
    return os.path.join(FLAGS_DIR, f"{flag_id}.json")


def _record_audit(flag_id: str, actor: str, from_status: Optional[str], to_status: str, note: str = "") -> FlagAuditEntry:
    _ensure_dirs()
    entry = FlagAuditEntry(
        audit_id=f"aud_{uuid.uuid4().hex[:12]}",
        flag_id=flag_id,
        actor=actor,
        from_status=from_status,
        to_status=to_status,
        timestamp=_utc_now().isoformat(),
        note=note
    )
    with open(AUDIT_FILE, "a", encoding="utf-8") as f:
        f.write(entry.model_dump_json() + "\n")
    return entry


def get_flag(flag_id: str) -> Optional[MentalHealthFlag]:
    path = _get_flag_path(flag_id)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return MentalHealthFlag(**data)
    except Exception as e:
        logger.error(f"Error loading flag {flag_id}: {e}")
        return None


def _save_flag(flag: MentalHealthFlag):
    path = _get_flag_path(flag.flag_id)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(flag.model_dump(), f, indent=2, ensure_ascii=False)


def list_flags(user_id: Optional[str] = None, status: Optional[FlagStatus] = None) -> List[MentalHealthFlag]:
    _ensure_dirs()
    flags = []
    for fname in os.listdir(FLAGS_DIR):
        if fname.endswith(".json") and fname.startswith("flg_"):
            fpath = os.path.join(FLAGS_DIR, fname)
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    flag = MentalHealthFlag(**data)
                    if user_id and flag.user_id != user_id:
                        continue
                    if status and flag.status != status:
                        continue
                    flags.append(flag)
            except Exception as e:
                logger.warning(f"Failed to read flag file {fname}: {e}")
    flags.sort(key=lambda x: x.created_at, reverse=True)
    return flags


def get_flag_audit_trail(flag_id: str) -> List[FlagAuditEntry]:
    _ensure_dirs()
    if not os.path.exists(AUDIT_FILE):
        return []
    entries = []
    with open(AUDIT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                try:
                    data = json.loads(line)
                    if data.get("flag_id") == flag_id:
                        entries.append(FlagAuditEntry(**data))
                except Exception:
                    pass
    return entries


def create_or_trigger_flag(user_id: str, trigger_context: str, actor: str = "system") -> MentalHealthFlag:
    """Create a new moderate mental-health concern flag record.
    
    If prior flags exist for this user (including cleared ones), links them via linked_flag_ids
    without reopening cleared records.
    """
    _ensure_dirs()
    prior_flags = list_flags(user_id=user_id)
    linked_ids = [f.flag_id for f in prior_flags]

    # Check if there is already an active open/in_review flag with the same context
    active_flags = [f for f in prior_flags if f.status in ("open", "in_review", "monitoring")]
    if active_flags:
        # Re-trigger on existing active flag: update context and write audit note
        primary = active_flags[0]
        primary.trigger_context = f"{primary.trigger_context} | Re-trigger: {trigger_context}"
        if primary.status == "monitoring":
            # Re-trigger during monitoring automatically re-opens to in_review
            prev_status = primary.status
            primary.status = "in_review"
            primary.recheck_at = None
            _record_audit(primary.flag_id, actor, prev_status, "in_review", f"Re-triggered during monitoring: {trigger_context}")
        _save_flag(primary)
        return primary

    flag_id = f"flg_mh_{_utc_now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
    flag = MentalHealthFlag(
        flag_id=flag_id,
        user_id=user_id,
        flag_type="mental_health_moderate",
        trigger_context=trigger_context,
        created_at=_utc_now().isoformat(),
        status="open",
        linked_flag_ids=linked_ids
    )

    _save_flag(flag)
    _record_audit(flag_id, actor, None, "open", f"Flag created: {trigger_context}")
    track("mental_health_flag_opened", user_id, {"flag_id": flag_id, "trigger_context": trigger_context})

    # Async notification to coach queue
    _notify_coach_queue(flag)
    return flag


def claim_flag(flag_id: str, claimed_by: str, note: str = "") -> MentalHealthFlag:
    """Transition flag: open -> in_review"""
    flag = get_flag(flag_id)
    if not flag:
        raise ValueError(f"Flag {flag_id} not found")
    if flag.status not in ("open", "in_review", "monitoring"):
        raise ValueError(f"Cannot claim flag in status '{flag.status}'")

    from_status = flag.status
    flag.status = "in_review"
    flag.claimed_by = claimed_by
    _save_flag(flag)
    _record_audit(flag_id, claimed_by, from_status, "in_review", note or f"Claimed by coach {claimed_by}")
    track("mental_health_flag_claimed", flag.user_id, {"flag_id": flag_id, "claimed_by": claimed_by})
    return flag


DISALLOWED_HUMAN_ACTORS = {
    "system", "bot", "auto", "automated", "scheduler", "cron",
    "anonymous", "none", "null", "undefined", "test"
}


def clear_flag(flag_id: str, cleared_by: str, clearance_note: str) -> MentalHealthFlag:
    """Transition flag: in_review -> cleared
    
    CORE SAFETY INVARIANT:
    No code path may set status = 'cleared' without a verified human actor (cleared_by)
    and a non-empty clearance_note. Automated identifiers (e.g. system, bot, scheduler)
    are strictly rejected.
    """
    if not cleared_by or not str(cleared_by).strip():
        raise ValueError("Safety Invariant Violation: clearance requires a non-empty 'cleared_by' actor ID.")
    
    clean_actor = str(cleared_by).strip()
    if clean_actor.lower() in DISALLOWED_HUMAN_ACTORS:
        raise ValueError(
            f"Safety Invariant Violation: 'cleared_by' must be an identifiable human coach. "
            f"Automated identifier '{clean_actor}' is strictly rejected."
        )

    if not clearance_note or not str(clearance_note).strip():
        raise ValueError("Safety Invariant Violation: clearance requires a non-empty 'clearance_note'.")

    flag = get_flag(flag_id)
    if not flag:
        raise ValueError(f"Flag {flag_id} not found")
    if flag.status not in ("in_review", "monitoring"):
        raise ValueError(f"Cannot clear flag from status '{flag.status}'. Flag must be in_review or monitoring.")

    from_status = flag.status
    flag.status = "cleared"
    flag.cleared_by = str(cleared_by).strip()
    flag.cleared_at = _utc_now().isoformat()
    flag.clearance_note = str(clearance_note).strip()
    flag.recheck_at = None

    _save_flag(flag)
    _record_audit(flag_id, cleared_by, from_status, "cleared", flag.clearance_note)
    track("mental_health_flag_cleared", flag.user_id, {
        "flag_id": flag_id,
        "cleared_by": cleared_by,
        "clearance_note": flag.clearance_note
    })
    return flag


def set_monitoring(flag_id: str, actor: str, recheck_at: str, note: str = "") -> MentalHealthFlag:
    """Transition flag: in_review -> monitoring (time-boxed)"""
    if not recheck_at or not str(recheck_at).strip():
        raise ValueError("Monitoring status requires 'recheck_at' timestamp.")

    # Validate ISO timestamp
    try:
        recheck_dt = datetime.fromisoformat(recheck_at.replace("Z", "+00:00"))
    except Exception as e:
        raise ValueError(f"Invalid ISO format for recheck_at: {recheck_at} ({e})")

    flag = get_flag(flag_id)
    if not flag:
        raise ValueError(f"Flag {flag_id} not found")
    if flag.status not in ("in_review", "open"):
        raise ValueError(f"Cannot set monitoring from status '{flag.status}'")

    from_status = flag.status
    flag.status = "monitoring"
    flag.recheck_at = recheck_at
    if not flag.claimed_by:
        flag.claimed_by = actor

    _save_flag(flag)
    _record_audit(flag_id, actor, from_status, "monitoring", note or f"Monitoring set until {recheck_at}")
    track("mental_health_flag_monitored", flag.user_id, {"flag_id": flag_id, "recheck_at": recheck_at})
    return flag


def escalate_flag(flag_id: str, escalated_by: str, reason: str) -> MentalHealthFlag:
    """Transition flag: in_review -> escalated (hands off into the EXISTING crisis gate)"""
    flag = get_flag(flag_id)
    if not flag:
        raise ValueError(f"Flag {flag_id} not found")
    if flag.status not in ("open", "in_review", "monitoring"):
        raise ValueError(f"Cannot escalate flag in status '{flag.status}'")

    from_status = flag.status
    flag.status = "escalated"
    flag.escalated_at = _utc_now().isoformat()
    flag.escalated_by = escalated_by

    _save_flag(flag)
    _record_audit(flag_id, escalated_by, from_status, "escalated", f"Escalated to crisis gate: {reason}")
    track("mental_health_flag_escalated", flag.user_id, {"flag_id": flag_id, "reason": reason})

    # Handoff into existing crisis gate
    _handoff_to_crisis_gate(flag.user_id, flag_id, reason)
    return flag


def _handoff_to_crisis_gate(user_id: str, incident_id: str, reason: str):
    """Invoke the existing crisis gate model and synchronous owner notification."""
    try:
        from mos_bot.core.intake_builder import load_profile, save_profile
        profile = load_profile(user_id)
        if profile:
            profile["mental_health_concern"] = "significant"
            profile["crisis_incident_id"] = incident_id
            save_profile(profile)
    except Exception as e:
        logger.error(f"Failed to update profile for crisis handoff {user_id}: {e}")

    # Trigger existing synchronous crisis notification to OWNER_ID
    if OWNER_ID:
        try:
            from mos_bot.config import BOT_TOKEN
            if BOT_TOKEN:
                import requests
                text = (
                    f"⚠️ ESCALATED CRISIS: user {user_id}\n"
                    f"Incident: {incident_id}\n"
                    f"Escalation Reason: {reason}\n\n"
                    f"Flag escalated to full Crisis Gate. Immediate manual contact required."
                )
                url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
                requests.post(url, json={"chat_id": OWNER_ID, "text": text}, timeout=10)
        except Exception as e:
            logger.error(f"Crisis notification handoff failed: {e}")


def _notify_coach_queue(flag: MentalHealthFlag):
    """Async notification into coach visibility / review queue."""
    logger.info(f"[COACH QUEUE] Moderate mental-health flag opened: {flag.flag_id} for user {flag.user_id} ({flag.trigger_context})")
    # Logged to analytics and coach queue store for FastAPI dashboard consumption


def check_monitoring_and_sla_timeouts() -> Dict[str, Any]:
    """Background check for expired monitoring time-boxes and 48h SLA breaches.
    
    1. Monitoring time-box expired -> moves back to in_review and re-alerts.
    2. Open flag past 48h SLA -> escalates notification urgency to owner directly.
    """
    now = _utc_now()
    sla_cutoff = now - timedelta(hours=SLA_UNCLAIMED_HOURS)
    
    reopened_count = 0
    sla_alert_count = 0

    for flag in list_flags():
        # 1. Monitoring timeout check
        if flag.status == "monitoring" and flag.recheck_at:
            try:
                recheck_dt = datetime.fromisoformat(flag.recheck_at.replace("Z", "+00:00"))
                if recheck_dt.tzinfo is None:
                    recheck_dt = recheck_dt.replace(tzinfo=timezone.utc)
                if recheck_dt <= now:
                    flag.status = "in_review"
                    prev_recheck = flag.recheck_at
                    flag.recheck_at = None
                    _save_flag(flag)
                    _record_audit(flag.flag_id, "scheduler", "monitoring", "in_review", f"Monitoring time-box expired ({prev_recheck}). Auto-reopened.")
                    _notify_coach_queue(flag)
                    track("mental_health_flag_monitoring_expired", flag.user_id, {"flag_id": flag.flag_id})
                    reopened_count += 1
            except Exception as e:
                logger.error(f"Error checking monitoring timeout for {flag.flag_id}: {e}")

        # 2. 48h SLA breach check
        if flag.status == "open":
            try:
                created_dt = datetime.fromisoformat(flag.created_at.replace("Z", "+00:00"))
                if created_dt.tzinfo is None:
                    created_dt = created_dt.replace(tzinfo=timezone.utc)
                if created_dt <= sla_cutoff:
                    # Escalate notification urgency directly to owner
                    _notify_owner_sla_breach(flag)
                    sla_alert_count += 1
            except Exception as e:
                logger.error(f"Error checking SLA for {flag.flag_id}: {e}")

    return {
        "reopened_monitoring_count": reopened_count,
        "sla_breach_alert_count": sla_alert_count
    }


def _notify_owner_sla_breach(flag: MentalHealthFlag):
    """Direct owner notification when a moderate flag sits unclaimed for >48 hours."""
    if not OWNER_ID:
        return
    try:
        from mos_bot.config import BOT_TOKEN
        if BOT_TOKEN:
            import requests
            text = (
                f"⏰ SLA WARNING: Moderate mental health flag unclaimed >48h\n"
                f"User: {flag.user_id}\n"
                f"Flag: {flag.flag_id}\n"
                f"Created: {flag.created_at}\n"
                f"Context: {flag.trigger_context}\n\n"
                f"Please assign or review via coach dashboard."
            )
            url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
            requests.post(url, json={"chat_id": OWNER_ID, "text": text}, timeout=10)
    except Exception as e:
        logger.error(f"Failed to send SLA breach notice to owner: {e}")


def has_active_mental_health_flag(user_id: str) -> bool:
    """Return True if user has any active moderate mental health flag (open, in_review, or monitoring)."""
    flags = list_flags(user_id=user_id)
    return any(f.status in ("open", "in_review", "monitoring") for f in flags)
