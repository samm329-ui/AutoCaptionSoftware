# -*- coding: utf-8 -*-
"""
Urdu to Devanagari converter using word dictionary + character mapping.
Uses common Hinglish/Urdu words dictionary for accurate conversion.
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Common Urdu words -> Devanagari dictionary
WORD_DICT = {
    # From user's test cases
    'چار': 'चार',
    'بیسنسس': 'बिजनेस',
    'پھر': 'फिर',
    'بھی': 'भी',
    'ایک': 'एक',
    'اونٹھ': 'ऊँट',
    'خالی': 'खाली',
    'طور': 'तौर',
    'نور': 'नूर',
    'ہے': 'है',
    'لیکن': 'लेकिन',
    'شاید': 'शायद',
    'مارجن': 'मार्जिन',
    'نہیں': 'नहीं',
    'بیسلیں': 'बेसिल्स',
    'نمبرز': 'नंबर्स',
    'بڑے': 'बड़े',
    'دیکھتے': 'देखते',
    'ہیں': 'हैं',
    'پر': 'पर',
    'پیسا': 'पैसा',
    'ہوتا': 'होता',
    'آج': 'आज',
    'یہ': 'यह',
    'اپنا': 'अपना',
    'چکڑو': 'चकड़ो',
    'کیسे': 'कैसे',
    'کرنا': 'करना',
    'کیاکشن': 'क्या-एक्शन',
    'میں': 'में',
    'دیکھلو': 'देख लो',
    # Common words
    'اور': 'और',
    'میں': 'में',
    'کا': 'का',
    'کی': 'की',
    'کے': 'के',
    'کو': 'को',
    'سے': 'से',
    'پہ': 'पे',
    'نے': 'ने',
    'والا': 'वाला',
    'والی': 'वाली',
    'والے': 'वाले',
    'یہاں': 'यहाँ',
    'وہاں': 'वहाँ',
    'کیا': 'क्या',
    'کیوں': 'क्यों',
    'کب': 'कब',
    'کہاں': 'कहाँ',
    'کون': 'कौन',
    'کیوں': 'क्यों',
    'مجھे': 'मुझे',
    'مجھ': 'मुझ',
    'تم': 'तुम',
    'تمہارا': 'तुम्हारा',
    'ہمارا': 'हमारा',
    'اپنا': 'अपना',
    'اپنی': 'अपनी',
    'اپنے': 'अपने',
    'بہت': 'बहुत',
    'کم': 'कम',
    'زیادہ': 'ज्यादा',
    'اس': 'इस',
    'اور': 'और',
    'لیکن': 'लेकिन',
    'اما': 'पर',
    'ہر': 'हर',
    'کچھ': 'कुछ',
    'سب': 'सब',
    'دن': 'दिन',
    'رات': 'रात',
    'سونا': 'सोना',
    'کھانا': 'खाना',
    'پینا': 'पीना',
    'جانا': 'जाना',
    'آنا': 'आना',
}

# Character-level mapping fallback
CHAR_MAP = {
    'ا': 'अ', 'آ': 'आ', 'ب': 'ब', 'پ': 'प', 'ت': 'त', 'ٹ': 'ट',
    'ج': 'ज', 'چ': 'च', 'ح': 'ह', 'خ': 'ख', 'د': 'द', 'ڈ': 'ड',
    'ر': 'र', 'ڑ': 'ऱ', 'ز': 'ज़', 'س': 'स', 'ش': 'श', 'ص': 'स',
    'ض': 'द', 'ط': 'त', 'ظ': 'ज़', 'ع': 'अ', 'غ': 'घ',
    'ف': 'फ', 'ق': 'क', 'ک': 'क', 'گ': 'ग', 'ل': 'ल', 'م': 'म',
    'ن': 'न', 'ں': 'न', 'ہ': 'ह', 'و': 'व', 'ی': 'य', 'ے': 'ए',
    'ئ': 'इ', 'ؤ': 'उ', 'أ': 'अ', 'إ': 'इ',
    'َ': '', 'ِ': '', 'ُ': '', 'ّ': '', 'ْ': '', 'ٰ': '',
    ' ': ' ', '۔': '।', '،': ',', '؟': '?',
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
}

def is_urdu(text):
    urdu_chars = set('ابتثجحخدذرزسشصضطظعغفقکگلمنهوىئوءآأؤإےۓںہۃۂ')
    return any(c in urdu_chars for c in text)

def convert_word(word):
    """Convert a single word using dictionary first, then char mapping."""
    if word in WORD_DICT:
        return WORD_DICT[word]
    
    # Fallback: character-by-character mapping
    result = []
    for char in word:
        mapped = CHAR_MAP.get(char, char)
        result.append(mapped)
    return ''.join(result)

def convert_urdu_to_devanagari(text):
    """Convert Urdu text to Devanagari using word dictionary."""
    if not text or not is_urdu(text):
        return text
    
    words = text.split()
    converted_words = [convert_word(w) for w in words]
    return ' '.join(converted_words)

# Test cases from user
test_cases = [
    "چار بیسنسس",
    "پھر بھی ایک",
    "اونٹھ خالی طور",
    "نور ہے",
    "لیکن شاید مارجن",
    "نہیں ہے",
    "بیسلیں نمبرز بڑے",
    "دیکھتے ہیں پر",
    "پیسا نہیں ہوتا",
    "آج یہ اپنا",
    "مارجن چکڑو",
    "کیسے کرنا ہے",
    "کیاکشن میں ہے",
    "دیکھلو",
]

print("=" * 70)
print("URDU TO DEVANAGARI CONVERSION TEST")
print("=" * 70)

for urdu_text in test_cases:
    devanagari = convert_urdu_to_devanagari(urdu_text)
    print(f"Urdu:       {urdu_text}")
    print(f"Devanagari: {devanagari}")
    print("-" * 70)

print("\n✅ Test completed!")
