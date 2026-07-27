import logging
import tempfile
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from ..database import create_document, get_documents, delete_document
from ..services.knowledge_service import index_document
from ..config import PROJECT_ROOT

logger = logging.getLogger(__name__)

router = APIRouter()

# 知识库文件存储目录
KB_DIR = PROJECT_ROOT / "storage" / "knowledge"
KB_DIR.mkdir(parents=True, exist_ok=True)

SUPPORTED_EXTENSIONS = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx"}


@router.post("/knowledge/upload")
async def upload_knowledge(file: UploadFile = File(...)):
    ext = Path(file.filename or "").suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(400, f"不支持的文件格式: {ext}，仅支持 {', '.join(SUPPORTED_EXTENSIONS)}")
    content = await file.read()
    save_path = KB_DIR / f"{Path(file.filename).stem}_{len(content)}_{file.filename}"
    save_path.write_bytes(content)
    doc = create_document(file.filename, ext.lstrip("."))
    try:
        await index_document(str(save_path), doc["id"])
    except Exception as e:
        delete_document(doc["id"])
        save_path.unlink(missing_ok=True)
        logger.error("文档索引失败 | filename=%s error=%s", file.filename, e)
        raise HTTPException(500, f"文档处理失败: {e}")
    return {"success": True, "document": doc}


@router.get("/knowledge/list")
async def list_knowledge():
    docs = get_documents()
    return {"success": True, "documents": docs}


class DeleteKnowledgeRequest(BaseModel):
    documentId: str


@router.post("/knowledge/delete")
async def delete_knowledge(req: DeleteKnowledgeRequest):
    ok = delete_document(req.documentId)
    if not ok:
        raise HTTPException(404, "文档不存在")
    # 清理存储文件（保留文件本身，由数据库删除级联清理切片）
    for f in KB_DIR.iterdir():
        if f.is_file() and req.documentId in f.name:
            f.unlink(missing_ok=True)
    return {"success": True}
