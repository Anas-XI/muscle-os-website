import json, os, tempfile
from telegram import Update
from telegram.ext import ContextTypes, ConversationHandler
from mos_bot.core.intake_builder import build_profile, save_profile, parse_weight, parse_height
from mos_bot.core.program_generator import generate_program_pipeline


# ── Field mapping helpers ──

GOAL_MAP = {
    "lose_significant": "Lose fat", "lose_moderate": "Lose fat", "lose_small": "Lose fat",
    "maintain": "Recomposition", "gain_muscle": "Build muscle", "not_sure": "Recomposition",
}
EXP_MAP = {
    "less_1": "Less than 1 year", "1_2": "1-3 years", "2_4": "1-3 years",
    "4_8": "3+ years", "8_plus": "3+ years",
}
TD_MAP = {
    "0_1": "1-2 days", "2": "1-2 days", "3": "3-4 days", "4_5": "3-4 days", "6_plus": "5+ days",
}
AGE_MAP = {"under_25": "22", "25_39": "30", "40_54": "47", "55_plus": "60"}
SLEEP_MAP = {
    "under_5": "Under 6h", "5_6": "6-7h", "6_7": "7-8h", "7_8": "7-8h", "8_9": "8h+",
}
STRESS_MAP = {
    "8_10": "High (7-10)", "6_7": "Moderate (4-6)", "4_5": "Moderate (4-6)",
    "3": "Low (1-3)", "1_2": "Low (1-3)",
}
STEPS_MAP = {
    "under_5k": "Under 5,000", "5_8k": "5,000-10,000", "8_10k": "5,000-10,000",
    "10k_plus": "10,000+", "unknown": "I don't track",
}
CAFFEINE_MAP = {
    "none": "None", "100mg": "1 coffee (~100mg)", "200mg": "2-3 coffees (~200-300mg)",
    "300mg": "2-3 coffees (~200-300mg)", "400_plus": "4+ coffees (400mg+)",
}
GUT_MAP = {
    "good": "none", "mild_bloating": "Mild", "frequent_issues": "Significant", "diagnosed": "Significant",
}
SESSION_MAP = {
    "under_30": "Under 45 min", "30_45": "Under 45 min", "45_60": "45-75 min", "over_60": "75-100 min",
}


def _list_form_field(a, id):
    v = a.get(id)
    if isinstance(v, list):
        return v
    if v and v != "none":
        return [v]
    return []

