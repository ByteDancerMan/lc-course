import logging
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
    # 只取原始文件名的 basename，避免路径穿越
    original_name = Path(file.filename or "").name
    ext = Path(original_name).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(400, f"不支持的文件格式: {ext}，仅支持 {', '.join(SUPPORTED_EXTENSIONS)}")
    content = await file.read()
    # 先创建文档记录拿到 doc_id，用 doc_id 作为存储文件名（不含用户可控内容）
    doc = create_document(original_name, ext.lstrip("."))
    save_path = KB_DIR / f"{doc['id']}{ext}"
    save_path.write_bytes(content)
    try:
        await index_document(str(save_path), doc["id"])
    except Exception as e:
        delete_document(doc["id"])
        save_path.unlink(missing_ok=True)
        logger.error("文档索引失败 | filename=%s error=%s", original_name, e)
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
    # 清理存储文件：文件名为 {documentId}{ext}，按前缀精确匹配
    for f in KB_DIR.iterdir():
        if f.is_file() and f.name.startswith(f"{req.documentId}."):
            f.unlink(missing_ok=True)
    return {"success": True}
