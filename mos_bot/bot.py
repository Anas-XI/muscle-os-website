from telegram.ext import (
    ApplicationBuilder, CommandHandler, MessageHandler,
    CallbackQueryHandler, ConversationHandler, filters,
)

from mos_bot.config import BOT_TOKEN
from mos_bot.web.app import start_in_thread
from mos_bot.states import (
    GOAL, SITUATION, EXPERIENCE, WEIGHT, HEIGHT, AGE,
    TRAINING_DAYS, SESSION_LENGTH, CURRENT_SPLIT, INJURIES,
    GUT_HEALTH, SLEEP, STRESS, STEPS, CAFFEINE,
    SUPPLEMENTS, MEDICAL,
    ED_SCREENING_1, ED_SCREENING_2, ED_SCREENING_3, ED_SCREENING_4,
    CONFIRM_PROFILE,
    CHECKIN_WEIGHT, CHECKIN_WAIST, CHECKIN_SLEEP, CHECKIN_READINESS,
    CHECKIN_SORENESS, CHECKIN_ADHERENCE, CHECKIN_TOP_SETS,
    COACH_CHAT,
    HYDRATION, ALCOHOL_WEEKLY, WORK_SCHEDULE, MOBILITY, BLOODWORK,
    RAPID_WEIGHT_LOSS, MENTAL_HEALTH, CRISIS_INTERVENTION,
)
from mos_bot.handlers.start import start, help_command, cancel
from mos_bot.handlers.upload_profile import upload_profile, handle_json_upload
from mos_bot.handlers.intake import (
    start as intake_start,
    goal_handler, situation_handler, experience_handler,
    weight_handler, height_handler, age_handler,
    training_days_handler, session_length_handler,
    current_split_handler, injuries_handler, injuries_text_handler,
    gut_health_handler, sleep_handler, stress_handler,
    steps_handler, caffeine_handler, supplements_handler,
    medical_handler, medical_text_handler,
    ed1_handler, ed2_handler, ed3_handler, ed4_handler,
    confirm_handler,
    water_handler, alcohol_handler, work_schedule_handler,
    mobility_handler, bloodwork_handler,
    rapid_weight_loss_handler, mental_health_handler,
    crisis_intervention_handler,
)
from mos_bot.handlers.checkin import (
    checkin_start,
    checkin_weight_handler, checkin_waist_handler,
    checkin_sleep_handler, checkin_readiness_handler,
    checkin_soreness_handler, checkin_adherence_handler,
    checkin_top_sets_handler,
)
from mos_bot.handlers.coach import coach_start, coach_chat_handler, coach_callback_handler
from mos_bot.handlers.admin import status, users, clear_crisis, test_alert
from mos_bot.handlers.link import link_command


