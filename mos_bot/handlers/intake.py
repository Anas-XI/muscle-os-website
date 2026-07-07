import re
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler
from mos_bot.states import (
    GOAL, SITUATION, EXPERIENCE, WEIGHT, HEIGHT, AGE,
    TRAINING_DAYS, SESSION_LENGTH, CURRENT_SPLIT, INJURIES,
    GUT_HEALTH, SLEEP, STRESS, STEPS, CAFFEINE,
    SUPPLEMENTS, MEDICAL,
    ED_SCREENING_1, ED_SCREENING_2, ED_SCREENING_3, ED_SCREENING_4,
    CONFIRM_PROFILE,
    HYDRATION, ALCOHOL_WEEKLY, WORK_SCHEDULE, MOBILITY, BLOODWORK, MENTAL_HEALTH,
)
from mos_bot.core.intake_builder import (
    build_profile, save_profile, parse_weight, parse_height,
    GOAL_MAP, SITUATION_MAP, EXPERIENCE_YEARS_MAP,
    TRAINING_DAYS_MAP, SESSION_LENGTH_MAP, GUT_MAP,
    SLEEP_MAP, STRESS_MAP, STEPS_MAP, CAFFEINE_MAP,
)
from mos_bot.core.analytics import track
try:
    from mos_cli import evaluate_ed_screening
except ImportError:
    def evaluate_ed_screening(answers):
        return "green", []

TOTAL_SCREENS = 8

SCREEN_MAP = {
    GOAL: (1, "Your Goal"),
    SITUATION: (1, "Your Goal"),
    EXPERIENCE: (1, "Your Goal"),
    WEIGHT: (2, "Body Stats"),
    HEIGHT: (2, "Body Stats"),
    AGE: (2, "Body Stats"),
    TRAINING_DAYS: (3, "Training Setup"),
    SESSION_LENGTH: (3, "Training Setup"),
    CURRENT_SPLIT: (3, "Training Setup"),
    INJURIES: (4, "Health & Injuries"),
    GUT_HEALTH: (4, "Health & Injuries"),
    SLEEP: (5, "Recovery & Lifestyle"),
    STRESS: (5, "Recovery & Lifestyle"),
    STEPS: (5, "Recovery & Lifestyle"),
    HYDRATION: (5, "Recovery & Lifestyle"),
    ALCOHOL_WEEKLY: (5, "Recovery & Lifestyle"),
    CAFFEINE: (6, "Nutrition & Supplements"),
    SUPPLEMENTS: (6, "Nutrition & Supplements"),
    MEDICAL: (7, "Health Screening"),
    WORK_SCHEDULE: (7, "Health Screening"),
    MOBILITY: (7, "Health Screening"),
    BLOODWORK: (7, "Health Screening"),
    MENTAL_HEALTH: (7, "Health Screening"),
    ED_SCREENING_1: (7, "Health Screening"),
    ED_SCREENING_2: (7, "Health Screening"),
    ED_SCREENING_3: (7, "Health Screening"),
    ED_SCREENING_4: (7, "Health Screening"),
    CONFIRM_PROFILE: (8, "Review"),
}


def _sanitize_text(text: str, max_len: int = 500) -> str:
    import re
    cleaned = re.sub(r'[<>\n\r\t]', ' ', text)
    cleaned = cleaned.strip()
    return cleaned[:max_len]


def _header(state_or_num):
    if isinstance(state_or_num, int) and state_or_num <= TOTAL_SCREENS:
        num, name = state_or_num, ""
        for s, (n, nm) in SCREEN_MAP.items():
            if n == state_or_num:
                name = nm
                break
    else:
        info = SCREEN_MAP.get(state_or_num, (0, ""))
        num, name = info
    bar_size = 8
    filled = "━" * num
    empty = "─" * (bar_size - num)
    return (
        f"📋 Step {num}/{TOTAL_SCREENS}\n"
        f"┃{filled}●{empty}┃  {name}\n\n"
    )