def map_form_json(form_json: dict, user_id: str) -> dict:
    a = form_json.get("answers", {})
    ib = form_json.get("inbodyScan") or {}
    ibm = ib.get("metrics") or {}
    ibc = ib.get("computed") or {}
    raw = {
        "user_id": user_id,
        "name": form_json.get("name") or a.get("Q45", ""),
        "goal": GOAL_MAP.get(a.get("Q6", ""), "Recomposition"),
        "situation": "",
        "bodyweight_kg": a.get("Q46", ""),
        "height_cm": a.get("Q49", ""),
        "age": AGE_MAP.get(a.get("Q7", ""), "30"),
        "sex": {"male": "male", "female": "female"}.get(a.get("Q8", ""), "male"),
        "experience": EXP_MAP.get(a.get("Q1", ""), "1-3 years"),
        "training_days": TD_MAP.get(a.get("Q2", ""), "3-4 days"),
        "session_length": SESSION_MAP.get(a.get("Q18", ""), "45-75 min"),
        "current_split": a.get("Q51", ""),
        "injuries": [a.get("Q57", "").strip() or a.get("Q32", "")] if a.get("Q20") and a["Q20"] != "no" and a.get("Q20") else [],
        "gut_health": GUT_MAP.get(a.get("Q29", ""), "none"),
        "bowel_frequency_weekly": int(a.get("Q62", 0)) if a.get("Q62", "") else 0,
        "fermented_foods": a.get("Q63", ""),
        "antibiotic_recent": a.get("Q64") in ("once", "multiple"),
        "supplement_regimen": a.get("Q65", ""),
        "vegan_unsupplemented": a.get("Q101") in ("vegan_2yrs", "vegetarian_2yrs"),
        "sleep": SLEEP_MAP.get(a.get("Q13", ""), "7-8h"),
        "stress": STRESS_MAP.get(a.get("Q15", ""), "Moderate (4-6)"),
        "daily_water_liters": float(a.get("Q66", 0)) if a.get("Q66", "") else 0,
        "urine_color": a.get("Q67", ""),
        "muscle_cramps": a.get("Q68") in ("sometimes", "frequently"),
        "alcohol_weekly": a.get("Q69", "0"),
        "alcohol_near_bed": a.get("Q70") in ("sometimes_3h", "often_3h"),
        "steps": STEPS_MAP.get(a.get("Q26", ""), "I don't track"),
        "caffeine": CAFFEINE_MAP.get(a.get("Q56", ""), "None"),
        "work_schedule": a.get("Q71", ""),
        "reliable_hours_weekly": int(a.get("Q72", 0)) if a.get("Q72", "") else 0,
        "mobility_limitations": _list_form_field(a, "Q73"),
        "joint_pain": a.get("Q74", ""),
        "supplements": a.get("Q55", []) if isinstance(a.get("Q55"), list) else [],
        "medical": [a.get("Q47", "")] if a.get("Q47", "").strip() else [],
        "last_bloodwork": a.get("Q75", ""),
        "known_deficiencies": _list_form_field(a, "Q76"),
        "family_history": _list_form_field(a, "Q77"),
        "mental_health_concern": a.get("Q78", ""),
        "mental_health_care": a.get("Q79", ""),
        "rapid_weight_loss": a.get("Q80") == "yes",
        "ed_risk": any(a.get(q, "never") in ("often", "very_often") for q in ("Q58", "Q59", "Q60"))
                    or a.get("Q61") in ("moderate", "significant"),
        "triage_result": "red" if any(a.get(q, "never") in ("often", "very_often") for q in ("Q58", "Q59", "Q60"))
                         else "green",
        "inbody": {
            "has_scan": ib.get("hasScan", False),
            "scan_date": ib.get("scanDate", ""),
            "device": ib.get("device", ""),
            "weight_kg": ibm.get("weight_kg"),
            "smm_kg": ibm.get("smm_kg"),
            "bfm_kg": ibm.get("bfm_kg"),
            "bf_pct": ibm.get("bf_pct"),
            "bmi": ibm.get("bmi"),
            "bmr_kcal": ibm.get("bmr_kcal"),
            "visceral_fat": ibm.get("visceral_fat"),
            "tbw_L": ibm.get("tbw_L"),
            "icw_L": ibm.get("icw_L"),
            "ecw_L": ibm.get("ecw_L"),
            "ecw_tbw_ratio": ibm.get("ecw_tbw_ratio"),
            "seg_rArm_kg": ibm.get("seg_rArm_kg"),
            "seg_lArm_kg": ibm.get("seg_lArm_kg"),
            "seg_trunk_kg": ibm.get("seg_trunk_kg"),
            "seg_rLeg_kg": ibm.get("seg_rLeg_kg"),
            "seg_lLeg_kg": ibm.get("seg_lLeg_kg"),
            "lbm_kg": ibc.get("lbm_kg"),
            "ffmi": ibc.get("ffmi"),
            "flags": ib.get("flags", []),
        } if ib.get("hasScan") else None,
    }
    return raw


# ── Shared processing logic ──

