"""
api/processing.py
-----------------
POST /api/images/{image_id}/process  — apply an OpenCV operation
GET  /api/images/{image_id}/processed — serve the most recent processed image
"""
import json
import logging
import uuid
from pathlib import Path

import cv2
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Image as ImageModel, ProcessingHistory
from app.schemas.schemas import ProcessRequest, ProcessResponse
from app.services.image_processing import dispatch_operation
from app.utils.file_utils import get_upload_path, get_processed_path

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_image_or_404(image_id: str, db: Session) -> ImageModel:
    record = db.query(ImageModel).filter(ImageModel.image_id == image_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image '{image_id}' not found.",
        )
    return record


@router.post(
    "/{image_id}/process",
    response_model=ProcessResponse,
    summary="Apply an OpenCV processing operation",
    description=(
        "Applies one of the supported OpenCV operations to the original image. "
        "The processed image is saved to the server and a URL is returned. "
        "The original file is never modified."
    ),
)
def process_image(
    image_id: str,
    request: ProcessRequest,
    db: Session = Depends(get_db),
):
    """
    Processing flow:
      1. Load the original image from disk using OpenCV.
      2. Dispatch to the appropriate service function.
      3. Save the result to uploads/processed/ with a unique filename.
      4. Record the operation in processing_history.
      5. Return the URL of the processed image.
    """
    record = _get_image_or_404(image_id, db)
    original_path = get_upload_path(record.stored_filename)

    if not original_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original image file not found on disk.",
        )

    # ── Load original with OpenCV ─────────────────────────────────────────────
    # cv2.IMREAD_UNCHANGED preserves alpha channels and 16-bit images.
    image_array = cv2.imread(str(original_path), cv2.IMREAD_UNCHANGED)
    if image_array is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="OpenCV could not read the image file.",
        )

    # ── Apply operation ───────────────────────────────────────────────────────
    try:
        processed = dispatch_operation(image_array, request.operation, request.parameters)
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Processing failed: {exc}",
        )
    except Exception as exc:
        logger.error("Unexpected processing error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during image processing.",
        )

    # ── Save processed image ──────────────────────────────────────────────────
    processed_filename = f"{image_id}_{request.operation}_{uuid.uuid4().hex[:6]}.png"
    processed_path = get_processed_path(processed_filename)

    success = cv2.imwrite(str(processed_path), processed)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save the processed image to disk.",
        )

    # ── Record in processing_history ─────────────────────────────────────────
    history_entry = ProcessingHistory(
        image_id=image_id,
        operation_name=request.operation,
        parameters=json.dumps(request.parameters),
    )
    try:
        db.add(history_entry)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("Failed to save processing history: %s", exc)
        # Non-fatal: the image was processed successfully; history is best-effort.

    processed_url = f"/api/images/{image_id}/processed/{processed_filename}"

    return ProcessResponse(
        image_id=image_id,
        operation=request.operation,
        parameters=request.parameters,
        processed_image_url=processed_url,
    )


@router.get(
    "/{image_id}/processed/{filename}",
    summary="Serve a processed image file",
    response_class=FileResponse,
)
def get_processed_file(image_id: str, filename: str, db: Session = Depends(get_db)):
    """
    Serve a previously generated processed image.

    Security: we verify the image_id exists in the DB before serving,
    and we ensure the filename contains no path separators.
    """
    # Prevent path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename.",
        )

    # Verify the parent image exists
    _get_image_or_404(image_id, db)

    file_path = get_processed_path(filename)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Processed image not found.",
        )

    return FileResponse(path=str(file_path), media_type="image/png")