def _btn(label, data=None):
    return InlineKeyboardButton(label, callback_data=data or label)


def _keyboard(*rows):
    return InlineKeyboardMarkup([list(row) for row in rows])


async def _send_screen(update_or_query, text, reply_markup=None, edit=True):
    if edit and hasattr(update_or_query, "edit_message_text"):
        return await update_or_query.edit_message_text(text, reply_markup=reply_markup)
    elif hasattr(update_or_query, "message"):
        return await update_or_query.message.reply_text(text, reply_markup=reply_markup)
    return await update_or_query.reply_text(text, reply_markup=reply_markup)


GOAL_EMOJIS = {"Lose fat": "🔥", "Build muscle": "💪", "Get stronger": "🏋️", "Recomposition": "⚖️"}
SIT_EMOJIS = {"Just getting started": "🌱", "Not seeing results": "📉", "Feeling run down": "😮‍💨", "Coming back from a break": "🔄"}
EXP_EMOJIS = {"Less than 1 year": "🌱", "1-3 years": "🌿", "3+ years": "🌳"}


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    first_name = update.effective_user.first_name
    context.user_data["name"] = first_name
    context.user_data["user_id"] = str(update.effective_user.id)

    text = (
        f"👋 Welcome to Muscle OS, {first_name}.\n\n"
        "I'm going to guide you through **8 quick screens** to build your "
        "coaching profile. Each screen has 1–3 questions — it takes about 5 minutes.\n\n"
        "Let's start with your goal."
    )
    kb = _keyboard(
        (_btn("🔥 Lose fat"), _btn("💪 Build muscle")),
        (_btn("🏋️ Get stronger"), _btn("⚖️ Recomposition")),
    )
    await update.message.reply_text(f"{_header(GOAL)}{text}", reply_markup=kb, parse_mode="Markdown")
    return GOAL


async def goal_handler(update, context):
    query = update.callback_query
    await query.answer()
    context.user_data["goal"] = query.data.split(" ")[-1] if " " in query.data else query.data
    kb = _keyboard(
        (_btn("🌱 Just getting started"), _btn("📉 Not seeing results")),
        (_btn("😮‍💨 Feeling run down"), _btn("🔄 Coming back from a break")),
    )
    await query.edit_message_text(
        f"{_header(SITUATION)}What best describes where you are right now?",
        reply_markup=kb,
    )
    return SITUATION


async def situation_handler(update, context):
    query = update.callback_query
    await query.answer()
    context.user_data["situation"] = query.data.split(" ")[-1] if " " in query.data else query.data
    kb = _keyboard(
        (_btn("🌱 Less than 1 year"), _btn("🌿 1-3 years")),
        (_btn("🌳 3+ years"),),
    )
    await query.edit_message_text(
        f"{_header(EXPERIENCE)}How long have you been training consistently?",
        reply_markup=kb,
    )
    return EXPERIENCE


async def experience_handler(update, context):
    query = update.callback_query
    await query.answer()
    raw = query.data
    for key, val in EXPERIENCE_YEARS_MAP.items():
        if key.split(" ")[-1] in raw or key.split(" ")[0] in raw or key == raw:
            context.user_data["experience"] = key
            break
    else:
        context.user_data["experience"] = raw

    await query.edit_message_text(
        f"{_header(WEIGHT)}📏 **Your Body Stats**\n\n"
        "What is your current bodyweight?\n"
        'Reply with weight and unit, e.g: `84 kg` or `185 lb`',
        parse_mode="Markdown",
    )
    return WEIGHT


async def weight_handler(update, context):
    text = update.message.text.strip()
    try:
        kg = parse_weight(text)
        context.user_data["bodyweight_kg"] = str(kg)
    except ValueError:
        await update.message.reply_text(
            f"{_header(WEIGHT)}I didn't understand that. Reply with your weight, e.g: `84 kg` or `185 lb`",
            parse_mode="Markdown",
        )
        return WEIGHT
    await update.message.reply_text(
        f"{_header(HEIGHT)}And your height? e.g: `175 cm` or `5'9`",
        parse_mode="Markdown",
    )
    return HEIGHT


