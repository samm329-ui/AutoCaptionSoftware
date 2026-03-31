import whisperx
import logging
import torch
import librosa

try:
    from .retry import with_retry
    from .config import RETRY_ALIGN
    from .alignment_models import get_alignment_model
except ImportError:
    # Handle circular imports or relative imports nicely
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from retry import with_retry
    from config import RETRY_ALIGN
    from alignment_models import get_alignment_model

logger = logging.getLogger(__name__)

# Only load heavy models onto device if they're actually requested
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

@with_retry(max_retries=RETRY_ALIGN)
def align_text(tokens: list, audio_path: str, model_id: str):
    """
    Uses WhisperX for forced word-level alignment.
    Falls back gracefully if alignment fails.
    """
    try:
        # Get model directly
        model, metadata = get_alignment_model(model_id, DEVICE)
        
        # Get audio duration for distributing segment timestamps
        duration = librosa.get_duration(filename=audio_path)
        
        # Format tokens as whisperX expects - each segment needs start, end, text
        n = len(tokens)
        if n == 0:
            return []
        
        prompt_segments = []
        if isinstance(tokens[0], dict):
            # Pre-computed bounds derived directly from audio chunk times!
            for t in tokens:
                prompt_segments.append({
                    "text": t["text"],
                    "start": round(t["start"], 3),
                    "end": round(t["end"], 3)
                })
        else:
            seg_duration = duration / n
            for i, t in enumerate(tokens):
                prompt_segments.append({
                    "text": t,
                    "start": round(i * seg_duration, 3),
                    "end": round(min((i + 1) * seg_duration, duration), 3),
                })
        
        # Load audio for whisperx
        audio = whisperx.load_audio(audio_path)
        
        result = whisperx.align(
            prompt_segments, 
            model, 
            metadata, 
            audio, 
            DEVICE
        )
        return result["segments"]
    except Exception as e:
        logger.error(f"Alignment failed for {audio_path} with {model_id}: {e}")
        raise

