from telegram import Update
from telegram.ext import ContextTypes
from mos_bot.core.supabase_sync import link_telegram

async def link_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle the /link <uuid> command to link Telegram with Web App."""
    telegram_id = update.effective_user.id

    if not context.args or len(context.args) == 0:
        await update.message.reply_text(
            "🔗 **Link Your Muscle OS Account**\n\n"
            "To link your Telegram to your Muscle OS web dashboard:\n"
            "1. Sign in to your Muscle OS Web App using Google.\n"
            "2. In your Dashboard, go to **Settings → Telegram Link**.\n"
            "3. Enter your Telegram ID: `" + str(telegram_id) + "`\n\n"
            "Alternatively, if you have your Web App User ID or Link Token, run:\n"
            "`/link YOUR_USER_ID`",
            parse_mode="Markdown"
        )
        return

    user_uuid = context.args[0].strip()
    
    # Basic validation for UUID / Google sub length
    if len(user_uuid) < 16 or len(user_uuid) > 128:
        await update.message.reply_text("⚠️ Invalid ID or Token format. Please check your web dashboard.")
        return

    success = await link_telegram(telegram_id, user_uuid)
    
    if success:
        await update.message.reply_text(
            "✅ **Account Linked Successfully!**\n\n"
            "Your Telegram profile and bodyweight check-ins will now automatically sync to your Web App dashboard.",
            parse_mode="Markdown"
        )
    else:
        await update.message.reply_text(
            "❌ Failed to link account. Please ensure the backend is reachable or link directly from your web dashboard."
        )