async def height_handler(update, context):
    text = update.message.text.strip()
    try:
        cm = parse_height(text)
        context.user_data["height_cm"] = str(cm)
    except ValueError:
        await update.message.reply_text(
            f"{_header(HEIGHT)}I didn't understand that. Reply with your height, e.g: `175 cm` or `5'9`",
            parse_mode="Markdown",
        )
        return HEIGHT
    await update.message.reply_text(
        f"{_header(AGE)}How old are you? Reply with your age.",
    )
    return AGE


async def age_handler(update, context):
    text = update.message.text.strip()
    if not text.isdigit():
        await update.message.reply_text(
            f"{_header(AGE)}Please enter a whole number for your age."
        )
        return AGE
    age = int(text)
    if age < 16:
        await update.message.reply_text(
            "I'm sorry, but I can only work with users aged 16 and over. "
            "Please consult a qualified professional for guidance."
        )
        return ConversationHandler.END
    if age > 75:
        await update.message.reply_text(
            "For safety, please consult with your doctor before beginning any new "
            "exercise or nutrition program."
        )
        return ConversationHandler.END
    context.user_data["age"] = str(age)

    line = "\n".join([
        f"{_header(TRAINING_DAYS)}📅 **Training Setup**",
        "",
        f"✅ **Stats saved:** {context.user_data['bodyweight_kg']} kg, "
        f"{context.user_data['height_cm']} cm, {age} years",
        "",
        "How many days per week do you train?",
    ])
    kb = _keyboard(
        (_btn("1-2 days"), _btn("3-4 days")),
        (_btn("5+ days"),),
    )
    await update.message.reply_text(line, reply_markup=kb, parse_mode="Markdown")
    return TRAINING_DAYS


async def training_days_handler(update, context):
    query = update.callback_query
    await query.answer()
    context.user_data["training_days"] = query.data
    kb = _keyboard(
        (_btn("Under 45 min"), _btn("45-75 min")),
        (_btn("75-100 min"), _btn("100+ min")),
    )
    await query.edit_message_text(
        f"{_header(SESSION_LENGTH)}How long are your sessions?", reply_markup=kb
    )
    return SESSION_LENGTH


async def session_length_handler(update, context):
    query = update.callback_query
    await query.answer()
    context.user_data["session_length"] = query.data
    await query.edit_message_text(
        f"{_header(CURRENT_SPLIT)}What split are you running right now? "
        '(or type "none" if you don\'t have one)'
    )
    return CURRENT_SPLIT


async def current_split_handler(update, context):
    context.user_data["current_split"] = _sanitize_text(update.message.text)
    kb = _keyboard(
        (_btn("No injuries"), _btn("Yes, describe \u2192")),
    )
    await update.message.reply_text(
        f"{_header(INJURIES)}🩺 **Health & Injuries**\n\n"
        "Any current injuries or pain I should know about?", reply_markup=kb,
        parse_mode="Markdown",
    )
    return INJURIES


async def injuries_handler(update, context):
    query = update.callback_query
    await query.answer()
    if query.data == "No injuries":
        context.user_data["injuries"] = []
        kb = _keyboard(
            (_btn("None"), _btn("Mild")),
            (_btn("Significant"),),
        )
        await query.edit_message_text(
            f"{_header(GUT_HEALTH)}Any ongoing gut issues? "
            "(bloating, IBS, poor digestion, food intolerances)",
            reply_markup=kb,
        )
        return GUT_HEALTH
    else:
        await query.edit_message_text(
            f"{_header(INJURIES)}Please describe your injuries and any relevant details."
        )
        context.user_data["injuries_raw"] = True
        context.user_data["injuries"] = None
        return INJURIES


