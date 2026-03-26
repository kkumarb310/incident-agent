import os
import anthropic
from tenacity import retry, wait_exponential, stop_after_attempt
from dotenv import load_dotenv

load_dotenv()

# Primary and fallback models
MODELS = {
    "primary": "claude-sonnet-4-5",
    "fallback": "claude-haiku-4-5-20251001"
}

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

@retry(
    wait=wait_exponential(min=1, max=10),  # wait 1s, 2s, 4s between retries
    stop=stop_after_attempt(3)              # give up after 3 attempts
)
def _call(prompt: str, system: str, model_key: str) -> str:
    response = client.messages.create(
        model=MODELS[model_key],
        max_tokens=1024,
        system=system,
        messages=[{"role": "user", "content": prompt}]
    )
    return response.content[0].text

def call_claude(prompt: str, system: str = "") -> dict:
    try:
        text = _call(prompt, system, "primary")
        return {"text": text, "model": MODELS["primary"]}
    except Exception as e:
        print(f"[Claude Client] Primary failed: {e} — trying fallback")
        text = _call(prompt, system, "fallback")
        return {"text": text, "model": MODELS["fallback"], "used_fallback": True}