def main():
    if not BOT_TOKEN:
        print("Error: BOT_TOKEN not set in .env")
        return

    app = ApplicationBuilder().token(BOT_TOKEN).build()

    intake_conv = ConversationHandler(
        entry_points=[CommandHandler("intake", intake_start)],
        states={
            GOAL: [CallbackQueryHandler(goal_handler)],
            SITUATION: [CallbackQueryHandler(situation_handler)],
            EXPERIENCE: [CallbackQueryHandler(experience_handler)],
            WEIGHT: [MessageHandler(filters.TEXT & ~filters.COMMAND, weight_handler)],
            HEIGHT: [MessageHandler(filters.TEXT & ~filters.COMMAND, height_handler)],
            AGE: [MessageHandler(filters.TEXT & ~filters.COMMAND, age_handler)],
            TRAINING_DAYS: [CallbackQueryHandler(training_days_handler)],
            SESSION_LENGTH: [CallbackQueryHandler(session_length_handler)],
            CURRENT_SPLIT: [MessageHandler(filters.TEXT & ~filters.COMMAND, current_split_handler)],
            INJURIES: [
                CallbackQueryHandler(injuries_handler),
                MessageHandler(filters.TEXT & ~filters.COMMAND, injuries_text_handler),
            ],
            GUT_HEALTH: [CallbackQueryHandler(gut_health_handler)],
            SLEEP: [CallbackQueryHandler(sleep_handler)],
            STRESS: [CallbackQueryHandler(stress_handler)],
            STEPS: [CallbackQueryHandler(steps_handler)],
            CAFFEINE: [CallbackQueryHandler(caffeine_handler)],
            SUPPLEMENTS: [
                CallbackQueryHandler(supplements_handler),
                MessageHandler(filters.TEXT & ~filters.COMMAND, supplements_handler),
            ],
            MEDICAL: [
                CallbackQueryHandler(medical_handler),
                MessageHandler(filters.TEXT & ~filters.COMMAND, medical_text_handler),
            ],
            ED_SCREENING_1: [CallbackQueryHandler(ed1_handler)],
            ED_SCREENING_2: [CallbackQueryHandler(ed2_handler)],
            ED_SCREENING_3: [CallbackQueryHandler(ed3_handler)],
            ED_SCREENING_4: [CallbackQueryHandler(ed4_handler)],
            HYDRATION: [CallbackQueryHandler(water_handler)],
            ALCOHOL_WEEKLY: [CallbackQueryHandler(alcohol_handler)],
            WORK_SCHEDULE: [CallbackQueryHandler(work_schedule_handler)],
            MOBILITY: [CallbackQueryHandler(mobility_handler)],
            BLOODWORK: [CallbackQueryHandler(bloodwork_handler)],
            RAPID_WEIGHT_LOSS: [CallbackQueryHandler(rapid_weight_loss_handler)],
            MENTAL_HEALTH: [CallbackQueryHandler(mental_health_handler)],
            CRISIS_INTERVENTION: [CallbackQueryHandler(crisis_intervention_handler)],
            CONFIRM_PROFILE: [CallbackQueryHandler(confirm_handler)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
        name="intake_conversation",
        persistent=False,
    )

    checkin_conv = ConversationHandler(
        entry_points=[CommandHandler("checkin", checkin_start)],
        states={
            CHECKIN_WEIGHT: [MessageHandler(filters.TEXT & ~filters.COMMAND, checkin_weight_handler)],
            CHECKIN_WAIST: [MessageHandler(filters.TEXT & ~filters.COMMAND, checkin_waist_handler)],
            CHECKIN_SLEEP: [CallbackQueryHandler(checkin_sleep_handler)],
            CHECKIN_READINESS: [CallbackQueryHandler(checkin_readiness_handler)],
            CHECKIN_SORENESS: [CallbackQueryHandler(checkin_soreness_handler)],
            CHECKIN_ADHERENCE: [CallbackQueryHandler(checkin_adherence_handler)],
            CHECKIN_TOP_SETS: [CallbackQueryHandler(checkin_top_sets_handler)],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
        name="checkin_conversation",
        persistent=False,
    )

    coach_conv = ConversationHandler(
        entry_points=[CommandHandler("coach", coach_start)],
        states={
            COACH_CHAT: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, coach_chat_handler),
                CallbackQueryHandler(coach_callback_handler),
            ],
        },
        fallbacks=[CommandHandler("cancel", cancel)],
        name="coach_conversation",
        persistent=False,
    )

    app.add_handler(intake_conv)
    app.add_handler(checkin_conv)
    app.add_handler(coach_conv)
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("link", link_command))
    app.add_handler(CommandHandler("upload_profile", upload_profile))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_json_upload))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("status", status))
    app.add_handler(CommandHandler("users", users))
    app.add_handler(CommandHandler("clear_crisis", clear_crisis))
    app.add_handler(CommandHandler("test_alert", test_alert))

    try:
        start_in_thread()
    except Exception as e:
        print(f"Warning: Web dashboard failed to start: {e}")
    print("Muscle OS Bot + Web started. Press Ctrl+C to stop.")
    app.run_polling()


if __name__ == "__main__":
    main()