async def injuries_text_handler(update, context):
    text = _sanitize_text(update.message.text)
    context.user_data["injuries"] = [text]
    kb = _keyboard(
        (_btn("None"), _btn("Mild")),
        (_btn("Significant"),),
    )
    await update.message.reply_text(
        f"{_header(GUT_HEALTH)}Any ongoing gut issues? "
        "(bloating, IBS, poor digestion, food intolerances)",
        reply_markup=kb,
    )
    return GUT_HEALTH


async def gut_health_handler(update, context):
    query = update.callback_query
    await query.answer()
    context.user_data["gut_health"] = query.data
    kb = _keyboard(
        (_btn("Under 6h"), _btn("6-7h")),
        (_btn("7-8h"), _btn("8h+")),
    )
    await query.edit_message_text(
        f"{_header(SLEEP)}😴 **Recovery & Lifestyle**\n\n"
        "How many hours of sleep do you average per night?", reply_markup=kb,
        parse_mode="Markdown",
    )
    return SLEEP


async def sleep_handler(update, context):
    query = update.callback_query
    await query.answer()
    context.user_data["sleep"] = query.data
    kb = _keyboard(
        (_btn("Low (1-3)"), _btn("Moderate (4-6)")),
        (_btn("High (7-10)"),),
    )
    await query.edit_message_text(
        f"{_header(STRESS)}How would you rate your daily life stress right now?",
        reply_markup=kb,
    )
    return STRESS


async def stress_handler(update, context):
    query = update.callback_query
    await query.answer()
    context.user_data["stress"] = query.data
    kb = _keyboard(
        (_btn("Under 5,000"), _btn("5,000-10,000")),
        (_btn("10,000+"), _btn("I don't track")),
    )
    await query.edit_message_text(
        f"{_header(STEPS)}Roughly how many steps do you average per day?",
        reply_markup=kb,
    )
    return STEPS


async def steps_handler(update, context):
    query = update.callback_query
    await query.answer()
    context.user_data["steps"] = query.data
    kb = _keyboard(
        (_btn("None"), _btn("1 coffee (~100mg)")),
        (_btn("2-3 coffees (~200-300mg)"), _btn("4+ coffees (400mg+)")),
    )
    await query.edit_message_text(
        f"{_header(CAFFEINE)}☕ **Nutrition & Supplements**\n\n"
        "Daily caffeine intake?", reply_markup=kb,
        parse_mode="Markdown",
    )
    return CAFFEINE


async def caffeine_handler(update, context):
    query = update.callback_query
    await query.answer()
    context.user_data["caffeine"] = query.data
    kb = _keyboard((_btn("None"),))
    await query.edit_message_text(
        f"{_header(SUPPLEMENTS)}What supplements are you currently taking?\n"
        "List them (e.g: creatine, protein, vitamin D) or tap below.",
        reply_markup=kb,
    )
    return SUPPLEMENTS


async def supplements_handler(update, context):
    if update.callback_query:
        await update.callback_query.answer()
        context.user_data["supplements"] = []
        kb = _keyboard((_btn("None"), _btn("Yes, describe \u2192")))
        await update.callback_query.edit_message_text(
            f"{_header(MEDICAL)}🏥 **Health Screening**\n\n"
            "Any medical conditions, medications, or doctor restrictions "
            "I should know about?",
            reply_markup=kb,
            parse_mode="Markdown",
        )
    else:
        context.user_data["supplements"] = [_sanitize_text(update.message.text)]
        kb = _keyboard((_btn("None"), _btn("Yes, describe \u2192")))
        await update.message.reply_text(
            f"{_header(MEDICAL)}🏥 **Health Screening**\n\n"
            "Any medical conditions, medications, or doctor restrictions "
            "I should know about?",
            reply_markup=kb,
            parse_mode="Markdown",
        )
    return MEDICAL


