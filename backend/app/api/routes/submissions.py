"""Submission API routes."""
import logging
import uuid
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, Request, status as http_status, Path, Query, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from geoalchemy2 import WKTElement
from typing import List, Optional
from datetime import datetime
import json

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.schemas.submission import SubmissionCreate, SubmissionResponse, SubmissionRejection, LocationData
from app.models.submission import Submission, SubmissionStatus
from app.models.quest import Quest, QuestStatus
from app.models.user import User
from app.utils.gps_verification import verify_gps_location
from app.utils.image_storage import save_image, get_image_url
from app.services.photo_processor import (
    detect_and_blur_faces,
    extract_exif_metadata,
    check_image_quality,
    validate_exif_location
)
from app.services.gemini_verifier import verify_with_gemini
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/submissions", tags=["submissions"])


def _request_origin(request: Request) -> str:
    """
    Return the request origin (scheme + host) for building image URLs.
    Uses X-Forwarded-Proto and X-Forwarded-Host when present (e.g. behind Railway/reverse proxy)
    so production image URLs point to the public API, not the internal proxy host.
    """
    forwarded_proto = request.headers.get("x-forwarded-proto")
    forwarded_host = request.headers.get("x-forwarded-host")
    if forwarded_proto and forwarded_host:
        return f"{forwarded_proto.strip()}://{forwarded_host.strip().split(',')[0].strip()}"
    u = urlparse(str(request.url))
    return f"{u.scheme}://{u.netloc}"


def build_submission_response(submission: Submission, db: Session, base_url: Optional[str] = None) -> SubmissionResponse:
    """Build a SubmissionResponse from a Submission model.
    base_url: API origin (e.g. https://api.example.com). If not set, uses settings.API_URL for image URLs.
    """
    # Extract location
    location_result = db.query(
        func.ST_X(text("submissions.captured_location::geometry")).label('lng'),
        func.ST_Y(text("submissions.captured_location::geometry")).label('lat')
    ).filter(Submission.id == submission.id).first()
    
    if not location_result:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract submission location"
        )
    
    static_base = f"{base_url.rstrip('/')}/static" if base_url else None
    return SubmissionResponse(
        id=submission.id,
        quest_id=submission.quest_id,
        explorer_id=submission.explorer_id,
        image_url=get_image_url(submission.image_url_full, base_url=static_base),
        captured_location={"lat": float(location_result.lat), "lng": float(location_result.lng)},
        captured_accuracy=submission.captured_accuracy,
        captured_at=submission.captured_at,
        capture_method=getattr(submission, "capture_method", "live"),
        gemini_result=getattr(submission, "gemini_result", None),
        verification_result=submission.verification_result,
        content_match_score=submission.content_match_score,
        quality_score=submission.quality_score,
        faces_detected=submission.faces_detected,
        faces_blurred=submission.faces_blurred,
        status=submission.status.value,
        rejection_reason=submission.rejection_reason,
        submitted_at=submission.submitted_at
    )


