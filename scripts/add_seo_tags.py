import os, re

BASE_URL = "https://muscleos.is-a.dev"
OG_IMAGE = f"{BASE_URL}/assets/img/coach.jpg"

DESCRIPTIONS = {
    "index.html": "Muscle OS by Coach Anas Mo'men — evidence-based hypertrophy & powerlifting coaching, AI-powered training programs, nutrition plans, and interactive fitness tools.",
    "order.html": "Purchase access to Muscle OS premium training tools and reference books by Coach Anas Mo'men. Unlock TDEE calculator, volume calculator, and full book library.",
    "pdf/viewer.html": "Secure PDF viewer for Muscle OS training programs, nutrition guides, and reference books by Coach Anas Mo'men.",
    "admin/orders.html": "Muscle OS order management dashboard — approve, reject, and manage customer orders and access codes.",
    "tools/index.html": "Free interactive training & nutrition tools by Coach Anas Mo'men — TDEE calculator, volume calculator, RPE calculator, split selector quiz, and more.",
    "tools/tdee_macro_calculator.html": "Precision TDEE & macro calculator by Coach Anas Mo'men. Calculate your maintenance calories, optimal macros for cutting, bulking, or recomposition.",
    "tools/tdee_adaptive_engine.html": "Adaptive TDEE & macro engine by Coach Anas Mo'men. Track your weight trends and get dynamically adjusting calorie and macro targets.",
    "tools/volume_set_calculator.html": "Training volume & set calculator by Coach Anas Mo'men. Calculate optimal sets per muscle group based on your experience level and goals.",
    "tools/training_tool.html": "Unified training tool by Coach Anas Mo'men — log workouts, track volume, monitor e1RM progression, and generate periodized programs.",
    "tools/split_selector_quiz.html": "Training split selector quiz by Coach Anas Mo'men. Answer a few questions to find the optimal workout split for your goals and schedule.",
    "tools/rpe_load_calculator.html": "RPE load calculator by Coach Anas Mo'men. Convert between RPE, percentages, and estimated 1RM for precise training intensity.",
    "books/index.html": "Reference books by Coach Anas Mo'men — comprehensive science-based guides to training, nutrition, and hormonal optimization for body composition.",
    "books/muscle_os_training_book.html": "Muscle OS Training Book by Coach Anas Mo'men — complete guide to evidence-based programming, periodization, exercise selection, and recovery.",
    "books/muscle_os_nutrition_book.html": "Muscle OS Nutrition Book by Coach Anas Mo'men — complete guide to diet, macronutrients, meal timing, and supplementation for body composition.",
    "books/muscle_os_hormonal_book.html": "Muscle OS Hormonal Optimization Book by Coach Anas Mo'men — endocrine-informed programme design for body composition and performance.",
    "guides/index.html": "Free training & nutrition guides by Coach Anas Mo'men — quick start protocols, decision trees, cheat sheets, and the consistency workbook.",
    "guides/train_maxing_quick_start.html": "Train Maxing quick start guide by Coach Anas Mo'men — 7-day protocol to build a structured training habit with progressive overload.",
    "guides/recomp_protocol_cheat_sheet.html": "Body recomposition cheat sheet by Coach Anas Mo'men — simultaneous fat loss and muscle gain strategy at a glance.",
    "guides/plateau_decision_tree.html": "Fat loss plateau decision tree by Coach Anas Mo'men — diagnose and break through weight loss stalls systematically.",
    "guides/deload_decision_tree.html": "Deload decision tree by Coach Anas Mo'men — know exactly when and how to deload based on fatigue, performance, and recovery markers.",
    "guides/diet_maxing_quick_start.html": "Diet Maxing quick start guide by Coach Anas Mo'men — 7-day protocol to build consistent nutrition habits for body composition goals.",
    "guides/consistency_workbook.html": "The Consistency Workbook by Coach Anas Mo'men — practical exercises to build habits, track adherence, and stay on track.",
    "knowledge-hub/index.html": "Curated fitness knowledge hub by Coach Anas Mo'men — evidence-based articles and resources on training science, nutrition, and recovery.",
    "training bundle/train_maxing_quick_start.html": "Train Maxing quick start guide by Coach Anas Mo'men — 7-day protocol to build a structured training habit with progressive overload.",
    "training bundle/training_tool.html": "Unified training tool by Coach Anas Mo'men — log workouts, track volume, monitor e1RM progression, and generate periodized programs.",
    "training bundle/volume_set_calculator.html": "Training volume & set calculator by Coach Anas Mo'men. Calculate optimal sets per muscle group based on your experience level and goals.",
    "training bundle/split_selector_quiz.html": "Training split selector quiz by Coach Anas Mo'men. Find the optimal workout split for your goals and schedule.",
    "training bundle/rpe_load_calculator.html": "RPE load calculator by Coach Anas Mo'men. Convert between RPE, percentages, and estimated 1RM.",
    "training bundle/muscle_os_training_book.html": "Muscle OS Training Book by Coach Anas Mo'men — complete guide to evidence-based programming and periodization.",
    "training bundle/deload_decision_tree.html": "Deload decision tree by Coach Anas Mo'men — know when and how to deload based on fatigue and recovery markers.",
    "nutrition bundle/diet_maxing_quick_start.html": "Diet Maxing quick start guide by Coach Anas Mo'men — 7-day protocol to build consistent nutrition habits.",
    "nutrition bundle/consistency_workbook.html": "The Consistency Workbook by Coach Anas Mo'men — practical exercises to build habits and track adherence.",
    "nutrition bundle/tdee_macro_calculator.html": "Precision TDEE & macro calculator by Coach Anas Mo'men. Calculate maintenance calories and optimal macros.",
    "nutrition bundle/tdee_adaptive_engine.html": "Adaptive TDEE & macro engine by Coach Anas Mo'men. Track weight trends and get dynamically adjusting targets.",
    "nutrition bundle/recomp_protocol_cheat_sheet.html": "Body recomposition cheat sheet by Coach Anas Mo'men — simultaneous fat loss and muscle gain strategy.",
    "nutrition bundle/plateau_decision_tree.html": "Fat loss plateau decision tree by Coach Anas Mo'men — diagnose and break through weight loss stalls.",
    "nutrition bundle/muscle_os_nutrition_book.html": "Muscle OS Nutrition Book by Coach Anas Mo'men — complete guide to diet and nutrition for body composition.",
    "nutrition bundle/muscle_os_nutrition_book_ar.html": "Muscle OS Nutrition Book by Coach Anas Mo'men — comprehensive Arabic guide to diet and body composition.",
    "nutrition bundle/muscle_os_nutrition_book_fr.html": "Muscle OS Nutrition Book by Coach Anas Mo'men — comprehensive French guide to diet and body composition.",
    "nutrition bundle/translated_sections_fr.html": "",  # HTML fragment, skip
    "nutrition bundle/domain2_french_translations.html": "",  # HTML fragment, skip
}