async def medical_handler(update, context):
    query = update.callback_query
    await query.answer()
    if query.data == "None":
        context.user_data["medical"] = []
        kb = _keyboard((_btn("No"), _btn("Yes")))
        await query.edit_message_text(
            f"{_header(ED_SCREENING_1)}A few quick health screening questions...\n\n"
            "In the past 3 months, have you had episodes of eating a very large "
            "amount of food in a short period, feeling out of control?",
            reply_markup=kb,
        )
        return ED_SCREENING_1
    else:
        await query.edit_message_text(
            f"{_header(MEDICAL)}Please describe your medical conditions or restrictions."
        )
        context.user_data["medical"] = None
        return MEDICAL


async def medical_text_handler(update, context):
    context.user_data["medical"] = [_sanitize_text(update.message.text)]
    kb = _keyboard((_btn("No"), _btn("Yes")))
    await update.message.reply_text(
        f"{_header(ED_SCREENING_1)}A few quick health screening questions...\n\n"
        "In the past 3 months, have you had episodes of eating a very large "
        "amount of food in a short period, feeling out of control?",
        reply_markup=kb,
    )
    return ED_SCREENING_1


async def ed1_handler(update, context):
    query = update.callback_query
    await query.answer()
    context.user_data["ED1"] = query.data.lower()
    kb = _keyboard((_btn("No"), _btn("Yes")))
    await query.edit_message_text(
        f"{_header(ED_SCREENING_2)}In the past 3 months, have you used vomiting, "
        "laxatives, or excessive exercise to compensate for eating?",
        reply_markup=kb,
    )
    return ED_SCREENING_2


async def ed2_handler(update, context):
    query = update.callback_query
    await query.answer()
    context.user_data["ED2"] = query.data.lower()
    kb = _keyboard((_btn("No"), _btn("Yes")))
    await query.edit_message_text(
        f"{_header(ED_SCREENING_3)}Have you been diagnosed with or do you believe "
        "you have an eating disorder?",
        reply_markup=kb,
    )
    return ED_SCREENING_3


async def ed3_handler(update, context):
    query = update.callback_query
    await query.answer()
    context.user_data["ED3"] = query.data.lower()
    kb = _keyboard((_btn("No"), _btn("Yes")))
    await query.edit_message_text(
        f"{_header(ED_SCREENING_4)}Do you often feel intense guilt or shame after eating?",
        reply_markup=kb,
    )
    return ED_SCREENING_4


async def ed4_handler(update, context):
    query = update.callback_query
    await query.answer()
    context.user_data["ED4"] = query.data.lower()

    ed_answers = {
        "ED1": context.user_data.get("ED1", "no"),
        "ED2": context.user_data.get("ED2", "no"),
        "ED3": context.user_data.get("ED3", "no"),
        "ED4": context.user_data.get("ED4", "no"),
    }
    ed_triage, ed_items = evaluate_ed_screening(ed_answers)

    if ed_triage == "red":
        await query.edit_message_text(
            "Thank you for your honesty.\n\n"
            "Based on your responses, I recommend speaking with a healthcare professional "
            "who specialises in eating disorders before beginning any nutrition or training "
            "program. Your health and safety come first.\n\n"
            "If you need support, please reach out to a trusted healthcare provider. "
            "Type /start whenever you're ready."
        )
        return ConversationHandler.END
    elif ed_triage == "yellow":
        context.user_data["ed_risk"] = True
    else:
        context.user_data["ed_risk"] = False

    return await _ask_water(query, context.user_data)


# ── NEW SCREENS: Hydration, Alcohol, Work, Mobility, Bloodwork, Mental Health ──

async def _ask_water(query, ud):
    await query.edit_message_text(
        f"{_header(HYDRATION)}Hydration is one of the most underrated performance factors — "
        "even 2% fluid loss impairs performance and recovery.\n\n"
        "How much water do you drink per day on average?",
        reply_markup=_keyboard(
            (_btn("~1 L (2-3 glasses)", "water_1l"),),
            (_btn("~2 L (8 glasses)", "water_2l"),),
            (_btn("~3 L (12 glasses)", "water_3l"),),
            (_btn("4+ L", "water_4l"),),
        ),
    )


