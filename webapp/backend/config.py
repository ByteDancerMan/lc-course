import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / '.env')

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / 'storage' / 'chat.db'

DASHSCOPE_API_KEY = os.getenv('DASHSCOPE_API_KEY', '')
DASHSCOPE_BASE_URL = os.getenv('DASHSCOPE_BASE_URL', 'https://dashscope.aliyuncs.com/compatible-mode/v1')
DASHSCOPE_MODEL = os.getenv('DASHSCOPE_MODEL', 'qwen3.7-max')
DASHSCOPE_VISION_MODEL = os.getenv('DASHSCOPE_VISION_MODEL', 'qwen3.7-max')

TAVILY_API_KEY = os.getenv('TAVILY_API_KEY', '')

OSS_ACCESS_KEY_ID = os.getenv('OSS_ACCESS_KEY_ID', '')
OSS_ACCESS_KEY_SECRET = os.getenv('OSS_ACCESS_KEY_SECRET', '')
OSS_BUCKET = os.getenv('OSS_BUCKET', '')
OSS_ENDPOINT = os.getenv('OSS_ENDPOINT', '')
OSS_REGION = os.getenv('OSS_REGION', '')

IS_OSS_ENABLED = all([OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_ENDPOINT])