TITLES = {
    "index.html": "Coach Anas Mo'men — Hypertrophy & Powerlifting Coach | Muscle OS",
    "order.html": "Order — Purchase Muscle OS Training Tools & Books",
    "pdf/viewer.html": "PDF Viewer — Muscle OS by Coach Anas Mo'men",
    "admin/orders.html": "Muscle OS — Order Approval Dashboard",
    "tools/index.html": "Training & Nutrition Tools — Coach Anas Mo'men | Muscle OS",
    "tools/tdee_macro_calculator.html": "TDEE & Macro Calculator — Coach Anas Mo'men | Muscle OS",
    "tools/tdee_adaptive_engine.html": "Adaptive TDEE Engine — Coach Anas Mo'men | Muscle OS",
    "tools/volume_set_calculator.html": "Volume & Set Calculator — Coach Anas Mo'men | Muscle OS",
    "tools/training_tool.html": "Training Tool — Unified Tracker & Program Generator | Muscle OS",
    "tools/split_selector_quiz.html": "Training Split Selector Quiz — Coach Anas Mo'men | Muscle OS",
    "tools/rpe_load_calculator.html": "RPE Load Calculator — Coach Anas Mo'men | Muscle OS",
    "books/index.html": "Reference Books — Coach Anas Mo'men | Muscle OS",
    "books/muscle_os_training_book.html": "Muscle OS Training Book — Evidence-Based Programming Guide",
    "books/muscle_os_nutrition_book.html": "Muscle OS Nutrition Book — Diet & Body Composition Guide",
    "books/muscle_os_hormonal_book.html": "Muscle OS Hormonal Optimization Book — Endocrine-Informed Coaching",
    "guides/index.html": "Free Fitness Guides — Coach Anas Mo'men | Muscle OS",
    "guides/train_maxing_quick_start.html": "Train Maxing Quick Start — 7-Day Protocol | Muscle OS",
    "guides/recomp_protocol_cheat_sheet.html": "Body Recomposition Cheat Sheet — Coach Anas Mo'men | Muscle OS",
    "guides/plateau_decision_tree.html": "Fat Loss Plateau Decision Tree — Coach Anas Mo'men | Muscle OS",
    "guides/deload_decision_tree.html": "Deload Decision Tree — Coach Anas Mo'men | Muscle OS",
    "guides/diet_maxing_quick_start.html": "Diet Maxing Quick Start — 7-Day Protocol | Muscle OS",
    "guides/consistency_workbook.html": "The Consistency Workbook — Coach Anas Mo'men | Muscle OS",
    "knowledge-hub/index.html": "Knowledge Hub — Coach Anas Mo'men | Muscle OS",
    "training bundle/train_maxing_quick_start.html": "Train Maxing Quick Start — 7-Day Protocol | Muscle OS",
    "training bundle/training_tool.html": "Training Tool — Unified Tracker & Program Generator | Muscle OS",
    "training bundle/volume_set_calculator.html": "Volume & Set Calculator — Coach Anas Mo'men | Muscle OS",
    "training bundle/split_selector_quiz.html": "Training Split Selector Quiz — Coach Anas Mo'men | Muscle OS",
    "training bundle/rpe_load_calculator.html": "RPE Load Calculator — Coach Anas Mo'men | Muscle OS",
    "training bundle/muscle_os_training_book.html": "Muscle OS Training Book — Evidence-Based Programming Guide",
    "training bundle/deload_decision_tree.html": "Deload Decision Tree — Coach Anas Mo'men | Muscle OS",
    "nutrition bundle/diet_maxing_quick_start.html": "Diet Maxing Quick Start — 7-Day Protocol | Muscle OS",
    "nutrition bundle/consistency_workbook.html": "The Consistency Workbook — Coach Anas Mo'men | Muscle OS",
    "nutrition bundle/tdee_macro_calculator.html": "TDEE & Macro Calculator — Coach Anas Mo'men | Muscle OS",
    "nutrition bundle/tdee_adaptive_engine.html": "Adaptive TDEE Engine — Coach Anas Mo'men | Muscle OS",
    "nutrition bundle/recomp_protocol_cheat_sheet.html": "Body Recomposition Cheat Sheet — Coach Anas Mo'men | Muscle OS",
    "nutrition bundle/plateau_decision_tree.html": "Fat Loss Plateau Decision Tree — Coach Anas Mo'men | Muscle OS",
    "nutrition bundle/muscle_os_nutrition_book.html": "Muscle OS Nutrition Book — Diet & Body Composition Guide",
    "nutrition bundle/muscle_os_nutrition_book_ar.html": "Muscle OS Nutrition Book (Arabic) — دليل التغذية وتكوين الجسم",
    "nutrition bundle/muscle_os_nutrition_book_fr.html": "Muscle OS Nutrition Book (French) — Guide Complet de l'Alimentation",
}

