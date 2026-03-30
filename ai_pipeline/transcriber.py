import os
from groq import Groq
from .retry import with_retry
from .config import RETRY_GROQ

@with_retry(max_retries=RETRY_GROQ)
def transcribe_chunk_with_retry(audio_path: str) -> str:
    """Uses Groq Whisper API (large-v3) to transcribe audio."""
    api_key = os.environ.get("GROQ_API_KEY", "dummy")
    client = Groq(api_key=api_key)
    with open(audio_path, "rb") as file:
        transcription = client.audio.transcriptions.create(
            file=(audio_path, file.read()),
            model="whisper-large-v3",
            response_format="text",
        )
    return transcription.strip()
