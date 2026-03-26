"""
Stage 5: Language Transforms (Display Only)

Hinglish is DISPLAY TEXT, not translated language.

Rules:
  - "मैं ठीक हूँ" → main theek hoon
  - "Call me tomorrow" → call me tomorrow
  - "मैं call करूँगा" → main call karunga

Mixed-script awareness, NOT blind transliteration.
No Arabic → Devanagari → ITRANS chain.
No Urdu conversion path.
"""

import re
from typing import List, Dict, Any


class HinglishProcessor:
    def __init__(self):
        self.devanagari_range = range(0x0900, 0x097F)
        self.roman_range = range(0x0041, 0x007A)
        
        self.common_hinglish = {
            "नहीं": "nahi", "नही": "nahi",
            "हाँ": "haan", "हा": "haan",
            "क्या": "kya",
            "कैसे": "kaise",
            "कहाँ": "kahan", "कहा": "kahan",
            "क्यों": "kyun", "क्यूं": "kyun",
            "कब": "kab",
            "कौन": "kaun",
            "है": "hai",
            "हैं": "hain",
            "था": "tha",
            "थी": "thi",
            "थे": "the",
            "होगा": "hoga",
            "होगी": "hogi",
            "होंगे": "honge",
            "करना": "karna",
            "करता": "karta",
            "करती": "karti",
            "करते": "karte",
            "होना": "hona",
            "जाना": "jaana",
            "आना": "aana",
            "देना": "dena",
            "लेना": "lena",
            "कहना": "kehna",
            "बोलना": "bolna",
            "बहुत": "bahut",
            "एकदम": "ekdam",
            "बिल्कुल": "bilkul",
            "काफी": "kaafi",
            "ज्यादा": "zyada",
            "कम": "kam",
            "थोड़ा": "thoda",
            "और": "aur",
            "या": "ya",
            "पर": "par",
            "लेकिन": "lekin",
            "तो": "toh",
            "अगर": "agar",
            "क्योंकि": "kyunki",
            "इसलिए": "isliye",
            "तभी": "tabhi",
            "जब": "jab",
            "तब": "tab",
            "अच्छा": "achha", "अच्छा": "achha",
            "बुरा": "bura",
            "बड़ा": "bada",
            "छोटा": "chhota",
            "नया": "naya",
            "पुराना": "purana",
            "सही": "sahi",
            "गलत": "galat",
            "मैं": "main",
            "तुम": "tum",
            "आप": "aap",
            "हम": "hum",
            "वो": "wo",
            "यह": "yeh",
            "वह": "woh",
            "ये": "ye",
            "वे": "we",
            "मेरा": "mera",
            "तुम्हारा": "tumhara",
            "हमारा": "hamara",
            "अपना": "apna",
            "किसी": "kisi",
            "कोई": "koi",
            "कुछ": "kuch",
            "आज": "aaj",
            "कल": "kal",
            "अभी": "abhi",
            "यहाँ": "yahan",
            "वहाँ": "wahan",
            "जहाँ": "jahan",
            "ठीक": "theek", "ठीक": "theek",
            "सुन": "sun", "सुनो": "suno",
            "बताओ": "batao", "बताना": "batana",
            "पता": "pata",
            "चलो": "chalo", "चल": "chal",
            "देखो": "dekho", "देखना": "dekhna",
            "समझ": "samajh", "समझो": "samjho",
            "रुको": "ruko", "रुकना": "rukna",
            "जरा": "jara",
            "बिल्कुल": "bilkul",
        }
        
        self.devanagari_to_roman = {
            'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'ng',
            'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
            'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n',
            'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
            'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm',
            'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
            'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
            'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
            'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
            'ं': 'n', 'ः': 'h', '्': '',
            'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
            'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
        }
        
        print("[HinglishProcessor] Initialized (display-only mode)")
    
    def process_text(self, text: str) -> str:
        """
        Process a single text.
        - Devanagari → roman
        - English → keep as-is
        - Mixed content → handle each part
        """
        if not text:
            return text
        
        if self._is_already_roman(text):
            return text
        
        if self._has_devanagari(text):
            return self._devanagari_to_display(text)
        
        return text
    
    def process_words(self, words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Process a list of words with timing.
        Returns words with display text added.
        """
        processed = []
        
        for word in words:
            original_text = word.get("text", "")
            display_text = self.process_text(original_text)
            
            new_word = word.copy()
            new_word["display"] = display_text
            processed.append(new_word)
        
        return processed
    
    def _is_already_roman(self, text: str) -> bool:
        """Check if text is already in Roman/Latin script."""
        alpha_chars = [c for c in text if c.isalpha()]
        if not alpha_chars:
            return False
        
        latin_count = sum(1 for c in alpha_chars if ord(c) < 128)
        return latin_count / len(alpha_chars) > 0.8
    
    def _has_devanagari(self, text: str) -> bool:
        """Check if text contains Devanagari characters."""
        return any(ord(c) in self.devanagari_range for c in text)
    
    def _devanagari_to_display(self, text: str) -> str:
        """
        Convert Devanagari to display Hinglish.
        Process word-by-word, keep English as-is.
        """
        result = []
        current_word = ""
        
        for char in text:
            if char.isspace():
                if current_word:
                    result.append(self._convert_word(current_word))
                    current_word = ""
                result.append(char)
            elif ord(char) in self.devanagari_range or char in "।?!,;:":
                current_word += char
            else:
                if current_word:
                    result.append(self._convert_word(current_word))
                    current_word = ""
                result.append(char)
        
        if current_word:
            result.append(self._convert_word(current_word))
        
        return "".join(result).strip()
    
    def _convert_word(self, word: str) -> str:
        """Convert a single Devanagari word to roman."""
        clean = re.sub(r'[^\w]', '', word)
        punct = re.findall(r'[^\w\s]', word)
        
        if clean.lower() in self.common_hinglish:
            converted = self.common_hinglish[clean.lower()]
        else:
            converted = self._transliterate_devanagari(clean)
        
        return converted + "".join(punct)
    
    def _transliterate_devanagari(self, word: str) -> str:
        """Transliterate a Devanagari word to roman using character mapping."""
        result = []
        
        i = 0
        while i < len(word):
            char = word[i]
            
            if char in self.devanagari_to_roman:
                result.append(self.devanagari_to_roman[char])
            else:
                result.append(char)
            
            i += 1
        
        joined = "".join(result)
        
        joined = re.sub(r'aa', 'aa', joined)
        joined = re.sub(r'ee', 'ee', joined)
        joined = re.sub(r'oo', 'oo', joined)
        joined = re.sub(r'ai', 'ai', joined)
        joined = re.sub(r'au', 'au', joined)
        
        return joined
    
    def format_for_display(self, text: str) -> str:
        """Format text for display with proper casing."""
        if not text:
            return text
        
        text = text.strip()
        
        words = text.split()
        formatted = []
        
        for word in words:
            if word.isupper() and len(word) > 2:
                formatted.append(word)
            elif word[0].isupper():
                formatted.append(word)
            else:
                formatted.append(word.lower())
        
        return " ".join(formatted)
    
    def detect_emphasis(self, text: str) -> List[Dict[str, Any]]:
        """Detect words that should be emphasized in display."""
        emphasis = []
        
        emphasis_patterns = [
            (r'\b(nahi|nahi|never|no|not|mat|bilkul\s+nahi)\b', 'negation'),
            (r'\b(bahut|very|really|ekdam|bilkul|kaafi|zyada)\b', 'intensifier'),
            (r'\b\d+\b', 'number'),
            (r'\b(rupees?|rs\.?|₹|dollars?|percent|%)\b', 'money'),
            (r'\b(kya|kaise|kab|kahan|kyun|kaun|what|why|how|when|where)\b', 'question'),
        ]
        
        text_lower = text.lower()
        for pattern, etype in emphasis_patterns:
            for match in re.finditer(pattern, text_lower, re.IGNORECASE):
                emphasis.append({
                    "word": text[match.start():match.end()],
                    "start": match.start(),
                    "end": match.end(),
                    "type": etype
                })
        
        return emphasis
