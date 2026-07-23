import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import init_db
from .routes.chat import router as chat_router
from .routes.sessions import router as sessions_router
from .routes.upload import router as upload_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(upload_router, prefix="/api")

app.mount("/uploads", StaticFiles(directory=str(Path(__file__).resolve().parent.parent / "storage" / "uploads")), name="uploads")


@app.get("/api/health")
async def health():
    return {"success": True, "message": "ok"}
