"""
Translation Engine
Hindi - English translation using basic mapping (fallback when Google Translate is unavailable)
"""

from typing import Optional, Dict, Any


class TranslationEngine:
    def __init__(self):
        self.translator = None
        self.translation_dict = self._load_basic_dict()
        print("Translation Engine initialized")
    
    def _load_basic_dict(self) -> Dict[str, str]:
        return {
            "चार": "four", "बिजनेस": "business", "फिर": "then", "भी": "also",
            "एक": "one", "और": "and", "है": "is", "नहीं": "not",
            "क्या": "what", "कैसे": "how", "कहाँ": "where", "कब": "when",
            "क्यों": "why", "कौन": "who", "हाँ": "yes",
            "हैं": "are", "था": "was", "थी": "was", "थे": "were",
            "करना": "to do", "करता": "does", "करती": "does", "करते": "do",
            "होना": "to be", "जाना": "to go", "आना": "to come", "देना": "to give",
            "लेना": "to take", "कहना": "to say", "बोलना": "to speak",
            "बहुत": "very", "एकदम": "exactly", "बिल्कुल": "absolutely",
            "काफी": "enough", "ज्यादा": "more", "कम": "less",
            "या": "or", "पर": "on", "लेकिन": "but", "तो": "then",
            "अगर": "if", "क्योंकि": "because", "इसलिए": "therefore",
            "अच्छा": "good", "बुरा": "bad", "बड़ा": "big", "छोटा": "small",
            "नया": "new", "पुराना": "old", "सही": "correct", "गलत": "wrong",
            "मैं": "I", "तुम": "you", "आप": "you", "हम": "we", "वो": "that",
            "यह": "this", "मेरा": "my", "तुम्हारा": "your", "हमारा": "our",
            "अपना": "own", "किसी": "some", "कोई": "any", "कुछ": "some",
            "आज": "today", "कल": "tomorrow", "अभी": "now", "यहाँ": "here",
        }
    
    def translate(
        self,
        text: str,
        source_lang: str = "hi",
        target_lang: str = "en"
    ) -> str:
        if not text:
            return text
        
        if source_lang != "hi" or target_lang != "en":
            return text
        
        words = text.split()
        translated = []
        
        for word in words:
            clean_word = word.strip(".,!?;।")
            if clean_word in self.translation_dict:
                translated_word = self.translation_dict[clean_word]
            else:
                translated_word = clean_word
            translated.append(translated_word)
        
        return " ".join(translated)
    
    def detect_language(self, text: str) -> Optional[str]:
        if not text:
            return None
        
        devanagari_count = sum(1 for char in text if '\u0900' <= char <= '\u097F')
        
        if devanagari_count > len(text) * 0.3:
            return "hi"
        
        return "en"
    
    def batch_translate(
        self,
        texts: list,
        source_lang: str = "hi",
        target_lang: str = "en"
    ) -> list:
        if not texts:
            return []
        
        return [self.translate(text, source_lang, target_lang) for text in texts]
