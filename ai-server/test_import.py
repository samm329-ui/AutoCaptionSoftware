# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from transcriber import convert_urdu_to_devanagari

tests = [
    "چار بیسنسس",
    "پھر بھی ایک",
    "دیکھلو",
    "کیاکشن میں ہے",
]

for t in tests:
    print(f"Input:  {t}")
    print(f"Output: {convert_urdu_to_devanagari(t)}")
    print()