async def water_handler(update, context):
    query = update.callback_query
    await query.answer()
    ud = context.user_data
    if query.data in ("water_1l", "water_2l", "water_3l", "water_4l"):
        choices = {"water_1l": "1", "water_2l": "2", "water_3l": "3", "water_4l": "4+"}
        ud["daily_water_liters"] = choices[query.data]
    return await _ask_alcohol(query, ud)


async def _ask_alcohol(query, ud):
    await query.edit_message_text(
        f"{_header(ALCOHOL_WEEKLY)}Another factor that can significantly impact your progress — "
        "how many alcoholic drinks do you have on an average week?",
        reply_markup=_keyboard(
            (_btn("None", "alc_0"),),
            (_btn("1-2", "alc_1_2"),),
            (_btn("3-7", "alc_3_7"),),
            (_btn("8-14", "alc_8_14"),),
            (_btn("15+", "alc_15_plus"),),
        ),
    )


async def alcohol_handler(update, context):
    query = update.callback_query
    await query.answer()
    ud = context.user_data
    alc_map = {"alc_0": "0", "alc_1_2": "1_2", "alc_3_7": "3_7", "alc_8_14": "8_14", "alc_15_plus": "15_plus"}
    if query.data in alc_map:
        ud["alcohol_weekly"] = alc_map[query.data]
    return await _ask_work_schedule(query, ud)


async def _ask_work_schedule(query, ud):
    kb = _keyboard(
        (_btn("Day shift — fixed hours", "ws_fixed"),),
        (_btn("Day shift — flexible", "ws_flexible"),),
        (_btn("Night shift", "ws_night"),),
        (_btn("Rotating shifts", "ws_rotating"),),
        (_btn("Student / not working", "ws_other"),),
    )
    await query.edit_message_text(
        f"{_header(WORK_SCHEDULE)}What best describes your work schedule? "
        "This helps me adapt your program around your daily rhythm.",
        reply_markup=kb,
    )


async def work_schedule_handler(update, context):
    query = update.callback_query
    await query.answer()
    ud = context.user_data
    ws_map = {"ws_fixed": "day_fixed", "ws_flexible": "day_flexible", "ws_night": "night",
              "ws_rotating": "rotating", "ws_other": "student"}
    if query.data in ws_map:
        ud["work_schedule"] = ws_map[query.data]
    return await _ask_mobility(query, ud)


async def _ask_mobility(query, ud):
    await query.edit_message_text(
        f"{_header(MOBILITY)}Do you have any mobility limitations or joint pain?",
        reply_markup=_keyboard(
            (_btn("No limitations", "mob_none"),),
            (_btn("Yes — ankles / hips", "mob_lower"),),
            (_btn("Yes — shoulders / neck", "mob_upper"),),
            (_btn("Yes — lower back", "mob_back"),),
            (_btn("Multiple areas", "mob_multi"),),
        ),
    )


async def mobility_handler(update, context):
    query = update.callback_query
    await query.answer()
    ud = context.user_data
    mob_map = {"mob_none": [], "mob_lower": ["ankle/hip"], "mob_upper": ["shoulder/neck"],
               "mob_back": ["lower_back"], "mob_multi": ["multiple"]}
    if query.data in mob_map:
        ud["mobility_limitations"] = mob_map[query.data]
    return await _ask_bloodwork(query, ud)


async def _ask_bloodwork(query, ud):
    await query.edit_message_text(
        f"{_header(BLOODWORK)}When was your last comprehensive bloodwork / lab test? "
        "This helps me check if there are any underlying factors we should be aware of.",
        reply_markup=_keyboard(
            (_btn("Within 6 months", "bw_recent"),),
            (_btn("6-12 months ago", "bw_year"),),
            (_btn("1-2 years ago", "bw_2yr"),),
            (_btn("2+ years ago", "bw_overdue"),),
            (_btn("Never had it done", "bw_never"),),
        ),
    )


