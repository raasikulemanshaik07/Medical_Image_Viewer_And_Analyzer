"""
api/upload.py
-------------
POST /api/images/upload

Handles multipart file upload, validates the image, saves it to disk,
and records it in the database.
"""
import json
import logging

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Image as ImageModel
from app.schemas.schemas import ImageResponse
from app.utils.file_utils import (
    generate_image_id,
    safe_stored_filename,
    get_upload_path,
    validate_and_read_upload,
    save_file_to_disk,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/upload",
    response_model=ImageResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a medical image",
    description=(
        "Accepts PNG, JPEG, or TIFF files up to 50 MB. "
        "Validates content (not just extension), stores the file, "
        "and records metadata in the database."
    ),
)
async def upload_image(
    file: UploadFile = File(..., description="Image file to upload"),
    db: Session = Depends(get_db),
):
    """
    Upload flow:
      1. validate_and_read_upload() — checks extension, size, and content.
      2. Generate a unique image_id and a safe stored filename.
      3. Save the raw bytes to the uploads/ directory.
      4. Persist metadata to the images table.
      5. Return the ImageResponse schema.
    """
    # ── Validate ──────────────────────────────────────────────────────────────
    try:
        file_bytes, pil_format, width, height, channels = await validate_and_read_upload(file)
    except HTTPException:
        raise  # re-raise validation errors as-is

    # ── Generate identifiers ──────────────────────────────────────────────────
    image_id = generate_image_id()
    stored_filename = safe_stored_filename(file.filename or "upload", pil_format)
    file_size = len(file_bytes)

    # ── Save to disk ──────────────────────────────────────────────────────────
    dest_path = get_upload_path(stored_filename)
    save_file_to_disk(file_bytes, dest_path)

    # ── Persist to DB ─────────────────────────────────────────────────────────
    db_image = ImageModel(
        image_id=image_id,
        filename=file.filename,
        stored_filename=stored_filename,
        file_format=pil_format,
        width=width,
        height=height,
        channels=channels,
        file_size=file_size,
    )

    try:
        db.add(db_image)
        db.commit()
        db.refresh(db_image)
    except Exception as exc:
        db.rollback()
        logger.error("Database error during upload: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save image metadata to the database.",
        )

    logger.info("Uploaded image %s (%s, %dx%d)", image_id, pil_format, width, height)

    return ImageResponse(
        image_id=db_image.image_id,
        filename=db_image.filename,
        file_format=db_image.file_format,
        width=db_image.width,
        height=db_image.height,
        channels=db_image.channels,
        file_size=db_image.file_size,
        created_at=db_image.created_at,
        status="uploaded",
    )
