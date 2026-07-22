from fastapi import APIRouter, Request, Form
from fastapi.responses import HTMLResponse
import logging

from mos_bot.core.intake_builder import save_supplemental, load_supplemental

logger = logging.getLogger(__name__)
router = APIRouter()

FORM_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Safety Profile — Supplemental Intake</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Inter', system-ui, sans-serif; background: #FAFAF8; color: #14151A; padding: 1rem; }}
  .container {{ max-width: 640px; margin: 2rem auto; background: #FAFAF8; border: 1px solid #E4E1D8; border-radius: 12px; padding: 2rem; box-shadow: 0 1px 2px rgba(20,21,26,0.04); }}
  h1 {{ font-family: 'Oswald', sans-serif; font-size: 1.5rem; margin-bottom: 0.25rem; color: #14151A; }}
  p.sub {{ color: #5B5F68; margin-bottom: 1.5rem; }}
  fieldset {{ border: 1px solid #E4E1D8; border-radius: 8px; padding: 1rem; margin-bottom: 1.25rem; }}
  legend {{ font-weight: 600; font-size: 1.05rem; padding: 0 0.5rem; color: #14151A; }}
  label {{ display: block; margin: 0.75rem 0 0.25rem; font-size: 0.9rem; }}
  select, input[type=text] {{ width: 100%; padding: 0.5rem; border: 1.5px solid #E4E1D8; border-radius: 8px; font-size: 0.95rem; font-family: 'Inter', sans-serif; background: #fff; color: #14151A; }}
  select:focus, input[type=text]:focus {{ outline: none; border-color: #14151A; }}
  .radio-group {{ display: flex; gap: 1rem; margin-top: 0.25rem; }}
  .radio-group label {{ display: flex; align-items: center; gap: 0.3rem; font-weight: 400; }}
  button {{ width: 100%; padding: 0.75rem; background: #14151A; color: #F4C93B; border: none; border-radius: 10px; font-size: 1rem; cursor: pointer; font-family: 'Oswald', sans-serif; letter-spacing: 0.5px; text-transform: uppercase; }}
  button:hover {{ background: #1E2027; }}
  .success {{ background: #f5f5f3; border: 1px solid #E4E1D8; border-radius: 8px; padding: 1rem; text-align: center; color: #14151A; }}
</style>
</head>
<body>
<div class="container">
  <h1>Safety Profile</h1>
  <p class="sub">A few additional details needed before we can generate your program.</p>
  <form method="POST">
    <fieldset>
      <legend>Mental Health</legend>
      <label for="mental_health_concern">Do you experience anxiety, depression, or other mental health concerns that affect your daily functioning?</label>
      <select id="mental_health_concern" name="mental_health_concern" required>
        <option value="">Select...</option>
        <option value="none">No — I manage well day-to-day</option>
        <option value="moderate">Moderate — affects some days</option>
        <option value="significant">Significant — affects most days or is untreated</option>
      </select>
    </fieldset>

    <fieldset>
      <legend>Known Nutrient Deficiencies</legend>
      <label for="known_deficiencies">List any diagnosed nutrient deficiencies (comma-separated, e.g. "iron, vitamin D"). Leave blank if none.</label>
      <input type="text" id="known_deficiencies" name="known_deficiencies" placeholder="e.g. iron, vitamin D, B12" autocomplete="off">
      <div id="deficiency_details" style="display:none;margin-top:0.75rem;">
        <label><input type="checkbox" name="deficiency_confirmed" value="yes"> These deficiencies have been confirmed by bloodwork</label>
        <label for="deficiency_status" style="margin-top:0.75rem;">What is the status of the listed deficiencies?</label>
        <select id="deficiency_status" name="deficiency_status">
          <option value="current">Current / untreated</option>
          <option value="resolved">Past / resolved with treatment</option>
        </select>
      </div>
    </fieldset>
    <script>
      document.getElementById('known_deficiencies').addEventListener('input', function() {
        document.getElementById('deficiency_details').style.display = this.value.trim() ? 'block' : 'none';
      });
    </script>

    <fieldset>
      <legend>Injuries</legend>
      <label for="injuries">List any current or recurring injuries (comma-separated, e.g. "knee, lower back"). Leave blank if none.</label>
      <input type="text" id="injuries" name="injuries" placeholder="e.g. knee, shoulder, lower back" autocomplete="off">
    </fieldset>

    <fieldset>
      <legend>Eating Disorder Screening</legend>
      <p style="font-size:0.85rem;color:#5B5F68;margin-bottom:0.75rem;">These questions help us ensure programs are appropriate for your needs.</p>
      <label>In the past 3 months, have you had episodes of binge eating (eating a very large amount of food with a sense of loss of control)?</label>
      <div class="radio-group"><label><input type="radio" name="ED1" value="yes" required> Yes</label><label><input type="radio" name="ED1" value="no"> No</label></div>
      <label>In the past 3 months, have you used vomiting, laxatives, or excessive exercise to compensate for eating?</label>
      <div class="radio-group"><label><input type="radio" name="ED2" value="yes" required> Yes</label><label><input type="radio" name="ED2" value="no"> No</label></div>
      <label>Have you ever been diagnosed with an eating disorder?</label>
      <div class="radio-group"><label><input type="radio" name="ED3" value="yes" required> Yes</label><label><input type="radio" name="ED3" value="no"> No</label></div>
      <label>Do you frequently feel guilty or ashamed after eating?</label>
      <div class="radio-group"><label><input type="radio" name="ED4" value="yes" required> Yes</label><label><input type="radio" name="ED4" value="no"> No</label></div>
    </fieldset>

    <button type="submit">Submit Safety Profile</button>
  </form>
</div>
</body>
</html>
"""

SUCCESS_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Safety Profile Saved</title>
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: 'Inter', system-ui, sans-serif; background: #FAFAF8; color: #14151A; padding: 1rem; }}
  .container {{ max-width: 640px; margin: 2rem auto; background: #FAFAF8; border: 1px solid #E4E1D8; border-radius: 12px; padding: 2rem; box-shadow: 0 1px 2px rgba(20,21,26,0.04); }}
  .success {{ background: #f5f5f3; border: 1px solid #E4E1D8; border-radius: 8px; padding: 1.5rem; text-align: center; font-size: 1.1rem; color: #14151A; }}
</style>
</head>
<body>
<div class="container">
  <div class="success">
    <p><strong>Safety profile saved.</strong></p>
    <p style="margin-top:0.5rem;color:#5B5F68;">You can now return to the app and request your program.</p>
  </div>
</div>
</body>
</html>
"""


@router.get("/supplemental/{user_id}", response_class=HTMLResponse)
async def supplemental_form(user_id: str):
    return HTMLResponse(FORM_HTML)


@router.post("/supplemental/{user_id}", response_class=HTMLResponse)
async def supplemental_submit(
    user_id: str,
    mental_health_concern: str = Form(...),
    known_deficiencies: str = Form(""),
    deficiency_confirmed: str = Form("no"),
    deficiency_status: str = Form("current"),
    injuries: str = Form(""),
    ED1: str = Form(...),
    ED2: str = Form(...),
    ED3: str = Form(...),
    ED4: str = Form(...),
):
    def _split_csv(text: str) -> list[str]:
        return [item.strip() for item in text.split(",") if item.strip()]

    data = {
        "user_id": user_id,
        "mental_health_concern": mental_health_concern,
        "known_deficiencies": _split_csv(known_deficiencies),
        "deficiency_confirmed": deficiency_confirmed == "yes",
        "deficiency_status": deficiency_status,
        "injuries": _split_csv(injuries),
        "ED1": ED1,
        "ED2": ED2,
        "ED3": ED3,
        "ED4": ED4,
    }
    save_supplemental(user_id, data)
    return HTMLResponse(SUCCESS_HTML)
