with open('website/worker/src/index.js', 'r', encoding='utf-8') as f:
    text = f.read()

bad = r"""  const url = /rest/v1/;
  const headers = {
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': Bearer ,"""

good = """  const url = ${env.SUPABASE_URL}/rest/v1/;
  const headers = {
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': Bearer ,"""

text = text.replace(bad, good)

# Fix the telegram_links query too
text = text.replace(
    '${env.SUPABASE_URL}/rest/v1/user_profiles?id=eq.&select=intake,updated_at',
    '${env.SUPABASE_URL}/rest/v1/user_profiles?id=eq.&select=intake,updated_at'
)

# Fix session load query
text = text.replace(
    "\n      workout_sessions?user_id=eq.&session_date=gte.&select=session_date,log,load_history&order=session_date.desc\n    );",
    "\n      workout_sessions?user_id=eq.&session_date=gte.&select=session_date,log,load_history&order=session_date.desc\n    );"
)

# Fix bearer in AI coach too 
text = text.replace(
    "'Authorization': Bearer ",
    "'Authorization': Bearer "
)

with open('website/worker/src/index.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Fixed template literals')
print('Verify sbFetch:', 'Bearer ' in text)
