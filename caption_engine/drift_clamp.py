from .config import DRIFT_MIN_GAP
from typing import List, Dict, Any

def clamp_alignment_drift(words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Enforces a minimum gap between consecutive words to prevent visual overlaps
    in the renderer. WhisperX sometimes produces overlapping timestamps.
    """
    if not words:
        return words
        
    clamped_words = [words[0].copy()]
    
    for i in range(1, len(words)):
        current_word = words[i].copy()
        prev_word = clamped_words[i-1]
        
        # Ensure we have start and end keys
        if 'start' in current_word and 'end' in prev_word:
            if current_word['start'] < prev_word['end'] + DRIFT_MIN_GAP:
                # Shift start forward
                current_word['start'] = prev_word['end'] + DRIFT_MIN_GAP
                
                # If start pushed past end, adjust end too
                if 'end' in current_word and current_word['start'] >= current_word['end']:
                    current_word['end'] = current_word['start'] + 0.1  # Arbitrary small duration
                    
        clamped_words.append(current_word)
        
    return clamped_words
