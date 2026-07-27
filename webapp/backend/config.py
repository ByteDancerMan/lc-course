import os
from pathlib import Path
from dotenv import load_dotenv

# 加载项目根目录的 .env 配置文件
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / '.env')

# 项目根目录
PROJECT_ROOT = Path(__file__).resolve().parent.parent
# SQLite 数据库文件路径
DB_PATH = PROJECT_ROOT / 'storage' / 'chat.db'

# 阿里云百炼 API 配置（DashScope）
DASHSCOPE_API_KEY = os.getenv('DASHSCOPE_API_KEY', '')
DASHSCOPE_BASE_URL = os.getenv('DASHSCOPE_BASE_URL', 'https://dashscope.aliyuncs.com/compatible-mode/v1')
DASHSCOPE_MODEL = os.getenv('DASHSCOPE_MODEL', 'qwen3.7-max')
DASHSCOPE_VISION_MODEL = os.getenv('DASHSCOPE_VISION_MODEL', 'qwen3.7-max')

# Tavily 搜索 API 配置
TAVILY_API_KEY = os.getenv('TAVILY_API_KEY', '')

# 阿里云 OSS 对象存储配置
OSS_ACCESS_KEY_ID = os.getenv('OSS_ACCESS_KEY_ID', '')
OSS_ACCESS_KEY_SECRET = os.getenv('OSS_ACCESS_KEY_SECRET', '')
OSS_BUCKET = os.getenv('OSS_BUCKET', '')
OSS_ENDPOINT = os.getenv('OSS_ENDPOINT', '')
OSS_REGION = os.getenv('OSS_REGION', '')

# 判断 OSS 是否启用（所有配置项都不为空）
IS_OSS_ENABLED = all([OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_ENDPOINT])

# 知识库向量模型配置
EMBEDDING_MODEL = os.getenv('EMBEDDING_MODEL', 'qwen3.7-text-embedding')
EMBEDDING_DIM = int(os.getenv('EMBEDDING_DIM', '1024'))
KNOWLEDGE_CHUNK_SIZE = int(os.getenv('KNOWLEDGE_CHUNK_SIZE', '500'))
KNOWLEDGE_CHUNK_OVERLAP = int(os.getenv('KNOWLEDGE_CHUNK_OVERLAP', '50'))
KNOWLEDGE_SEARCH_TOP_K = int(os.getenv('KNOWLEDGE_SEARCH_TOP_K', '5'))
KNOWLEDGE_SEARCH_THRESHOLD = float(os.getenv('KNOWLEDGE_SEARCH_THRESHOLD', '0.5'))