def add_seo_tags(filepath, rel_path):
    desc = DESCRIPTIONS.get(rel_path, "")
    if desc == "":
        return False

    new_title = TITLES.get(rel_path, "")

    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()

    # --- Update <title> ---
    if new_title:
        html = re.sub(
            r"<title>[^<]*</title>",
            f"<title>{new_title}</title>",
            html
        )

    # --- Build OG block ---
    og_block = f"""  <meta name="description" content="{desc}">
  <meta property="og:title" content="{new_title or 'Muscle OS by Coach Anas Mo\'men'}">
  <meta property="og:description" content="{desc}">
  <meta property="og:image" content="{OG_IMAGE}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="1200">
  <meta property="og:type" content="website">
  <meta property="og:url" content="{BASE_URL}/{rel_path.replace(chr(92), '/')}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{new_title or 'Muscle OS by Coach Anas Mo\'men'}">
  <meta name="twitter:description" content="{desc}">
  <meta name="twitter:image" content="{OG_IMAGE}">"""

    # Insert OG block after <title>
    html = re.sub(
        r"(</title>\s*)",
        r"\1" + og_block + "\n",
        html
    )

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)

    return True

root = r"E:\MoS\website"
count = 0
for dirpath, dirnames, filenames in os.walk(root):
    skip_dirs = {".git", "node_modules", ".opencode"}
    dirnames[:] = [d for d in dirnames if d not in skip_dirs]
    for fn in filenames:
        if not fn.endswith(".html"):
            continue
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, root).replace("\\", "/")
        if add_seo_tags(full, rel):
            print(f"  OK  {rel}")
            count += 1
        else:
            print(f"  SKIP {rel}")

print(f"\n{count} files updated")