async def _process_json_file(update: Update, context: ContextTypes.DEFAULT_TYPE, msg, form_json: dict, user_id: str):
    """Build profile and generate program from parsed JSON form data."""
    a = form_json.get("answers", {})
    name = form_json.get("name") or a.get("Q45", "")
    weight = a.get("Q46", "")
    if not name or not weight:
        missing = []
        if not name: missing.append("name")
        if not weight: missing.append("weight")
        await msg.edit_text(
            f"The JSON file is missing: {', '.join(missing)}.\n\n"
            "Make sure you:\n"
            "1. Opened intake-form.html in a desktop browser (not Telegram's browser)\n"
            "2. Filled in all fields including name and weight\n"
            "3. Clicked 'Submit Intake' first, then 'Save Results as JSON'\n"
            "4. Sent the resulting .json file (not the HTML file)"
        )
        return

    try:
        raw = map_form_json(form_json, user_id)
    except Exception as e:
        await msg.edit_text(f"Could not map form data to profile.\nError: {e}")
        return

    try:
        profile = build_profile(raw)
        save_profile(profile)
    except Exception as e:
        await msg.edit_text(f"Could not build your profile.\nError: {e}")
        return

    await msg.edit_text(f"Profile built for {profile['name']}. Generating your coaching program...")

    result = generate_program_pipeline(user_id)

    if "error" in result:
        if result.get("blocked"):
            await msg.edit_text(
                "I'm unable to build your program at this time. "
                "Please consult a healthcare professional before proceeding."
            )
        else:
            await msg.edit_text(
                "I ran into an error building your program. Please try again."
            )
        return

    pdf_path = result.get("pdf_path")

    if pdf_path:
        with open(pdf_path, "rb") as f:
            await update.message.reply_document(
                document=f,
                filename=os.path.basename(pdf_path),
                caption=(
                    f"Your program is ready, {profile['name']}.\n\n"
                    f"Goal: {profile['goal']} ({profile['bodyweight_kg']} kg)\n"
                    f"Split: {profile['training_days']}-day program\n"
                    f"Profile from: intake form upload\n"
                    f"\nYour full program is attached as a PDF.\n"
                    f"Use /checkin every week to track progress and get adjustments.\n"
                    f"Use /coach to ask me anything about your program."
                ),
            )
    else:
        md_path = result.get("markdown_path", "")
        if md_path and os.path.exists(md_path):
            with open(md_path, "rb") as f:
                await update.message.reply_document(
                    document=f,
                    filename=f"{user_id}_program.md",
                    caption="Your program in markdown format.",
                )
        else:
            await update.message.reply_text("Your program couldn't be delivered. Please try again.")

    try:
        await msg.delete()
    except Exception:
        pass


def _end_active_conversation(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """End any active intake conversation so the user's next message isn't eaten."""
    try:
        if update.effective_chat and update.effective_user and context.application:
            key = (update.effective_chat.id, update.effective_user.id)
            cd = context.application.conversation_data.get(key, {})
            cd.pop("intake_conversation", None)
    except Exception:
        pass


async def _download_json(update: Update, context: ContextTypes.DEFAULT_TYPE) -> dict:
    """Download and parse JSON from a document attachment. Returns the parsed dict."""
    doc = update.message.document
    file = await context.bot.get_file(doc.file_id)
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(mode="w+", suffix=".json", delete=False, encoding="utf-8") as tmp:
            tmp_path = tmp.name
        await file.download_to_drive(tmp_path)
        with open(tmp_path, "r", encoding="utf-8") as f:
            return json.load(f)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


MAX_JSON_BYTES = 5 * 1024 * 1024

# ── Command handler ──

async def upload_profile(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_id = str(user.id)

    if not update.message.document:
        await update.message.reply_text(
            "Send me the JSON file you downloaded from the intake form.\n\n"
            "1. Fill out the form at intake-form.html\n"
            "2. Click 'Save Results as JSON'\n"
            "3. Send the .json file here\n\n"
            "Example: /upload_profile with the file attached."
        )
        return

    doc = update.message.document
    if not doc.file_name.endswith(".json"):
        await update.message.reply_text("Please send a .json file.")
        return

    if doc.file_size and doc.file_size > MAX_JSON_BYTES:
        await update.message.reply_text("That file is too large (max 5 MB).")
        return

    msg = await update.message.reply_text("Reading your profile...")

    try:
        form_json = await _download_json(update, context)
    except Exception as e:
        await msg.edit_text(f"Could not read your file. Make sure it's a valid JSON file.\nError: {e}")
        return

    await _process_json_file(update, context, msg, form_json, user_id)
    _end_active_conversation(update, context)


# ── Message handler (no command needed — catches any JSON file sent to the bot) ──

async def handle_json_upload(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Process any JSON file sent to the bot without requiring a /command."""
    doc = update.message.document
    if not doc:
        return

    if not doc.file_name.endswith(".json"):
        await update.message.reply_text(
            "I only accept .json files — the one you get from clicking "
            "'Save Results as JSON' in the intake form."
        )
        return

    if doc.file_size and doc.file_size > MAX_JSON_BYTES:
        await update.message.reply_text(
            "That file is too large (max 5 MB). The intake form JSON "
            "should be well under 1 MB."
        )
        return

    user = update.effective_user
    user_id = str(user.id)
    msg = await update.message.reply_text("Reading your profile...")

    try:
        form_json = await _download_json(update, context)
    except Exception as e:
        await msg.edit_text(f"Could not read your file. Make sure it's a valid JSON file.\nError: {e}")
        return

    await _process_json_file(update, context, msg, form_json, user_id)
    _end_active_conversation(update, context)
