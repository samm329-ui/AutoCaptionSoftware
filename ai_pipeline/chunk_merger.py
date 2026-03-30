from typing import List
from .audio import Chunk
from .config import OVERLAP_TOLERANCE

def merge_chunks(processed_chunks: List[Chunk]) -> str:
    """
    Order-Safe Parallel Merge: 
    Merges transcriptions with deduplication. Guaranteed order.
    """
    if not processed_chunks:
        return ""
        
    # 6. Order-Safe Parallel Merge (PRD Requirement)
    # Sort processed chunks by their sequential index to guarantee order
    sorted_chunks = sorted(processed_chunks, key=lambda c: c.index)
    
    full_text = ""
    merged_segments = []
    
    for chunk in sorted_chunks:
        text = chunk.final_text or ""
        
        if not text.strip():
            continue
            
        # Simple overlap deduplication logic
        if full_text:
            end_words = full_text.split()[-10:] if len(full_text.split()) > 10 else full_text.split()
            start_words = text.split()[:10] if len(text.split()) > 10 else text.split()
            
            for i in range(len(start_words), 0, -1):
                overlap_candidate = ' '.join(start_words[:i])
                end_candidate = ' '.join(end_words[-i:])
                
                if overlap_candidate.lower() == end_candidate.lower():
                    # Strip overlap from new chunk
                    text = ' '.join(text.split()[i:])
                    break
        
        if text.strip():
            merged_segments.append({
                "text": text.strip(),
                "start": chunk.start_time,
                "end": chunk.end_time
            })
            full_text += (" " if full_text else "") + text.strip()
            
    return full_text, merged_segments