@router.post("", response_model=SubmissionResponse, status_code=http_status.HTTP_201_CREATED)
async def create_submission(
    request: Request,
    image: UploadFile = File(..., description="Photo image file"),
    quest_id: str = Form(..., description="Quest ID"),
    location: str = Form(..., description="Location JSON"),
    captured_at: str = Form(..., description="ISO timestamp when photo was captured"),
    capture_method: str = Form("live", description="How photo was obtained: 'live' or 'upload'"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submit a photo to complete a quest.
    
    Args:
        image: Photo image file (JPEG/PNG)
        quest_id: Quest UUID
        location: JSON string with {lat, lng, accuracy}
        captured_at: ISO timestamp string
        db: Database session
        current_user: Current authenticated user
    
    Returns:
        Created submission with verification results
    
    Raises:
        HTTPException: If validation fails or submission fails
    """
    try:
        # Parse quest_id
        try:
            quest_uuid = uuid.UUID(quest_id)
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Invalid quest ID format"
            )
        
        # Parse location
        try:
            location_data = json.loads(location)
            location_obj = LocationData(**location_data)
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid location data: {str(e)}"
            )
        
        # Parse captured_at
        try:
            captured_at_dt = datetime.fromisoformat(captured_at.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Invalid captured_at timestamp format"
            )
        
        # Validate image file
        if image.content_type not in settings.ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid image type. Allowed: {', '.join(settings.ALLOWED_IMAGE_TYPES)}"
            )
        
        # Read image bytes
        image_bytes = await image.read()
        
        # Check file size (max 10MB)
        max_size = settings.MAX_IMAGE_SIZE_MB * 1024 * 1024
        if len(image_bytes) > max_size:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail=f"Image too large. Maximum size: {settings.MAX_IMAGE_SIZE_MB}MB"
            )
        
        # Verify quest exists and is active
        quest = db.query(Quest).filter(Quest.id == quest_uuid).first()
        if not quest:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Quest not found"
            )
        
        if quest.status != QuestStatus.ACTIVE:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Quest is not active",
                headers={"X-Error-Code": "QUEST_NOT_ACTIVE"}
            )
        
        # Normalize capture_method
        if capture_method not in ("live", "upload"):
            capture_method = "live"
        # Create submission record (status: pending)
        submission_id = uuid.uuid4()
        submission = Submission(
            id=submission_id,
            quest_id=quest_uuid,
            explorer_id=current_user.id,
            image_url_full="",  # Will be set after saving
            captured_location=WKTElement(f"POINT({location_obj.lng} {location_obj.lat})", srid=4326),
            captured_accuracy=location_obj.accuracy,
            captured_at=captured_at_dt,
            capture_method=capture_method,
            status=SubmissionStatus.PROCESSING
        )
        db.add(submission)
        db.commit()
        db.refresh(submission)
        
        # Process image and verify
        verification_errors = []
        verification_result = {}
        
        try:
            # 1. Process image (face blur)
            processed_image, faces_detected, faces_blurred = detect_and_blur_faces(image_bytes)
            submission.faces_detected = faces_detected
            submission.faces_blurred = faces_blurred
            
            # 2. Check image quality
            quality_result = check_image_quality(processed_image)
            submission.quality_score = quality_result["score"]
            
            if quality_result["is_blurry"]:
                verification_errors.append({
                    "code": "QUALITY_BLUR",
                    "message": "Image is too blurry. Please take a clearer photo."
                })
            
            if quality_result["is_too_dark"]:
                verification_errors.append({
                    "code": "QUALITY_DARK",
                    "message": "Image is too dark. Please take a photo with better lighting."
                })
            
            if quality_result["is_too_small"]:
                verification_errors.append({
                    "code": "QUALITY_SMALL",
                    "message": "Image is too small. Minimum size: 640x480 pixels."
                })
            
            # 3. Verify GPS location
            # Extract quest location
            quest_location = db.query(
                func.ST_X(text("quests.location::geometry")).label('lng'),
                func.ST_Y(text("quests.location::geometry")).label('lat')
            ).filter(Quest.id == quest_uuid).first()
            
            if quest_location:
                gps_result = verify_gps_location(
                    location_obj.lat,
                    location_obj.lng,
                    location_obj.accuracy or 0,
                    float(quest_location.lat),
                    float(quest_location.lng),
                    quest.radius_meters
                )
                
                verification_result["gps"] = {
                    "verified": gps_result["verified"],
                    "distance_meters": gps_result["distance_meters"],
                    "reason": gps_result["reason"]
                }
                
                if not gps_result["verified"]:
                    verification_errors.append({
                        "code": "GPS_OUT_OF_RANGE" if "away" in gps_result["reason"] else "GPS_INACCURATE",
                        "message": gps_result["reason"]
                    })
            
            # 4. Extract and validate EXIF
            exif_data = extract_exif_metadata(image_bytes)
            if exif_data.get("has_gps"):
                exif_validation = validate_exif_location(
                    exif_data,
                    location_obj.lat,
                    location_obj.lng
                )
                verification_result["exif"] = {
                    "validated": exif_validation["matches"],
                    "distance_meters": exif_validation.get("distance_meters"),
                    "reason": exif_validation["reason"]
                }
                
                if not exif_validation["matches"]:
                    verification_errors.append({
                        "code": "EXIF_MISMATCH",
                        "message": exif_validation["reason"]
                    })
            else:
                verification_result["exif"] = {
                    "validated": None,
                    "reason": "No GPS data in EXIF (warning only)"
                }
            
            # 5. Gemini Vision verification
            exif_has_no_gps = (capture_method == "upload" and not exif_data.get("has_gps"))
            logger.info("Running Gemini verification for submission %s (quest=%s)", submission_id, quest_uuid)
            gemini_result = verify_with_gemini(
                processed_image,
                quest.title,
                quest.description or "",
                exif_has_no_gps=exif_has_no_gps,
            )
            submission.gemini_result = gemini_result
            if gemini_result:
                logger.info(
                    "Submission %s: Gemini verified image (grade=%s, score=%s)",
                    submission_id,
                    gemini_result.get("grade"),
                    gemini_result.get("content_match_score"),
                )
                submission.content_match_score = gemini_result.get("content_match_score")
                verification_result["gemini"] = gemini_result
                # Hybrid rejection logic
                if gemini_result.get("is_screenshot_or_screen_photo") or gemini_result.get("is_ai_generated"):
                    verification_errors.append({
                        "code": "AI_REJECT_SCREEN_OR_FAKE",
                        "message": "Photo appears to be a screenshot, photo of a screen, or AI-generated. Please submit an authentic photo taken at the location."
                    })
                elif not gemini_result.get("is_authentic_photo", True):
                    verification_errors.append({
                        "code": "AI_REJECT_INAUTHENTIC",
                        "message": "Photo could not be verified as authentic. Please submit a real photo taken at the location."
                    })
                else:
                    min_score = settings.GEMINI_CONTENT_MATCH_MIN_SCORE
                    score = gemini_result.get("content_match_score") or 0
                    if score < min_score:
                        reasoning = (gemini_result.get("reasoning") or "").strip()
                        msg = "Photo doesn't appear to match the quest. Please take a photo of the correct subject at the location."
                        if reasoning:
                            msg += f" Hint: {reasoning[:200]}" + ("..." if len(reasoning) > 200 else "")
                        verification_errors.append({
                            "code": "AI_REJECT_CONTENT_MISMATCH",
                            "message": msg,
                        })
            else:
                verification_result["gemini"] = None
                logger.info("Submission %s: Gemini did not return a result (API key missing or call failed); allowing submission", submission_id)
            
            # Build full verification result
            verification_result.update({
                "quality": {
                    "score": quality_result["score"],
                    "is_blurry": quality_result["is_blurry"],
                    "is_too_dark": quality_result["is_too_dark"],
                    "is_too_small": quality_result["is_too_small"]
                },
                "faces": {
                    "detected": faces_detected,
                    "blurred": faces_blurred
                }
            })
            
            submission.verification_result = verification_result
            
            # If any critical errors, reject submission
            if verification_errors:
                submission.status = SubmissionStatus.REJECTED
                submission.rejection_reason = verification_errors[0]["message"]
                db.commit()
                db.refresh(submission)
                
                # Return rejection response
                return JSONResponse(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    content={
                        "error": "verification_failed",
                        "code": verification_errors[0]["code"],
                        "message": verification_errors[0]["message"],
                        "details": {
                            "verification_result": verification_result,
                            "all_errors": verification_errors
                        }
                    }
                )
            
            # Save processed image
            relative_path = save_image(processed_image, quest_uuid, submission_id)
            submission.image_url_full = relative_path
            
            # Direct result: all checks passed → verified (no pending_review; user gets immediate pass/fail)
            submission.status = SubmissionStatus.VERIFIED
            db.commit()
            db.refresh(submission)
            
            logger.info(f"Submission {submission_id} verified successfully for quest {quest_uuid}")
            
            base_url = _request_origin(request)
            return build_submission_response(submission, db, base_url=base_url)
        
        except Exception as e:
            logger.error(f"Error processing submission {submission_id}: {str(e)}", exc_info=True)
            submission.status = SubmissionStatus.REJECTED
            submission.rejection_reason = f"Processing error: {str(e)}"
            db.commit()
            
            raise HTTPException(
                status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process submission: {str(e)}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create submission: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create submission: {str(e)}"
        )


@router.get("/{submission_id}", response_model=SubmissionResponse)
async def get_submission(
    request: Request,
    submission_id: str = Path(..., description="Submission ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a single submission by ID.
    
    Only accessible by the explorer who submitted it or the quest creator.
    
    Args:
        submission_id: Submission UUID
        db: Database session
        current_user: Current authenticated user
    
    Returns:
        Submission details
    
    Raises:
        HTTPException: If submission not found or user doesn't have access
    """
    try:
        try:
            submission_uuid = uuid.UUID(submission_id)
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Invalid submission ID format"
            )
        
        submission = db.query(Submission).filter(Submission.id == submission_uuid).first()
        
        if not submission:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )
        
        # Check access: explorer or quest creator
        quest = db.query(Quest).filter(Quest.id == submission.quest_id).first()
        if not quest:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Quest not found"
            )
        
        has_access = (
            submission.explorer_id == current_user.id or
            quest.creator_id == current_user.id
        )
        
        if not has_access:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this submission"
            )
        
        base_url = _request_origin(request)
        return build_submission_response(submission, db, base_url=base_url)
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch submission {submission_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch submission: {str(e)}"
        )


