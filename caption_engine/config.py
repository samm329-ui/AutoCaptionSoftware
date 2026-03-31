# config.py - FYAP Pro Full Stack

PIPELINE_VERSION = '1.0.0'

# -- Backend --
SERVER_HOST = '127.0.0.1'
SERVER_PORT = 8000

DATA_DIR = 'data'
UPLOAD_DIR  = 'data/uploads'
OUTPUT_DIR  = 'data/outputs'
DB_PATH     = 'data/fyap_pro.db'

MAX_UPLOAD_SIZE_MB = 500

# -- Config Profile --
PROFILE = 'balanced'  # 'fast' | 'balanced' | 'accurate'

# -- Base Thresholds (overridden by adaptive engine) --
DUAL_SCORE_THRESHOLD   = 0.80
ALIGN_AVG_THRESHOLD    = 0.65
CONFIDENCE_REPROCESS   = 0.50
CONFIDENCE_DIM         = 0.60
CONFIDENCE_MICRO_REALIGN = 0.40

# -- Adaptive Engine Deltas --
NOISY_SNR_THRESHOLD      = 10
NOISY_DUAL_DELTA         = -0.05
NOISY_ALIGN_DELTA        = -0.05
FAST_SPEECH_THRESHOLD    = 3.5
FAST_SPEECH_ALIGN_DELTA  = -0.03

# -- Scoring Weights --
SEMANTIC_WEIGHT          = 0.60
KEYWORD_WEIGHT           = 0.40
ALIGN_LOW_RATIO_MAX      = 0.30
ALIGN_WORD_THRESHOLD     = 0.50

# -- Chunking --
CHUNK_SIZE_NORMAL        = 30
CHUNK_OVERLAP_NORMAL     = 2
CHUNK_SIZE_STRICT        = 15
CHUNK_OVERLAP_STRICT     = 3

# -- Sentence Split --
SENTENCE_MAX_WORDS       = 10
SENTENCE_MAX_WORDS_STRICT = 8
PROSODY_PAUSE_THRESHOLD  = 0.4

# -- Retry --
RETRY_GROQ  = 2
RETRY_LLM   = 1
RETRY_ALIGN = 2

# -- Alignment --
OVERLAP_TOLERANCE        = 0.10
DRIFT_MIN_GAP            = 0.02
MICRO_REALIGN_WINDOW     = 1.0

# -- Embedding --
EMBED_BATCH_SIZE         = 16

# -- LLM --
LLM_MODE                 = 'normal'

# -- LM Check --
LM_CHECK_MIN_SCORE       = 0.50

# -- Consistency Pass --
CONSISTENCY_WORD_DIFF_MAX = 0.05

# -- Cache --
CACHE_DIR                = 'data/cache'

# -- Alignment Models --
MODEL_ALIGN_EN           = 'WAV2VEC2_ASR_BASE_960H'
MODEL_ALIGN_HI           = 'theainerd/Wav2Vec2-large-xlsr-hindi'

# -- Fallback Score --
MIN_SCORE_FALLBACK       = 0.60

# -- Language-Aware Confidence --
CONFIDENCE_HINDI         = 0.70
CONFIDENCE_ENGLISH       = 0.78
CONFIDENCE_HINGLISH      = 0.72

# -- Hallucination Guard --
MAX_WORD_DIFF_RATIO      = 0.40

# -- Observability --
LOG_STRUCTURED           = True
LOG_DIR                  = 'data/logs'
