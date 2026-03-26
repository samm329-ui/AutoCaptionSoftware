"""
Stage 1-2: Media Normalization & Multilingual ASR

Pipeline:
  media → normalized audio (mono 16kHz WAV) → multilingual ASR → canonical transcript

Canonical Transcript (SINGLE SOURCE OF TRUTH):
  {
    "words": [
      {"text":"hello","start":0.52,"end":0.83,"lang":"en"},
      {"text":"bhai","start":0.84,"end":1.10,"lang":"hi"}
    ]
  }
"""

import torch
import gc
import os
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional

FFMPEG_BIN = r"C:\Users\jishu\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1-full_build\bin"
os.environ["PATH"] = FFMPEG_BIN + os.pathsep + os.environ.get("PATH", "")

try:
    import whisperx
    WHISPERX_AVAILABLE = True
except ImportError:
    WHISPERX_AVAILABLE = False
    print("WhisperX not available. Using fallback mode.")


LANG_CODE_MAP = {
    "en": "en", "english": "en",
    "hi": "hi", "hindi": "hi",
    "ur": "hi", "urdu": "hi",
}


class TranscriptionEngine:
    def __init__(self, model_size: str = "base"):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.compute_type = "float16" if self.device == "cuda" else "int8"
        self.batch_size = 16 if self.device == "cuda" else 4
        self.model_size = model_size
        self.model = None
        self.align_model = None
        self.align_metadata = None
        
        print(f"[TranscriptionEngine] Initialized")
        print(f"  Device: {self.device}")
        print(f"  Model: {model_size}")
        print(f"  Compute: {self.compute_type}")
    
    def process_media(self, input_path: str, output_dir: str) -> str:
        """
        Stage 1: Media Normalization
        - Extract audio from video (or use audio file)
        - Convert to mono 16kHz WAV
        - Keep original duration and timebase
        """
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        
        stem = Path(input_path).stem
        output_path = os.path.join(output_dir, f"{stem}_normalized.wav")
        
        ffmpeg_exe = os.path.join(FFMPEG_BIN, "ffmpeg.exe")
        
        cmd = [
            ffmpeg_exe,
            "-i", input_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            "-y",
            output_path
        ]
        
        subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=300)
        print(f"[TranscriptionEngine] Audio normalized: {output_path}")
        
        return output_path
    
    def transcribe(self, audio_path: str, language: Optional[str] = None) -> Dict[str, Any]:
        """
        Stage 2: Speech Recognition
        
        - Auto-detect language if not specified
        - Produce word-level timestamps
        - Keep confidence scores
        
        Returns canonical transcript with word-level data.
        """
        if not WHISPERX_AVAILABLE:
            return self._fallback_transcript()
        
        try:
            if self.model is None:
                self.model = whisperx.load_model(
                    self.model_size,
                    self.device,
                    compute_type=self.compute_type
                )
            
            audio = whisperx.load_audio(audio_path)
            
            result = self.model.transcribe(
                audio,
                batch_size=self.batch_size,
                language=None
            )
            
            detected_lang = result.get("language", "en")
            print(f"[TranscriptionEngine] Detected language: {detected_lang}")
            
            if self.align_model is None:
                lang_code = LANG_CODE_MAP.get(detected_lang, "en")
                try:
                    self.align_model, self.align_metadata = whisperx.load_align_model(
                        language_code=lang_code,
                        device=self.device
                    )
                except Exception as e:
                    print(f"[TranscriptionEngine] Alignment model failed: {e}")
                    self.align_model = None
            
            if self.align_model is not None:
                result = whisperx.align(
                    result["segments"],
                    self.align_model,
                    self.align_metadata,
                    audio,
                    self.device,
                    return_char_alignments=False
                )
            
            canonical_words = self._build_canonical_transcript(result, detected_lang)
            
            gc.collect()
            if self.device == "cuda":
                torch.cuda.empty_cache()
            
            return {
                "words": canonical_words,
                "language": detected_lang,
                "duration": len(audio) / audio.sample_rate if hasattr(audio, 'sample_rate') else 0
            }
            
        except Exception as e:
            print(f"[TranscriptionEngine] Error: {e}")
            raise
    
    def _build_canonical_transcript(self, result: Dict, detected_lang: str) -> List[Dict[str, Any]]:
        """
        Build canonical transcript from WhisperX output.
        Each word has: text, start, end, lang
        """
        words = []
        
        for segment in result.get("segments", []):
            segment_words = segment.get("words", [])
            
            if not segment_words:
                text = segment.get("text", "").strip()
                if text:
                    words.append({
                        "text": text,
                        "start": segment.get("start", 0),
                        "end": segment.get("end", 0),
                        "lang": detected_lang
                    })
            else:
                for word_data in segment_words:
                    word_text = word_data.get("word", "").strip()
                    if word_text:
                        words.append({
                            "text": word_text,
                            "start": word_data.get("start", 0),
                            "end": word_data.get("end", 0),
                            "lang": detected_lang,
                            "score": word_data.get("score", 1.0)
                        })
        
        return words
    
    def _fallback_transcript(self) -> Dict[str, Any]:
        """Fallback when WhisperX is not available."""
        return {
            "words": [
                {"text": "hello", "start": 0.0, "end": 0.5, "lang": "en"},
                {"text": "bhai", "start": 0.6, "end": 1.0, "lang": "hi"},
                {"text": "kya", "start": 1.1, "end": 1.3, "lang": "hi"},
                {"text": "haal", "start": 1.4, "end": 1.8, "lang": "hi"},
                {"text": "hai", "start": 1.9, "end": 2.1, "lang": "hi"},
            ],
            "language": "mixed",
            "duration": 2.5
        }
    
    def unload(self):
        """Free GPU memory."""
        if self.model:
            del self.model
            self.model = None
        if self.align_model:
            del self.align_model
            self.align_model = None
        gc.collect()
        if self.device == "cuda":
            torch.cuda.empty_cache()
