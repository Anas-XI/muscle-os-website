import os
from datetime import datetime, timezone
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler
from mos_bot.states import (
    CHECKIN_WEIGHT, CHECKIN_WAIST, CHECKIN_SLEEP, CHECKIN_READINESS,
    CHECKIN_SORENESS, CHECKIN_ADHERENCE, CHECKIN_TOP_SETS,
)
from mos_bot.core.intake_builder import load_profile, parse_weight
from mos_bot.core.analytics import track
from mos_bot.config import DATA_ROOT

try:
    from checkin_tracker import CheckInStore, CheckInRecord, analyse_trends, suggest_adjustments, format_trends, format_adjustments
except ImportError:
    CheckInStore = None
    CheckInRecord = None
    analyse_trends = lambda records: []
    suggest_adjustments = lambda *a, **kw: []
    format_trends = lambda trends: ""
    format_adjustments = lambda adj: ""


def _btn(label, data=None):
    return InlineKeyboardButton(label, callback_data=data or label)


def _keyboard(*rows):
    return InlineKeyboardMarkup([list(row) for row in rows])


async def checkin_start(update, context):
    user_id = str(update.effective_user.id)
    profile = load_profile(user_id)
    if not profile:
        await update.message.reply_text(
            "I don't have a profile for you yet. Please complete intake first with /start."
        )
        return ConversationHandler.END

    context.user_data["checkin_user_id"] = user_id
    context.user_data["checkin_profile"] = profile

    await update.message.reply_text(
        "Weekly check-in! Let's track your progress.\n\n"
        "What is your current bodyweight?\n"
        "Reply with weight and unit, e.g: 84 kg or 185 lb"
    )
    return CHECKIN_WEIGHT


async def checkin_weight_handler(update, context):
    text = update.message.text.strip()
    try:
        kg = parse_weight(text)
        context.user_data["checkin_weight"] = kg
    except ValueError:
        await update.message.reply_text(
            "I didn't understand that. Please reply with your weight, e.g: 84 kg or 185 lb"
        )
        return CHECKIN_WEIGHT
    await update.message.reply_text(
        "Waist measurement at navel? (cm or inches, or type \"skip\")"
    )
    return CHECKIN_WAIST


async def checkin_waist_handler(update, context):
    text = update.message.text.strip().lower()
    if text == "skip":
        context.user_data["checkin_waist"] = None
    else:
        try:
            if "cm" in text:
                cm = float(text.replace("cm", "").strip())
            elif "in" in text or '"' in text:
                val = float(text.replace("in", "").replace('"', "").strip())
                cm = round(val * 2.54, 1)
            else:
                cm = float(text)
            context.user_data["checkin_waist"] = cm
        except ValueError:
            await update.message.reply_text(
                'I didn\'t understand that. Send measurement in cm/inches or type "skip"'
            )
            return CHECKIN_WAIST

    kb = _keyboard(
        (_btn("Under 6h"), _btn("6-7h")),
        (_btn("7-8h"), _btn("8h+")),
    )
    await update.message.reply_text(
        "Average sleep this week?", reply_markup=kb
    )
    return CHECKIN_SLEEP


async def checkin_sleep_handler(update, context):
    query = update.callback_query
    await query.answer()

    sleep_map = {"Under 6h": 5, "6-7h": 6.5, "7-8h": 7.5, "8h+": 8.5}
    context.user_data["checkin_sleep"] = sleep_map.get(query.data, 7)

    kb = _keyboard(
        tuple(_btn(str(i)) for i in range(1, 6)),
        tuple(_btn(str(i)) for i in range(6, 11)),
    )
    await query.edit_message_text(
        "Readiness to train this week (1-10)?", reply_markup=kb
    )
    return CHECKIN_READINESS


async def checkin_readiness_handler(update, context):
    query = update.callback_query
    await query.answer()
    context.user_data["checkin_readiness"] = int(query.data)

    kb = _keyboard(
        (_btn("Low"), _btn("Moderate")),
        (_btn("High"),),
    )
    await query.edit_message_text(
        "Soreness level this week?", reply_markup=kb
    )
    return CHECKIN_SORENESS


async def checkin_soreness_handler(update, context):
    query = update.callback_query
    await query.answer()

    soreness_map = {"Low": 3, "Moderate": 5, "High": 8}
    context.user_data["checkin_soreness"] = soreness_map.get(query.data, 5)

    kb = _keyboard(
        (_btn("<50%"), _btn("50-80%")),
        (_btn(">80%"),),
    )
    await query.edit_message_text(
        "Adherence to nutrition plan this week?", reply_markup=kb
    )
    return CHECKIN_ADHERENCE


async def checkin_adherence_handler(update, context):
    query = update.callback_query
    await query.answer()

    adh_map = {"<50%": 30, "50-80%": 65, ">80%": 90}
    context.user_data["checkin_adherence"] = adh_map.get(query.data, 50)

    kb = _keyboard(
        (_btn("Went up"), _btn("Stayed same")),
        (_btn("Went down"),),
    )
    await query.edit_message_text(
        "Did your main lifts go up, stay the same, or go down?",
        reply_markup=kb,
    )
    return CHECKIN_TOP_SETS


async def checkin_top_sets_handler(update, context):
    query = update.callback_query
    await query.answer()

    ud = context.user_data
    user_id = ud["checkin_user_id"]
    profile = ud["checkin_profile"]
    goal = profile.get("goal", "hypertrophy")

    record = CheckInRecord(
        timestamp=datetime.now(timezone.utc).isoformat(),
        weight_kg=ud.get("checkin_weight"),
        waist_cm=ud.get("checkin_waist"),
        readiness=ud.get("checkin_readiness"),
        adherence_pct=ud.get("checkin_adherence"),
        soreness=ud.get("checkin_soreness"),
        sleep_hours=ud.get("checkin_sleep"),
        top_set_reps=[(goal, 0, 0)],
    )

    store = CheckInStore(os.path.join(DATA_ROOT, "checkins"))
    store.add(user_id, record)

    records = store.load_all(user_id)
    trends = analyse_trends(records)
    adj = suggest_adjustments(trends, goal, current_calories=2500)

    msg_parts = ["\u2705 Check-in recorded!\n"]
    msg_parts.append(format_trends(trends))
    msg_parts.append("")
    msg_parts.append("=== Adjustments ===")
    msg_parts.append(format_adjustments(adj))

    track("checkin_completed", user_id, {
        "weight_kg": ud.get("checkin_weight"),
        "readiness": ud.get("checkin_readiness"),
        "adherence": ud.get("checkin_adherence"),
    })

    await query.edit_message_text("\n".join(msg_parts))

    context.user_data.clear()
    return ConversationHandler.END
