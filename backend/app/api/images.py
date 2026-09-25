"""
api/images.py
-------------
GET /api/images         — list all uploaded images
GET /api/images/{id}    — retrieve a single image record
GET /api/images/{id}/file — serve the actual image file
"""
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Image as ImageModel
from app.schemas.schemas import ImageResponse, ImageListResponse, ImageListItem
from app.utils.file_utils import get_upload_path

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_image_or_404(image_id: str, db: Session) -> ImageModel:
    """Fetch an image record by image_id or raise 404."""
    record = db.query(ImageModel).filter(ImageModel.image_id == image_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image '{image_id}' not found.",
        )
    return record


@router.get(
    "",
    response_model=ImageListResponse,
    summary="List all uploaded images",
)
def list_images(db: Session = Depends(get_db)):
    records = db.query(ImageModel).order_by(ImageModel.created_at.desc()).all()
    items = [ImageListItem.model_validate(r) for r in records]
    return ImageListResponse(images=items, total=len(items))


@router.get(
    "/{image_id}",
    response_model=ImageResponse,
    summary="Get image metadata by ID",
)
def get_image(image_id: str, db: Session = Depends(get_db)):
    record = _get_image_or_404(image_id, db)
    return ImageResponse.model_validate(record)


@router.get(
    "/{image_id}/file",
    summary="Serve the original image file",
    response_class=FileResponse,
)
def get_image_file(image_id: str, db: Session = Depends(get_db)):
    """
    Stream the stored image file to the client.

    Security note: we look up the stored filename from the database
    rather than constructing the path from the image_id directly.
    This prevents path traversal attacks.
    """
    record = _get_image_or_404(image_id, db)
    file_path: Path = get_upload_path(record.stored_filename)

    if not file_path.exists():
        logger.error("File missing on disk for image %s: %s", image_id, file_path)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image file not found on server. It may have been deleted.",
        )

    # Map Pillow format names to MIME types
    media_types = {
        "PNG": "image/png",
        "JPEG": "image/jpeg",
        "TIFF": "image/tiff",
    }
    media_type = media_types.get(record.file_format, "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        filename=record.filename,
    )
