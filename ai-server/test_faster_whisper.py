# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Test with faster-whisper directly (which whisperx uses)
from faster_whisper import WhisperModel

# Load base model
print("Loading faster-whisper model...")
model = WhisperModel("base", device="cpu", compute_type="int8")

# Test transcribe with Hinglish-like audio
# Since we can't test with actual audio, let's check what languages are supported
print("\nSupported languages in faster-whisper:")
info = model.config
print(f"Language: {info.get('language', 'N/A')}")
print(f"Language tokens: {info.get('lang_to_token', {}).keys() if hasattr(info, 'get') else 'N/A'}")
