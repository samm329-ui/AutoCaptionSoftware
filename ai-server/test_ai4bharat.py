# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Test ai4bharat transliteration
from ai4bharat.transliteration import XlitEngine

# Create engine for Hindi
engine = XlitEngine("hi")

# Test: convert Roman to Devanagari
test_roman = "char business"
result = engine.translit_sentence(test_roman)
print(f"Roman: {test_roman}")
print(f"Devanagari: {result}")

# Test more
test2 = "phir bhi ek"
result2 = engine.translit_sentence(test2)
print(f"\nRoman: {test2}")
print(f"Devanagari: {result2}")
