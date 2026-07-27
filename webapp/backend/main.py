import sys
from pathlib import Path
# 将项目根目录添加到 Python 模块搜索路径，确保模块导入正确
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .logging_conf import setup_logging
from .database import init_db
from .routes.chat import router as chat_router
from .routes.sessions import router as sessions_router
from .routes.upload import router as upload_router
from .routes.knowledge import router as knowledge_router

logger = setup_logging()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 应用启动时自动初始化数据库表
    init_db()
    yield


# 创建 FastAPI 应用实例
app = FastAPI(lifespan=lifespan)

# 允许跨域访问（开发环境全部放行）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由，所有 API 路径前缀为 /api
app.include_router(chat_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(upload_router, prefix="/api")
app.include_router(knowledge_router, prefix="/api")

# 挂载本地文件上传目录，可通过 /uploads 直接访问
app.mount("/uploads", StaticFiles(directory=str(Path(__file__).resolve().parent.parent / "storage" / "uploads")), name="uploads")


# 健康检查接口
@app.get("/api/health")
async def health():
    return {"success": True, "message": "ok"}
