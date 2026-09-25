"""
api/metadata.py
---------------
GET /api/images/{image_id}/metadata
"""
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Image as ImageModel
from app.schemas.schemas import MetadataResponse
from app.services.metadata_service import extract_metadata
from app.utils.file_utils import get_upload_path, human_readable_size

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/{image_id}/metadata",
    response_model=MetadataResponse,
    summary="Get technical metadata for an image",
)
def get_metadata(image_id: str, db: Session = Depends(get_db)):
    record = db.query(ImageModel).filter(ImageModel.image_id == image_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image '{image_id}' not found.",
        )

    file_path = get_upload_path(record.stored_filename)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image file not found on disk.",
        )

    meta = extract_metadata(file_path, image_id, record.filename)
    meta["created_at"] = record.created_at

    return MetadataResponse(**meta)
