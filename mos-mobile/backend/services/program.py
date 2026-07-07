from db_adapter import get_client_profile, deactivate_programs, insert_program

def generate_program_for_user(user_id: str) -> dict:
    profile = get_client_profile(user_id)
    if not profile:
        return {"error": "Profile not found. Complete intake first."}

    try:
        from mos_bot.core.program_generator import generate_program as gp

        program_md = gp(profile)
    except Exception as e:
        import traceback
        program_md = f"Error generating program:\n{traceback.format_exc()}"

    if program_md is None:
        return {"error": "Program generation blocked — profile requires professional screening before a program can be built."}

    deactivate_programs(user_id)
    pid = insert_program({
        "user_id": user_id,
        "title": f"Program {profile.get('goal', 'General')}",
        "content": program_md,
    })

    return {"program_id": pid, "content": program_md}
