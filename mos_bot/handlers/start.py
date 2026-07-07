import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes, ConversationHandler
from mos_bot.states import GOAL
from mos_bot.core.analytics import track


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    first_name = update.effective_user.first_name
    user_id = str(update.effective_user.id)
    context.user_data["name"] = first_name
    context.user_data["user_id"] = user_id
    track("user_started", user_id, {"source": "start_command"})

    # Send the intake form as a file
    form_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "intake-form.html")
    if os.path.exists(form_path):
        with open(form_path, "rb") as f:
            await update.message.reply_document(
                document=f,
                filename="intake-form.html",
                caption="Muscle OS — Client Intake Form"
            )

    text = (
        f"Welcome to Muscle OS, {first_name}.\n\n"
        "Here's your intake form (attached above). Do this:\n\n"
        "1. Open the HTML file in your browser\n"
        "2. Fill out all sections\n"
        "3. Click 'Save Results as JSON'\n"
        "4. Send the .json file back to me\n\n"
        "I'll build your coaching program and send it as a PDF.\n\n"
        "Or use /intake for the step-by-step chat version."
    )
    await update.message.reply_text(text)
    return ConversationHandler.END


async def intake_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Start the step-by-step conversation intake (alternative to form upload)."""
    first_name = update.effective_user.first_name
    user_id = str(update.effective_user.id)
    context.user_data["name"] = first_name
    context.user_data["user_id"] = user_id
    track("user_started", user_id, {"source": "intake_command"})

    text = (
        f"Welcome to Muscle OS, {first_name}.\n\n"
        "I'm going to ask you a series of questions to build your coaching profile. "
        "It takes about 5 minutes.\n\n"
        "When you're ready, tap below."
    )
    keyboard = [[InlineKeyboardButton("Let's go \u2192", callback_data="start_intake")]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(text, reply_markup=reply_markup)
    return GOAL


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = (
        "/start - Get the intake form\n"
        "/intake - Step-by-step chat intake\n"
        "/checkin - Weekly check-in to track progress\n"
        "/coach - Ask me anything about your program\n"
        "/cancel - Cancel current conversation\n"
        "/help - Show this message"
    )
    await update.message.reply_text(text)


async def cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    context.user_data.clear()
    await update.message.reply_text("No problem. Type /start whenever you're ready.")
    return ConversationHandler.END