async def bloodwork_handler(update, context):
    query = update.callback_query
    await query.answer()
    ud = context.user_data
    bw_map = {"bw_recent": "under_6mo", "bw_year": "6_12mo", "bw_2yr": "1_2yr",
              "bw_overdue": "2yr_plus", "bw_never": "never"}
    if query.data in bw_map:
        ud["last_bloodwork"] = bw_map[query.data]
    return await _ask_mental_health(query, ud)


async def _ask_mental_health(query, ud):
    await query.edit_message_text(
        f"{_header(MENTAL_HEALTH)}Do you experience significant anxiety, depression, "
        "or other mental health concerns that affect your daily functioning? "
        "Your answer is confidential and helps me ensure your program is appropriate.",
        reply_markup=_keyboard(
            (_btn("No", "mh_no"),),
            (_btn("Mild — manageable", "mh_mild"),),
            (_btn("Moderate — affects some days", "mh_moderate"),),
            (_btn("Significant — affects daily life", "mh_significant"),),
        ),
    )


async def mental_health_handler(update, context):
    query = update.callback_query
    await query.answer()
    ud = context.user_data
    mh_map = {"mh_no": "no", "mh_mild": "mild", "mh_moderate": "moderate", "mh_significant": "significant"}
    if query.data in mh_map:
        ud["mental_health_concern"] = mh_map[query.data]
    return await _show_confirm(query, ud)


async def _show_confirm(query, context):
    ud = context.user_data
    alc_labels = {"0": "None", "1_2": "1-2/wk", "3_7": "3-7/wk", "8_14": "8-14/wk", "15_plus": "15+/wk"}
    ws_labels = {"day_fixed": "Fixed day", "day_flexible": "Flex day", "night": "Night", "rotating": "Rotating", "student": "Student/Other"}
    lines = [
        f"{_header(CONFIRM_PROFILE)}Here's your profile before I build your program:\n",
        f"🎯 **Goal:** {ud.get('goal', '?')}",
        f"📊 **Stats:** {ud.get('bodyweight_kg', '?')} kg | "
        f"{ud.get('height_cm', '?')} cm | {ud.get('age', '?')} yrs",
        f"🏋️ **Training:** {ud.get('experience', '?')} | "
        f"{ud.get('training_days', '?')}",
        f"🩺 **Injuries:** {', '.join(ud.get('injuries', [])) if ud.get('injuries') else 'None'}",
        f"🫃 **Gut:** {ud.get('gut_health', '?')}  |  "
        f"😴 **Sleep:** {ud.get('sleep', '?')}",
        f"☕ **Caffeine:** {ud.get('caffeine', '?')}",
        f"💊 **Supplements:** {', '.join(ud.get('supplements', [])) if ud.get('supplements') else 'None'}",
        f"💧 **Water:** {ud.get('daily_water_liters', '?')} L/day  |  "
        f"🍺 **Alcohol:** {alc_labels.get(ud.get('alcohol_weekly', ''), '?')}",
        f"💼 **Schedule:** {ws_labels.get(ud.get('work_schedule', ''), '?')}  |  "
        f"🏃 **Mobility:** {'Limited' if ud.get('mobility_limitations') else 'No issues'}",
        "",
        "Everything look right?",
    ]
    kb = _keyboard(
        (_btn("✅ Yes, build my program", "confirm_yes"),),
        (_btn("✏️ No, start over", "confirm_no")),
    )
    await query.edit_message_text("\n".join(lines), reply_markup=kb, parse_mode="Markdown")
    return CONFIRM_PROFILE


