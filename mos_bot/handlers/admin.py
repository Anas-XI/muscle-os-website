import os
import json
from datetime import datetime
from telegram import Update
from telegram.ext import ContextTypes
from mos_bot.config import OWNER_ID, USERS_DIR
from chatbot import check_server


async def status(update, context):
    if str(update.effective_user.id) != str(OWNER_ID):
        await update.message.reply_text("Unauthorized.")
        return

    user_files = [f for f in os.listdir(USERS_DIR) if f.endswith(".json")]
    checkins_dir = os.path.join(os.path.dirname(USERS_DIR), "checkins")
    programs_dir = os.path.join(os.path.dirname(USERS_DIR), "programs")

    prog_count = len([f for f in os.listdir(programs_dir) if f.endswith("_program.md")]) if os.path.isdir(programs_dir) else 0
    lm_online = check_server()

    last_checkin = "N/A"
    if os.path.isdir(checkins_dir):
        ck_files = [f for f in os.listdir(checkins_dir) if f.endswith("_checkins.json")]
        latest_ts = ""
        for cf in ck_files:
            with open(os.path.join(checkins_dir, cf), "r") as f:
                try:
                    data = json.load(f)
                    if data:
                        ts = data[-1].get("timestamp", "")
                        if ts > latest_ts:
                            latest_ts = ts
                except Exception:
                    pass
        if latest_ts:
            last_checkin = latest_ts[:10]

    text = (
        f"Muscle OS Bot Status\n"
        f"Users: {len(user_files)}\n"
        f"Programs generated: {prog_count}\n"
        f"LM Studio: {'\u2705 online' if lm_online else '\u274c offline'}\n"
        f"Last check-in: {last_checkin}"
    )
    await update.message.reply_text(text)


async def users(update, context):
    if str(update.effective_user.id) != str(OWNER_ID):
        await update.message.reply_text("Unauthorized.")
        return

    user_files = [f for f in os.listdir(USERS_DIR) if f.endswith(".json")]
    if not user_files:
        await update.message.reply_text("No users yet.")
        return

    lines = ["Registered users:"]
    for fname in sorted(user_files):
        with open(os.path.join(USERS_DIR, fname), "r") as f:
            try:
                data = json.load(f)
                uid = fname.replace(".json", "")
                goal = data.get("goal", "?")
                date = data.get("date", "?")
                lines.append(f"\n{uid}: goal={goal}, intake={date}")
            except Exception:
                lines.append(f"\n{fname}: error reading")

    text = "\n".join(lines)
    if len(text) > 4000:
        text = text[:4000] + "\n... (truncated)"
    await update.message.reply_text(text)


async def clear_crisis(update, context):
    if str(update.effective_user.id) != str(OWNER_ID):
        await update.message.reply_text("Unauthorized.")
        return
    if not context.args:
        await update.message.reply_text("Usage: /clear_crisis <user_id>")
        return
    user_id = context.args[0]
    path = os.path.join(USERS_DIR, f"{user_id}.json")
    if not os.path.exists(path):
        await update.message.reply_text(f"User {user_id} not found.")
        return
    with open(path, "r", encoding="utf-8") as f:
        profile = json.load(f)
    if not profile.get("crisis_cleared"):
        profile["crisis_cleared"] = True
        with open(path, "w", encoding="utf-8") as f:
            json.dump(profile, f, indent=2)
        from mos_bot.core.analytics import track
        track("crisis_cleared", user_id, {"cleared_by": str(update.effective_user.id)})
        await update.message.reply_text(
            f"Crisis flag cleared for {user_id}. They can now generate a program."
        )
    else:
        await update.message.reply_text(f"Crisis flag already cleared for {user_id}.")
