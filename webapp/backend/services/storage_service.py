import uuid
from pathlib import Path

from ..config import IS_OSS_ENABLED, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_ENDPOINT

# 本地文件存储目录
LOCAL_UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "uploads"


def get_storage_mode() -> str:
    # 返回当前存储模式：oss 或 local
    return "oss" if IS_OSS_ENABLED else "local"


async def store_image(file_bytes: bytes, filename: str, content_type: str) -> dict:
    # 存储上传的图片，支持本地存储和阿里云 OSS 两种方式
    image_id = str(uuid.uuid4())
    ext = Path(filename).suffix or ".jpg"
    object_key = f"chat/{image_id}{ext}"

    if IS_OSS_ENABLED:
        # 上传到阿里云 OSS
        import oss2
        auth = oss2.Auth(OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET)
        bucket = oss2.Bucket(auth, OSS_ENDPOINT, OSS_BUCKET)
        result = bucket.put_object(object_key, file_bytes, headers={"Content-Type": content_type})
        image_url = result.url if hasattr(result, "url") else f"https://{OSS_BUCKET}.{OSS_ENDPOINT}/{object_key}"
    else:
        # 保存到本地文件系统
        LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        file_path = LOCAL_UPLOAD_DIR / f"{image_id}{ext}"
        file_path.write_bytes(file_bytes)
        image_url = f"/uploads/{image_id}{ext}"

    return {
        "imageId": image_id,
        "imageUrl": image_url,
        "fileName": filename,
        "contentType": content_type,
    }
