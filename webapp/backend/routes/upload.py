from fastapi import APIRouter, UploadFile, File

from ..services.storage_service import store_image

router = APIRouter()


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    content = await file.read()
    result = await store_image(content, file.filename or "image.jpg", file.content_type or "image/jpeg")
    return result