@router.get("/quest/{quest_id}", response_model=List[SubmissionResponse])
async def get_quest_submissions(
    request: Request,
    quest_id: str = Path(..., description="Quest ID"),
    status: Optional[str] = Query(None, description="Filter by status, e.g. 'verified' for approved only"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all submissions for a quest.
    
    Only accessible by the quest creator.
    
    Args:
        quest_id: Quest UUID
        status: Optional filter (e.g. 'verified' for approved submissions only)
        db: Database session
        current_user: Current authenticated user
    
    Returns:
        List of submissions for the quest
    
    Raises:
        HTTPException: If quest not found or user is not the creator
    """
    try:
        try:
            quest_uuid = uuid.UUID(quest_id)
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Invalid quest ID format"
            )
        
        quest = db.query(Quest).filter(Quest.id == quest_uuid).first()
        
        if not quest:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Quest not found"
            )
        
        # Check if user is the creator
        if quest.creator_id != current_user.id:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="Only the quest creator can view submissions"
            )
        
        query = db.query(Submission).filter(Submission.quest_id == quest_uuid)
        if status == "verified":
            query = query.filter(Submission.status == SubmissionStatus.VERIFIED)
        submissions = query.order_by(Submission.submitted_at.desc()).all()
        
        base_url = _request_origin(request)
        return [build_submission_response(sub, db, base_url=base_url) for sub in submissions]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch submissions for quest {quest_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch submissions: {str(e)}"
        )
