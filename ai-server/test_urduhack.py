# -*- coding: utf-8 -*-
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Test urduhack for Urdu to Roman/Devanagari conversion
try:
    import urduhack
    print(f"urduhack version: {urduhack.__version__}")
    
    # Check what's available
    from urduhack import transliteration
    print(dir(transliteration))
except Exception as e:
    print(f"Error: {e}")

# Test with actual text
try:
    from urduhack.normalization import normalize
    test = "چار بیسنسس"
    normalized = normalize(test)
    print(f"\nOriginal: {test}")
    print(f"Normalized: {normalized}")
except Exception as e:
    print(f"Normalization error: {e}")
