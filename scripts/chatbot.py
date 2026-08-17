import os, requests
from mos_bot.config import LM_STUDIO_URL, LLM_API_KEY, LLM_API_URL, LLM_MODEL

USE_MOCK = os.getenv("USE_MOCK_LLM", "").lower() in ("1", "true", "yes")
MOCK_RESPONSE = os.getenv(
    "MOCK_LLM_RESPONSE",
    "This is a mock AI response from Muscle OS. In mock mode, no real LLM was called. "
    "The system prompt and user message were assembled correctly."
)

LMSTUDIO_MODEL = ""


def _build_headers() -> dict:
    headers = {"Content-Type": "application/json"}
    if LLM_API_KEY:
        headers["Authorization"] = f"Bearer {LLM_API_KEY}"
    return headers


def _build_url() -> str:
    if LLM_API_URL:
        return f"{LLM_API_URL.rstrip('/')}/chat/completions"
    return f"{LM_STUDIO_URL}/v1/chat/completions"


def _build_model() -> str:
    if LLM_MODEL:
        return LLM_MODEL
    if LMSTUDIO_MODEL:
        return LMSTUDIO_MODEL
    return "gemma-4-e4b-it"


def check_server() -> bool:
    try:
        r = requests.get(f"{LM_STUDIO_URL}/v1/models", timeout=3)
        r.raise_for_status()
        data = r.json()
        models = data.get("data", [])
        if models:
            global LMSTUDIO_MODEL
            LMSTUDIO_MODEL = models[0].get("id", models[0] if isinstance(models[0], str) else "")
        return True
    except Exception:
        import traceback
        print(f"[LLM] server check failed: {traceback.format_exc()}")
        return False


def _mock_chat(messages: list) -> str:
    import json
    print("\n[MOCK LLM] === ASSEMBLED MESSAGES ===")
    roles_seen = set()
    for i, m in enumerate(messages):
        role = m.get("role", "?")
        content = m.get("content", "")
        if len(content) > 300:
            print(f"[MOCK LLM]  [{i}] {role}: {content[:300]}... ({len(content)} chars)")
        else:
            print(f"[MOCK LLM]  [{i}] {role}: {content}")
        roles_seen.add(role)
    print(f"[MOCK LLM]  Roles present: {roles_seen}")
    print(f"[MOCK LLM] === END MESSAGES ===\n")
    return MOCK_RESPONSE


async def chat_completion(messages: list, model: str = "", temperature: float = 0.4, max_tokens: int = 1024) -> str:
    if USE_MOCK:
        return _mock_chat(messages)

    url = _build_url()
    headers = _build_headers()
    use_model = model or _build_model()

    payload = {
        "model": use_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }

    timeout = 120 if LLM_API_URL else 600

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]
    except Exception:
        import traceback
        print(f"[LLM] chat_completion failed: {traceback.format_exc()}")
        return None


def chat_completion_stream(messages: list, model: str = "", temperature: float = 0.4, max_tokens: int = 1024):
    if USE_MOCK:
        mock_text = _mock_chat(messages)
        for char in mock_text:
            yield char
        return

    url = _build_url()
    headers = _build_headers()
    use_model = model or _build_model()

    payload = {
        "model": use_model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": True,
    }

    timeout = 120 if LLM_API_URL else 600

    try:
        resp = requests.post(url, json=payload, headers=headers, stream=True, timeout=timeout)
        resp.raise_for_status()
        for line in resp.iter_lines():
            if line:
                line = line.decode("utf-8").strip()
                if line.startswith("data: "):
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        break
                    import json
                    try:
                        chunk = json.loads(data_str)
                        delta = chunk["choices"][0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError, IndexError):
                        pass
    except Exception:
        import traceback
        print(f"[LLM] chat_completion_stream failed: {traceback.format_exc()}")
        yield None
