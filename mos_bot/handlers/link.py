from telegram import Update
from telegram.ext import ContextTypes
from mos_bot.core.supabase_sync import link_telegram

async def link_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle the /link <uuid> command to link Telegram with Web App."""
    if not context.args or len(context.args) == 0:
        await update.message.reply_text(
            "⚠️ Please provide your Web App ID.\n"
            "Example: `/link 123e4567-e89b-12d3-a456-426614174000`",
            parse_mode="Markdown"
        )
        return

    user_uuid = context.args[0].strip()
    
    # Very basic length check for UUID
    if len(user_uuid) < 30:
        await update.message.reply_text("⚠️ Invalid ID format. It should look like a long code with dashes.")
        return

    telegram_id = update.effective_user.id

    success = await link_telegram(telegram_id, user_uuid)
    
    if success:
        await update.message.reply_text(
            "✅ **Account Linked Successfully!**\n\n"
            "Your Telegram profile and bodyweight check-ins will now automatically sync to your Web App dashboard.",
            parse_mode="Markdown"
        )
    else:
        await update.message.reply_text(
            "❌ Failed to link account. Please ensure the backend is connected and try again."
        )
