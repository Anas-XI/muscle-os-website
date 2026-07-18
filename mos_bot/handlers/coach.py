import os
import json
import logging
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler
from mos_bot.states import COACH_CHAT
from mos_bot.core.intake_builder import load_profile
from mos_bot.core.models import ClientProfile
from mos_bot.core.context_loader import format_crisis_resources
from mos_bot.core.analytics import track
from mos_bot.web.routers.arbitrate import arbitrate, ArbitrateRequest
from mos_bot.config import DATA_ROOT, OWNER_ID
from chatbot import chat_completion, check_server, LMSTUDIO_MODEL
from checkin_tracker import CheckInStore
from coaching_mode import QUICK_DECISION_PROMPT

logger = logging.getLogger(__name__)


async def coach_start(update, context):
    user_id = str(update.effective_user.id)
    raw_profile = load_profile(user_id)
    if not raw_profile:
        await update.message.reply_text(
            "I don't have a profile for you yet. Please complete intake first with /start."
        )
        return ConversationHandler.END

    # Build ClientProfile (same model /arbitrate uses)
    profile = ClientProfile.from_dict(raw_profile)

    # Load persisted ED answers from profile (intake persists these now)
    ed_answers = {
        "ED1": raw_profile.get("ED1", "no"),
        "ED2": raw_profile.get("ED2", "no"),
        "ED3": raw_profile.get("ED3", "no"),
        "ED4": raw_profile.get("ED4", "no"),
    }
    try:
        result = arbitrate(ArbitrateRequest(profile=profile, ed_answers=ed_answers))
    except Exception:
        logger.exception("coach_start arbitrate call failed — blocking safely")
        await update.message.reply_text(
            "I'm unable to verify your safety profile right now. "
            "Please try again later or contact support."
        )
        return ConversationHandler.END

    if result.verdict == "block":
        msg = result.caution_note or "Your profile has a safety flag that prevents coaching."
        await update.message.reply_text(msg)

        track("coach_blocked", user_id, {"block_reason": result.block_reason})

        # Only crisis-tier blocks page the owner
        if result.block_reason == "crisis" and OWNER_ID:
            try:
                await context.bot.send_message(
                    chat_id=OWNER_ID,
                    text=(
                        f"\u26a0\ufe0f CRISIS: user {user_id}\n"
                        f"Blocked at /coach invocation.\n\n"
                        f"Manual follow-up required.\n"
                        f"Use /clear_crisis {user_id} <note> after contact."
                    )
                )
            except Exception as e:
                logger.error("Failed to notify owner of coach crisis: %s", e)

        return ConversationHandler.END

    store = CheckInStore(os.path.join(DATA_ROOT, "checkins"))
    checkins = store.load_all(user_id)

    context_data = f"User Profile:\n{json.dumps(raw_profile, indent=2)}\n"
    if checkins:
        last = checkins[-1]
        context_data += f"\nLast Check-in: {last.timestamp[:10]}, Weight: {last.weight_kg}, Readiness: {last.readiness}"

    context.user_data["coach_context"] = context_data
    context.user_data["coach_user_id"] = user_id

    await update.message.reply_text(
        "Ask me anything about your training, nutrition, or program.\n"
        "Type /done when you're finished."
    )

    return COACH_CHAT


async def coach_chat_handler(update, context):
    text = update.message.text.strip()
    if text.lower() == "/done":
        await update.message.reply_text(
            "Got it. Use /coach any time to ask more questions."
        )
        context.user_data.clear()
        return ConversationHandler.END

    if not check_server():
        await update.message.reply_text(
            "I'm having trouble connecting to the AI engine. "
            "Make sure LM Studio is running with a model loaded, then try again."
        )
        return COACH_CHAT

    await update.message.chat.send_action(action="typing")

    context_data = context.user_data.get("coach_context", "")
    messages = [
        {"role": "system", "content": QUICK_DECISION_PROMPT + f"\n\nCurrent context:\n{context_data}"},
        {"role": "user", "content": text},
    ]

    track("coach_question", context.user_data.get("coach_user_id", "?"), {"question_length": len(text)})

    response = await chat_completion(messages, model=LMSTUDIO_MODEL, temperature=0.4, max_tokens=1024)

    if response:
        kb = InlineKeyboardMarkup([
            [InlineKeyboardButton("1. Ask a follow-up", callback_data="coach_followup"),
             InlineKeyboardButton("2. See the science", callback_data="coach_science")],
            [InlineKeyboardButton("3. Back to menu", callback_data="coach_done")],
        ])
        await update.message.reply_text(response, reply_markup=kb)
    else:
        await update.message.reply_text(
            "I couldn't generate a response right now. Please try again."
        )

    return COACH_CHAT


async def coach_callback_handler(update, context):
    query = update.callback_query
    await query.answer()

    if query.data == "coach_done":
        await query.edit_message_text("Got it. Use /coach any time to ask more questions.")
        context.user_data.clear()
        return ConversationHandler.END

    if query.data == "coach_science":
        await query.edit_message_text(
            "Science look-up is available through LM Studio. "
            "Ask a specific question to dive deeper."
        )

    return COACH_CHAT
