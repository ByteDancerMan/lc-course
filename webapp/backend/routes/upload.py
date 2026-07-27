import logging
from fastapi import APIRouter, UploadFile, File

from ..services.storage_service import store_image

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    # 图片上传接口：接收前端上传的图片，存入本地或 OSS，返回可访问的 URL
    logger.info("上传文件 | name=%s type=%s size=%d", file.filename, file.content_type, file.size or 0)
    content = await file.read()
    result = await store_image(content, file.filename or "image.jpg", file.content_type or "image/jpeg")
    logger.info("文件上传完成 | imageId=%s url=%s", result["imageId"], result["imageUrl"])
    return result
