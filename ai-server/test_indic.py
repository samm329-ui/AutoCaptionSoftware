# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from indic_transliteration.sanscript import transliterate, HK, DEVANAGARI, IAST

# Try different schemes with proper Devanagari input
test_text_dev = "चार बिजनेस"
test_text_itraits = "cAra bijanesa"

print(f"Devanagari to HK: {transliterate(test_text_dev, DEVANAGARI, HK)}")
print(f"Devanagari to IAST: {transliterate(test_text_dev, DEVANAGARI, IAST)}")

# Try with HK input 
print(f"HK to Devanagari: {transliterate(test_text_itraits, HK, DEVANAGARI)}")
