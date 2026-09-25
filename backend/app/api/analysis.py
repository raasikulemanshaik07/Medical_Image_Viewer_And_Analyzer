"""
api/analysis.py
---------------
POST /api/images/{image_id}/analyze/statistics  — full image stats
POST /api/images/{image_id}/analyze/roi         — ROI statistics
POST /api/images/{image_id}/analyze/histogram   — intensity histogram
POST /api/images/{image_id}/analyze/edges       — edge metrics
GET  /api/images/{image_id}/history             — processing history
"""
import json
import logging

import cv2
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Image as ImageModel, AnalysisResult, ProcessingHistory
from app.schemas.schemas import (
    ImageStatistics,
    ROIRequest,
    ROIStatistics,
    HistogramData,
    EdgeMetrics,
    HistoryResponse,
    HistoryEntry,
)
from app.services.image_analysis import (
    compute_statistics,
    compute_roi_statistics,
    compute_histogram,
    compute_edge_metrics,
)
from app.utils.file_utils import get_upload_path

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Shared helpers ────────────────────────────────────────────────────────────

def _get_image_or_404(image_id: str, db: Session) -> ImageModel:
    record = db.query(ImageModel).filter(ImageModel.image_id == image_id).first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Image '{image_id}' not found.",
        )
    return record


def _load_cv2_image(record: ImageModel) -> "np.ndarray":
    import numpy as np
    path = get_upload_path(record.stored_filename)
    if not path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image file not found on disk.",
        )
    image = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="OpenCV could not read the image.",
        )
    return image


def _save_analysis_result(
    db: Session, image_id: str, analysis_type: str, params: dict, result: dict
) -> None:
    """Persist an analysis result. Non-fatal if DB write fails."""
    entry = AnalysisResult(
        image_id=image_id,
        analysis_type=analysis_type,
        parameters=json.dumps(params),
        result_data=json.dumps(result),
    )
    try:
        db.add(entry)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("Failed to save analysis result: %s", exc)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/{image_id}/analyze/statistics",
    response_model=ImageStatistics,
    summary="Calculate full image statistics",
)
def analyze_statistics(image_id: str, db: Session = Depends(get_db)):
    record = _get_image_or_404(image_id, db)
    image = _load_cv2_image(record)
    result = compute_statistics(image, image_id)
    _save_analysis_result(db, image_id, "statistics", {}, result)
    return ImageStatistics(**result)


@router.post(
    "/{image_id}/analyze/roi",
    response_model=ROIStatistics,
    summary="Calculate ROI statistics",
)
def analyze_roi(image_id: str, roi: ROIRequest, db: Session = Depends(get_db)):
    record = _get_image_or_404(image_id, db)
    image = _load_cv2_image(record)
    try:
        result = compute_roi_statistics(
            image, image_id, roi.x, roi.y, roi.width, roi.height
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        )
    params = roi.model_dump()
    _save_analysis_result(db, image_id, "roi", params, result)
    return ROIStatistics(**result)


@router.post(
    "/{image_id}/analyze/histogram",
    response_model=HistogramData,
    summary="Compute intensity histogram",
)
def analyze_histogram(
    image_id: str,
    roi: ROIRequest | None = None,
    db: Session = Depends(get_db),
):
    record = _get_image_or_404(image_id, db)
    image = _load_cv2_image(record)
    roi_dict = roi.model_dump() if roi else None
    result = compute_histogram(image, image_id, roi=roi_dict)
    params = roi_dict or {}
    _save_analysis_result(db, image_id, "histogram", params, result)
    return HistogramData(**result)


@router.post(
    "/{image_id}/analyze/edges",
    response_model=EdgeMetrics,
    summary="Calculate edge pixel metrics",
)
def analyze_edges(
    image_id: str,
    threshold1: int = 50,
    threshold2: int = 150,
    db: Session = Depends(get_db),
):
    record = _get_image_or_404(image_id, db)
    image = _load_cv2_image(record)
    result = compute_edge_metrics(image, image_id, threshold1, threshold2)
    _save_analysis_result(db, image_id, "edges", {"threshold1": threshold1, "threshold2": threshold2}, result)
    return EdgeMetrics(**result)


@router.get(
    "/{image_id}/history",
    response_model=HistoryResponse,
    summary="Get processing history for an image",
)
def get_history(image_id: str, db: Session = Depends(get_db)):
    _get_image_or_404(image_id, db)
    entries = (
        db.query(ProcessingHistory)
        .filter(ProcessingHistory.image_id == image_id)
        .order_by(ProcessingHistory.created_at.asc())
        .all()
    )
    return HistoryResponse(
        image_id=image_id,
        entries=[HistoryEntry.model_validate(e) for e in entries],
        total=len(entries),
    )
