import uuid
from pathlib import Path

from ..config import IS_OSS_ENABLED, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET, OSS_ENDPOINT

LOCAL_UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "storage" / "uploads"


def get_storage_mode() -> str:
    return "oss" if IS_OSS_ENABLED else "local"


async def store_image(file_bytes: bytes, filename: str, content_type: str) -> dict:
    image_id = str(uuid.uuid4())
    ext = Path(filename).suffix or ".jpg"
    object_key = f"chat/{image_id}{ext}"

    if IS_OSS_ENABLED:
        import oss2
        auth = oss2.Auth(OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET)
        bucket = oss2.Bucket(auth, OSS_ENDPOINT, OSS_BUCKET)
        result = bucket.put_object(object_key, file_bytes, headers={"Content-Type": content_type})
        image_url = result.url if hasattr(result, "url") else f"https://{OSS_BUCKET}.{OSS_ENDPOINT}/{object_key}"
    else:
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