async def confirm_handler(update, context):
    query = update.callback_query
    await query.answer()
    if query.data == "confirm_no":
        context.user_data.clear()
        await query.edit_message_text(
            "No problem. Type /start to begin again."
        )
        return ConversationHandler.END

    raw = {
        "user_id": context.user_data.get("user_id"),
        "name": context.user_data.get("name", ""),
        "goal": context.user_data.get("goal", ""),
        "situation": context.user_data.get("situation", ""),
        "bodyweight_kg": context.user_data.get("bodyweight_kg", "0"),
        "height_cm": context.user_data.get("height_cm", "0"),
        "age": context.user_data.get("age", "0"),
        "sex": "male",
        "experience": context.user_data.get("experience", ""),
        "training_days": context.user_data.get("training_days", ""),
        "session_length": context.user_data.get("session_length", ""),
        "current_split": context.user_data.get("current_split", ""),
        "injuries": context.user_data.get("injuries", []),
        "gut_health": context.user_data.get("gut_health", ""),
        "sleep": context.user_data.get("sleep", ""),
        "stress": context.user_data.get("stress", ""),
        "steps": context.user_data.get("steps", ""),
        "caffeine": context.user_data.get("caffeine", ""),
        "supplements": context.user_data.get("supplements", []),
        "medical": context.user_data.get("medical", []),
        "ed_risk": context.user_data.get("ed_risk", False),
        "triage_result": "yellow" if context.user_data.get("ed_risk") else "green",
        "daily_water_liters": context.user_data.get("daily_water_liters", ""),
        "alcohol_weekly": context.user_data.get("alcohol_weekly", "0"),
        "work_schedule": context.user_data.get("work_schedule", ""),
        "mobility_limitations": context.user_data.get("mobility_limitations", []),
        "last_bloodwork": context.user_data.get("last_bloodwork", ""),
        "mental_health_concern": context.user_data.get("mental_health_concern", ""),
    }

    profile = build_profile(raw)
    save_profile(profile)
    context.user_data["profile"] = profile

    await query.edit_message_text(
        "🚀 **Building your program...**\n\n"
        "This takes about 30 seconds. I'll send your program as a PDF when it's ready.",
        parse_mode="Markdown",
    )

    from mos_bot.core.program_generator import generate_program_pipeline

    result = generate_program_pipeline(profile["user_id"])

    if "error" in result:
        if result.get("blocked"):
            await query.message.reply_text(
                "I'm unable to build your program at this time. "
                "Please consult a healthcare professional before proceeding.\n\n"
                "If you have questions, use /help or contact support."
            )
        else:
            await query.message.reply_text(
                "I ran into an error building your program. Please try again or use /help."
            )
        return ConversationHandler.END

    pdf_path = result.get("pdf_path")

    if pdf_path:
        with open(pdf_path, "rb") as f:
            await query.message.reply_document(
                document=f,
                filename=f"{profile['user_id']}_program.pdf",
                caption=(
                    f"✅ Your program is ready, {profile['name']}.\n\n"
                    f"Here's what I built for you:\n"
                    f"• Goal: {profile['goal']} ({profile['bodyweight_kg']} kg)\n"
                    f"• Phase 1: 4-week foundation\n"
                    f"• Phase 2: Progressive overload\n"
                    f"• Split: {profile['training_days']}-day program\n\n"
                    f"Your full program is attached as a PDF.\n"
                    f"Use /checkin every week to track progress and get adjustments.\n"
                    f"Use /coach to ask me anything about your program."
                ),
            )
    else:
        md_path = result.get("markdown_path", "")
        if md_path and os.path.exists(md_path):
            with open(md_path, "rb") as f:
                await query.message.reply_document(
                    document=f,
                    filename=f"{profile['user_id']}_program.md",
                    caption="Here's your program in markdown format.",
                )
        else:
            await query.message.reply_text(
                "Your program couldn't be delivered as a file. Please try again."
            )

    track("intake_completed", profile["user_id"], {
        "goal": profile.get("goal", ""),
        "triage": profile.get("triage_result", ""),
        "ed_risk": profile.get("ed_risk", False),
    })
    context.user_data.clear()
    return ConversationHandler.END
