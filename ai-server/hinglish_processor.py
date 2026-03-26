"""
Hinglish Intelligence Processor
Converts Hindi/Urdu/Arabic to natural Hinglish
Detects emphasis words for styling
"""

import re
from typing import List, Dict, Any

try:
    from indic_transliteration import sanscript
    from indic_transliteration.sanscript import transliterate
    TRANSLITERATION_AVAILABLE = True
except ImportError:
    TRANSLITERATION_AVAILABLE = False
    print("indic-transliteration not installed. Install with: pip install indic-transliteration")


class HinglishProcessor:
    def __init__(self):
        self.common_hinglish = {
            "नहीं": "nahi", "हाँ": "haan", "क्या": "kya", "कैसे": "kaise",
            "कहाँ": "kahan", "क्यों": "kyun", "कब": "kab", "कौन": "kaun",
            "है": "hai", "हैं": "hain", "था": "tha", "थी": "thi", "थे": "the",
            "होगा": "hoga", "होगी": "hogi", "होंगे": "honge",
            "करना": "karna", "करता": "karta", "करती": "karti", "करते": "karte",
            "होना": "hona", "जाना": "jaana", "आना": "aana", "देना": "dena",
            "लेना": "lena", "कहना": "kehna", "बोलना": "bolna",
            "बहुत": "bahut", "एकदम": "ekdam", "बिल्कुल": "bilkul",
            "काफी": "kaafi", "ज्यादा": "zyada", "कम": "kam", "थोड़ा": "thoda",
            "और": "aur", "या": "ya", "पर": "par", "लेकिन": "lekin",
            "फिर": "phir", "तो": "toh", "अगर": "agar", "क्योंकि": "kyunki",
            "इसलिए": "isliye", "तभी": "tabhi", "जब": "jab", "तब": "tab",
            "अच्छा": "achha", "बुरा": "bura", "बड़ा": "bada", "छोटा": "chhota",
            "नया": "naya", "पुराना": "purana", "सही": "sahi", "गलत": "galat",
            "मैं": "main", "तुम": "tum", "आप": "aap", "हम": "hum", "वो": "wo",
            "यह": "yeh", "वह": "woh", "ये": "ye", "वे": "we",
            "मेरा": "mera", "तुम्हारा": "tumhara", "हमारा": "hamara",
            "अपना": "apna", "किसी": "kisi", "कोई": "koi", "कुछ": "kuch",
            "आज": "aaj", "कल": "kal", "परसों": "parso", "अभी": "abhi",
            "यहाँ": "yahan", "वहाँ": "wahan", "जहाँ": "jahan",
            "बिजनेस": "business", "मार्जिन": "margin", "नंबर": "number",
            "सेल्स": "sales", "प्राइस": "price", "प्रॉफिट": "profit",
            "बजट": "budget", "स्ट्रैटेजी": "strategy",
        }
        
        self.emphasis_patterns = [
            (r'\b(nahi|never|no|not|mat|bilkul\s+nahi)\b', 'negation'),
            (r'\b(bahut|very|really|ekdam|bilkul|kaafi|zyada)\b', 'intensifier'),
            (r'\b\d+\b', 'number'),
            (r'\b(rupees?|rs\.?|₹|dollars?|percent|%)\b', 'money'),
            (r'\b(kya|kaise|kab|kahan|kyun|kaun|what|why|how|when|where)\b', 'question'),
            (r'\b(kyunki|because|isliye|so|lekin|but|phir|then)\b', 'connector'),
            (r'\b[A-Z]{2,}\b', 'acronym'),
            (r'\b(business|margin|profit|sales|strategy|market|customer|revenue)\b', 'business'),
        ]
        
        print("Hinglish Processor initialized")
    
    def convert_to_hinglish(self, text: str, style: str = "natural") -> str:
        if not text:
            return text
        
        # Check if text is already in Roman script (already Hinglish/English)
        if self._is_roman(text):
            return text
        
        # Check if text has Devanagari (Hindi)
        if self._has_devanagari(text):
            return self._convert_devanagari_to_hinglish(text)
        
        # Check if text has Arabic script (Urdu)
        if self._has_arabic(text):
            return self._convert_urdu_to_hinglish(text)
        
        # If no recognized script, return as-is
        return text
    
    def _is_roman(self, text: str) -> bool:
        """Check if text is already in Roman script (Hinglish/English)"""
        latin_count = sum(1 for char in text if char.isalpha() and ord(char) < 128)
        total_alpha = sum(1 for char in text if char.isalpha())
        if total_alpha > 0:
            return latin_count / total_alpha > 0.8
        return False
    
    def _has_devanagari(self, text: str) -> bool:
        """Check if text has Devanagari characters"""
        devanagari_range = range(0x0900, 0x097F)
        return any(ord(char) in devanagari_range for char in text)
    
    def _has_arabic(self, text: str) -> bool:
        """Check if text has Arabic/Urdu characters"""
        arabic_range = range(0x0600, 0x06FF)
        return any(ord(char) in arabic_range for char in text)
    
    def _convert_devanagari_to_hinglish(self, text: str) -> str:
        """Convert Devanagari (Hindi) to Hinglish"""
        words = text.split()
        hinglish_words = []
        
        for word in words:
            clean_word = re.sub(r'[^\w\s]', '', word)
            
            if clean_word in self.common_hinglish:
                hinglish_word = self.common_hinglish[clean_word]
            elif re.search('[a-zA-Z]', word):
                hinglish_word = word
            else:
                if TRANSLITERATION_AVAILABLE:
                    try:
                        hinglish_word = transliterate(
                            clean_word,
                            sanscript.DEVANAGARI,
                            sanscript.ITRANS
                        )
                    except:
                        hinglish_word = self._basic_transliteration(clean_word)
                else:
                    hinglish_word = self._basic_transliteration(clean_word)
            
            if word != clean_word:
                punct = re.findall(r'[^\w\s]', word)
                hinglish_word = hinglish_word + ''.join(punct)
            
            hinglish_words.append(hinglish_word)
        
        return " ".join(hinglish_words)
    
    def _convert_urdu_to_hinglish(self, text: str) -> str:
        """Convert Urdu/Arabic script to Hinglish"""
        words = text.split()
        hinglish_words = []
        
        for word in words:
            clean_word = re.sub(r'[^\w\s]', '', word)
            
            if clean_word in self.common_hinglish:
                hinglish_word = self.common_hinglish[clean_word]
            elif re.search('[a-zA-Z]', word):
                hinglish_word = word
            else:
                # First try to transliterate Arabic to Devanagari, then to Hinglish
                if TRANSLITERATION_AVAILABLE:
                    try:
                        devanagari = transliterate(clean_word, sanscript.ARABIC, sanscript.DEVANAGARI)
                        hinglish_word = transliterate(devanagari, sanscript.DEVANAGARI, sanscript.ITRANS)
                    except:
                        hinglish_word = self._urdu_basic_transliteration(clean_word)
                else:
                    hinglish_word = self._urdu_basic_transliteration(clean_word)
            
            if word != clean_word:
                punct = re.findall(r'[^\w\s]', word)
                hinglish_word = hinglish_word + ''.join(punct)
            
            hinglish_words.append(hinglish_word)
        
        return " ".join(hinglish_words)
    
    def _urdu_basic_transliteration(self, word: str) -> str:
        """Basic Urdu to Hinglish transliteration"""
        urdu_to_hinglish = {
            'ی': 'y', 'ک': 'k', 'و': 'w', 'ف': 'f', 'غ': 'gh',
            'ع': 'a', 'ق': 'q', 'ص': 's', 'ث': 's', 'ش': 'sh',
            'س': 's', 'ن': 'n', 'م': 'm', 'ل': 'l', 'ک': 'k',
            'ج': 'j', 'چ': 'ch', 'خ': 'kh', 'ح': 'h', 'د': 'd',
            'ذ': 'z', 'ر': 'r', 'ز': 'z', 'ژ': 'zh', 'ط': 't',
            'ظ': 'z', 'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ک': 'k',
            'گ': 'g', 'ڈ': 'd', 'پ': 'p', 'ب': 'b', 'ت': 't',
            'ا': 'a', 'آ': 'aa', 'ؤ': 'o', 'ئ': 'i', 'ء': 'a',
            'ے': 'e', 'ی': 'i', 'و': 'o', 'ہ': 'h', 'ھ': 'h',
            'ۃ': 'h', 'ة': 'h', 'ظ': 'z', 'ض': 'z',
        }
        
        result = []
        for char in word:
            result.append(urdu_to_hinglish.get(char, char))
        
        return ''.join(result)
    
    def detect_emphasis_words(self, text: str) -> List[Dict[str, Any]]:
        emphasized = []
        text_lower = text.lower()
        
        for pattern, emphasis_type in self.emphasis_patterns:
            matches = re.finditer(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                emphasized.append({
                    "word": text[match.start():match.end()],
                    "start": match.start(),
                    "end": match.end(),
                    "type": emphasis_type
                })
        
        return emphasized
    
    def should_be_bold(self, word: str) -> bool:
        word_lower = word.lower().strip()
        
        if word_lower in ["nahi", "never", "no", "not", "mat"]:
            return True
        
        if word_lower in ["bahut", "very", "really", "ekdam", "bilkul"]:
            return True
        
        if re.match(r'\d+', word):
            return True
        
        if re.match(r'^[A-Z]{2,}$', word):
            return True
        
        return False
    
    def _basic_transliteration(self, word: str) -> str:
        char_map = {
            'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
            'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
            'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
            'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
            'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
            'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va',
            'श': 'sha', 'ष': 'sha', 'स': 'sa', 'ह': 'ha',
            'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
            'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au',
            'ं': 'n', 'ः': 'h', '्': '',
            'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
            'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
        }
        
        result = []
        for char in word:
            result.append(char_map.get(char, char))
        
        return ''.join(result)
    
    def get_language_mix_ratio(self, text: str) -> Dict[str, float]:
        words = text.split()
        english_count = 0
        hindi_count = 0
        
        for word in words:
            if self._has_devanagari(word):
                hindi_count += 1
            elif self._has_arabic(word):
                hindi_count += 1
            elif re.match(r'^[a-zA-Z]+$', word):
                english_count += 1
        
        total = max(english_count + hindi_count, 1)
        
        return {
            "english": english_count / total,
            "hindi": hindi_count / total
        }
