"""Quest API routes."""
import logging
import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, status as http_status, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import text, func, cast, String
from sqlalchemy.orm import selectinload
from geoalchemy2 import WKTElement
from typing import List, Optional
from datetime import datetime, timezone
from app.database import get_db
from app.auth.dependencies import get_current_user, get_current_user_optional
from app.schemas.quest import QuestCreate, QuestUpdate, QuestResponse, QuestShareResponse
from app.models.quest import Quest, QuestStatus, QuestVisibility, QuestParticipant, QuestParticipantStatus
from app.models.submission import Submission, SubmissionStatus
from app.models.user import User
from app.config import settings
from app.utils.image_storage import get_image_url

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quests", tags=["quests"])


def generate_slug(title: str, quest_id: uuid.UUID) -> str:
    """Generate a URL-friendly slug from quest title and ID."""
    # Convert to lowercase and replace spaces with hyphens
    slug_base = re.sub(r'[^\w\s-]', '', title.lower())
    slug_base = re.sub(r'[-\s]+', '-', slug_base)
    slug_base = slug_base.strip('-')
    
    # Add short UUID to ensure uniqueness
    short_id = str(quest_id)[:8]
    slug = f"{slug_base}-{short_id}"
    
    # Ensure it's not too long (max 255 chars)
    if len(slug) > 240:
        slug = slug[:240] + f"-{short_id}"
    
    return slug


def build_quest_response(quest: Quest, db: Session, current_user: Optional[User] = None) -> QuestResponse:
    """Build a QuestResponse from a Quest model."""
    # Extract location
    location_result = db.query(
        func.ST_X(text("quests.location::geometry")).label('lng'),
        func.ST_Y(text("quests.location::geometry")).label('lat')
    ).filter(Quest.id == quest.id).first()
    
    if not location_result:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract quest location"
        )
    
    # Get participant count
    participant_count = db.query(QuestParticipant).filter(
        QuestParticipant.quest_id == quest.id,
        QuestParticipant.status != QuestParticipantStatus.LEFT
    ).count()
    
    # Get verified submission count
    submission_count = db.query(Submission).filter(
        Submission.quest_id == quest.id,
        Submission.status == SubmissionStatus.VERIFIED
    ).count()
    
    # Check if current user has joined
    has_joined = None
    if current_user:
        participant = db.query(QuestParticipant).filter(
            QuestParticipant.quest_id == quest.id,
            QuestParticipant.user_id == current_user.id,
            QuestParticipant.status != QuestParticipantStatus.LEFT
        ).first()
        has_joined = participant is not None
    
    # Build share link
    share_link = None
    if quest.slug:
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        share_link = f"{base_url}/quest/{quest.slug}"

    cover_image_url = get_image_url(quest.cover_image_path) if quest.cover_image_path else None

    return QuestResponse(
        id=quest.id,
        creator_id=quest.creator_id,
        title=quest.title,
        description=quest.description,
        location={"lat": float(location_result.lat), "lng": float(location_result.lng)},
        radius_meters=quest.radius_meters,
        visibility=quest.visibility,
        photo_count=quest.photo_count,
        is_paid=quest.is_paid,
        slug=quest.slug,
        share_link=share_link,
        cover_image_url=cover_image_url,
        participant_count=participant_count,
        submission_count=submission_count,
        has_joined=has_joined,
        start_date=quest.start_date,
        end_date=quest.end_date,
        status=quest.status.value,
        created_at=quest.created_at,
        updated_at=quest.updated_at
    )


@router.post("", response_model=QuestResponse, status_code=http_status.HTTP_201_CREATED)
async def create_quest(
    quest_data: QuestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new quest.
    
    Args:
        quest_data: Quest creation data
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Created quest
        
    Raises:
        HTTPException: If validation fails or creation fails
    """
    try:
        logger.info(f"Creating quest for user {current_user.id}: title={quest_data.title[:50]}")
        logger.debug(f"Quest data: visibility={quest_data.visibility}, visibility_type={type(quest_data.visibility)}, visibility_value={getattr(quest_data.visibility, 'value', 'N/A')}")
        
        # Create PostGIS POINT from lat/lng using WKTElement
        # Note: PostGIS uses (longitude, latitude) order
        location = WKTElement(f"POINT({quest_data.lng} {quest_data.lat})", srid=4326)
        
        # Generate a temporary ID for slug generation (will be replaced by actual ID)
        temp_id = uuid.uuid4()
        
        # Generate slug from title
        slug = generate_slug(quest_data.title, temp_id)
        
        # For open quests (is_paid=False), set start_date to created_at
        start_date = quest_data.start_date
        if not quest_data.is_paid:
            start_date = None  # Will be set to created_at in the database
        
        # Create quest object
        # EnumValueType will automatically convert enum objects to their values (lowercase strings)
        quest = Quest(
            creator_id=current_user.id,
            location=location,
            title=quest_data.title,
            description=quest_data.description,
            radius_meters=quest_data.radius_meters,
            visibility=quest_data.visibility,  # EnumValueType will convert to 'public' or 'private'
            photo_count=quest_data.photo_count,
            is_paid=quest_data.is_paid,
            slug=slug,
            start_date=start_date,
            end_date=quest_data.end_date if quest_data.is_paid else None,
            status=QuestStatus.ACTIVE  # EnumValueType will convert to 'active'
        )
        
        logger.debug(f"Quest object created: visibility={quest.visibility}, is_paid={quest.is_paid}, slug={quest.slug}")
        
        db.add(quest)
        logger.debug("Quest added to session, committing...")
        db.commit()
        logger.info(f"Quest created successfully: {quest.id}")
        db.refresh(quest)
        
        # Regenerate slug with actual quest ID to ensure uniqueness
        if quest.slug:
            quest.slug = generate_slug(quest.title, quest.id)
            db.commit()
            db.refresh(quest)
        
        # For open quests, set start_date to created_at if not already set
        if not quest.is_paid and not quest.start_date:
            quest.start_date = quest.created_at
            db.commit()
            db.refresh(quest)
        
        return build_quest_response(quest, db, current_user)
        
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create quest: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create quest: {str(e)}"
        )


@router.get("", response_model=List[QuestResponse])
async def get_quests(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    creator_id: Optional[str] = Query(None, description="Filter by creator user ID"),
    visibility: Optional[QuestVisibility] = Query(None, description="Filter by visibility"),
    status: Optional[QuestStatus] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of quests to return"),
    offset: int = Query(0, ge=0, description="Number of quests to skip")
):
    """Get list of quests.
    
    Args:
        db: Database session
        current_user: Current authenticated user (optional)
        creator_id: Filter by creator user ID
        visibility: Filter by visibility (public/private)
        status: Filter by status
        limit: Maximum number of quests to return
        offset: Number of quests to skip
        
    Returns:
        List of quests
    """
    try:
        logger.info(f"Fetching quests: creator_id={creator_id}, visibility={visibility}, status={status}, limit={limit}, offset={offset}")
        logger.debug(f"Current user: {current_user.id if current_user else 'None'}")
        
        # Build query
        query = db.query(Quest)
        
        # Filter by creator if provided
        if creator_id:
            query = query.filter(Quest.creator_id == creator_id)
        
        # Filter by visibility using ORM
        if visibility:
            logger.debug(f"Filtering by visibility enum: {visibility}, value: {visibility.value if hasattr(visibility, 'value') else 'N/A'}")
            query = query.filter(Quest.visibility == visibility)
        elif current_user is None:
            # If not authenticated, only show public quests
            logger.debug("No user authenticated, filtering for public quests only")
            query = query.filter(Quest.visibility == QuestVisibility.PUBLIC)
        
        # Filter by status using ORM
        if status:
            logger.debug(f"Filtering by status enum: {status}, value: {status.value if hasattr(status, 'value') else 'N/A'}")
            query = query.filter(Quest.status == status)
        else:
            # Default to active quests only
            logger.debug("No status filter, defaulting to active quests")
            query = query.filter(Quest.status == QuestStatus.ACTIVE)
        
        # Order by created_at descending (newest first)
        query = query.order_by(Quest.created_at.desc())
        
        # Apply pagination
        logger.debug("Executing query...")
        quests = query.offset(offset).limit(limit).all()
        logger.info(f"Found {len(quests)} quests")
        
        # Convert to response format using ORM
        result = []
        logger.debug(f"Converting {len(quests)} quests to response format...")
        
        # Use ORM to extract lat/lng for all quests in a single query
        # This is more efficient than querying each quest individually
        quest_ids = [quest.id for quest in quests]
        
        if quest_ids:
            # Query all locations at once using ORM
            # Cast Geography to Geometry for ST_X/ST_Y functions
            # PostgreSQL syntax: location::geometry
            location_results = db.query(
                Quest.id,
                func.ST_X(text("quests.location::geometry")).label('lng'),
                func.ST_Y(text("quests.location::geometry")).label('lat')
            ).filter(Quest.id.in_(quest_ids)).all()
            
            # Create a map of quest_id -> location for quick lookup
            location_map = {loc.id: {"lat": float(loc.lat), "lng": float(loc.lng)} for loc in location_results}
            
            # Batch participant counts (one query for all quests)
            participant_rows = db.query(
                QuestParticipant.quest_id,
                func.count(QuestParticipant.id).label("cnt")
            ).filter(
                QuestParticipant.quest_id.in_(quest_ids),
                QuestParticipant.status != QuestParticipantStatus.LEFT
            ).group_by(QuestParticipant.quest_id).all()
            participant_count_map = {row.quest_id: row.cnt for row in participant_rows}
            
            # Batch submission counts (one query for all quests)
            submission_rows = db.query(
                Submission.quest_id,
                func.count(Submission.id).label("cnt")
            ).filter(
                Submission.quest_id.in_(quest_ids),
                Submission.status == SubmissionStatus.VERIFIED
            ).group_by(Submission.quest_id).all()
            submission_count_map = {row.quest_id: row.cnt for row in submission_rows}
            
            # Batch has_joined for current user (one query)
            joined_quest_ids = set()
            if current_user:
                joined_rows = db.query(QuestParticipant.quest_id).filter(
                    QuestParticipant.quest_id.in_(quest_ids),
                    QuestParticipant.user_id == current_user.id,
                    QuestParticipant.status != QuestParticipantStatus.LEFT
                ).all()
                joined_quest_ids = {row.quest_id for row in joined_rows}
        else:
            location_map = {}
            participant_count_map = {}
            submission_count_map = {}
            joined_quest_ids = set()
        
        for quest in quests:
            try:
                quest_location = location_map.get(quest.id)
                if not quest_location:
                    logger.warning(f"No location result for quest {quest.id}")
                    continue
                
                logger.debug(f"Quest {quest.id}: visibility={quest.visibility}, status={quest.status}, status_value={quest.status.value if hasattr(quest.status, 'value') else 'N/A'}")
                
                participant_count = participant_count_map.get(quest.id, 0)
                submission_count = submission_count_map.get(quest.id, 0)
                has_joined = (quest.id in joined_quest_ids) if current_user else None
                
                # Build share link
                share_link = None
                if quest.slug:
                    base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
                    share_link = f"{base_url}/quest/{quest.slug}"
                
                cover_image_url = get_image_url(quest.cover_image_path) if quest.cover_image_path else None
                
                result.append(QuestResponse(
                    id=quest.id,
                    creator_id=quest.creator_id,
                    title=quest.title,
                    description=quest.description,
                    location=quest_location,
                    radius_meters=quest.radius_meters,
                    visibility=quest.visibility,
                    photo_count=quest.photo_count,
                    is_paid=quest.is_paid,
                    slug=quest.slug,
                    share_link=share_link,
                    cover_image_url=cover_image_url,
                    participant_count=participant_count,
                    submission_count=submission_count,
                    has_joined=has_joined,
                    start_date=quest.start_date,
                    end_date=quest.end_date,
                    status=quest.status.value,
                    created_at=quest.created_at,
                    updated_at=quest.updated_at
                ))
            except Exception as e:
                logger.error(f"Error converting quest {quest.id} to response: {str(e)}", exc_info=True)
                # Continue with other quests instead of failing completely
                continue
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to fetch quests: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch quests: {str(e)}"
        )


@router.get("/{quest_id}", response_model=QuestResponse)
async def get_quest(
    quest_id: str = Path(..., description="Quest ID or slug"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get a single quest by ID or slug.
    
    Args:
        quest_id: Quest UUID or slug
        db: Database session
        current_user: Current authenticated user (optional)
        
    Returns:
        Quest details
        
    Raises:
        HTTPException: If quest not found
    """
    try:
        # Try to find by ID first, then by slug
        try:
            quest_uuid = uuid.UUID(quest_id)
            quest = db.query(Quest).filter(Quest.id == quest_uuid).first()
        except ValueError:
            # Not a valid UUID, try slug
            quest = db.query(Quest).filter(Quest.slug == quest_id).first()
        
        if not quest:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Quest not found"
            )
        
        # Backfill slug for older quests that don't have one (so slug-based URLs work)
        if quest.slug is None:
            try:
                quest.slug = generate_slug(quest.title, quest.id)
                db.add(quest)
                db.commit()
                db.refresh(quest)
            except Exception as e:
                db.rollback()
                logger.warning(f"Failed to backfill slug for quest {quest.id}: {e}")
                # Continue without slug; response will have slug=None
        
        # Check visibility for private quests
        if quest.visibility == QuestVisibility.PRIVATE:
            if not current_user:
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="This quest is private"
                )
            if quest.creator_id != current_user.id:
                # Check if user has joined (has access via share link)
                participant = db.query(QuestParticipant).filter(
                    QuestParticipant.quest_id == quest.id,
                    QuestParticipant.user_id == current_user.id
                ).first()
                if not participant:
                    raise HTTPException(
                        status_code=http_status.HTTP_403_FORBIDDEN,
                        detail="You don't have access to this quest"
                    )
        
        return build_quest_response(quest, db, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch quest {quest_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch quest: {str(e)}"
        )


@router.post("/{quest_id}/join", status_code=http_status.HTTP_201_CREATED)
async def join_quest(
    quest_id: str = Path(..., description="Quest ID or slug"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Join a quest.
    
    Args:
        quest_id: Quest UUID or slug
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If quest not found or user cannot join
    """
    try:
        # Try to find by ID first, then by slug
        try:
            quest_uuid = uuid.UUID(quest_id)
            quest = db.query(Quest).filter(Quest.id == quest_uuid).first()
        except ValueError:
            # Not a valid UUID, try slug
            quest = db.query(Quest).filter(Quest.slug == quest_id).first()
        
        if not quest:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Quest not found"
            )
        
        # Check if quest is active
        if quest.status != QuestStatus.ACTIVE:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Quest is not active"
            )
        
        # Check if user is the creator
        if quest.creator_id == current_user.id:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="You cannot join your own quest"
            )
        
        # Check if user has already joined
        existing = db.query(QuestParticipant).filter(
            QuestParticipant.quest_id == quest.id,
            QuestParticipant.user_id == current_user.id
        ).first()
        
        if existing:
            if existing.status == QuestParticipantStatus.LEFT:
                # Rejoin
                existing.status = QuestParticipantStatus.JOINED
                existing.joined_at = datetime.now(timezone.utc)
                db.commit()
                return {"message": "Rejoined quest successfully"}
            else:
                raise HTTPException(
                    status_code=http_status.HTTP_400_BAD_REQUEST,
                    detail="You have already joined this quest"
                )
        
        # Create new participation
        participant = QuestParticipant(
            quest_id=quest.id,
            user_id=current_user.id,
            status=QuestParticipantStatus.JOINED
        )
        db.add(participant)
        db.commit()
        
        logger.info(f"User {current_user.id} joined quest {quest.id}")
        return {"message": "Joined quest successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to join quest {quest_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to join quest: {str(e)}"
        )


@router.get("/{quest_id}/share-link", response_model=QuestShareResponse)
async def get_quest_share_link(
    quest_id: str = Path(..., description="Quest ID or slug"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get shareable link for a quest.
    
    Args:
        quest_id: Quest UUID or slug
        db: Database session
        current_user: Current authenticated user (optional)
        
    Returns:
        Share link and permission info
        
    Raises:
        HTTPException: If quest not found or user cannot share
    """
    try:
        # Try to find by ID first, then by slug
        try:
            quest_uuid = uuid.UUID(quest_id)
            quest = db.query(Quest).filter(Quest.id == quest_uuid).first()
        except ValueError:
            # Not a valid UUID, try slug
            quest = db.query(Quest).filter(Quest.slug == quest_id).first()
        
        if not quest:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Quest not found"
            )
        
        # Check permissions
        can_share = False
        if quest.visibility == QuestVisibility.PUBLIC:
            # Public quests can be shared by anyone
            can_share = True
        elif current_user and quest.creator_id == current_user.id:
            # Private quests can only be shared by creator
            can_share = True
        
        if not can_share:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to share this quest"
            )
        
        # Generate slug if it doesn't exist
        if not quest.slug:
            try:
                # Generate slug with quest ID to ensure uniqueness
                quest.slug = generate_slug(quest.title, quest.id)
                db.add(quest)
                db.commit()
                db.refresh(quest)
                logger.info(f"Generated slug for quest {quest.id}: {quest.slug}")
            except Exception as e:
                db.rollback()
                # If there's a unique constraint violation, try with full UUID
                if "unique" in str(e).lower() or "duplicate" in str(e).lower():
                    try:
                        # Use full UUID to ensure uniqueness
                        quest.slug = f"{generate_slug(quest.title, quest.id)}-{str(quest.id).replace('-', '')[:8]}"
                        db.add(quest)
                        db.commit()
                        db.refresh(quest)
                        logger.info(f"Generated unique slug for quest {quest.id}: {quest.slug}")
                    except Exception as e2:
                        db.rollback()
                        logger.error(f"Failed to generate slug for quest {quest.id}: {str(e2)}", exc_info=True)
                        raise HTTPException(
                            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to generate quest slug"
                        )
                else:
                    logger.error(f"Failed to generate slug for quest {quest.id}: {str(e)}", exc_info=True)
                    raise HTTPException(
                        status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to generate quest slug"
                    )
        
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        share_link = f"{base_url}/quest/{quest.slug}"
        
        return QuestShareResponse(
            share_link=share_link,
            can_share=can_share
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get share link for quest {quest_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get share link: {str(e)}"
        )


def _get_quest_by_id_or_slug(quest_id: str, db: Session) -> Optional[Quest]:
    """Resolve a quest by UUID or slug. Returns None if not found."""
    try:
        quest_uuid = uuid.UUID(quest_id)
        return db.query(Quest).filter(Quest.id == quest_uuid).first()
    except ValueError:
        return db.query(Quest).filter(Quest.slug == quest_id).first()


@router.patch("/{quest_id}", response_model=QuestResponse)
async def update_quest(
    quest_id: str = Path(..., description="Quest ID or slug"),
    quest_data: QuestUpdate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a quest. Only the creator can update.
    
    Args:
        quest_id: Quest UUID or slug
        quest_data: Fields to update (partial)
        db: Database session
        current_user: Current authenticated user
        
    Returns:
        Updated quest
        
    Raises:
        HTTPException: If quest not found or user is not the creator
    """
    quest = _get_quest_by_id_or_slug(quest_id, db)
    if not quest:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Quest not found"
        )
    if quest.creator_id != current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only the quest creator can update this quest"
        )

    update_dict = quest_data.model_dump(exclude_unset=True)
    if not update_dict:
        return build_quest_response(quest, db, current_user)

    if "title" in update_dict:
        quest.title = update_dict["title"]
        quest.slug = generate_slug(quest.title, quest.id)
    if "description" in update_dict:
        quest.description = update_dict["description"]
    if "radius_meters" in update_dict:
        quest.radius_meters = update_dict["radius_meters"]
    if "visibility" in update_dict:
        quest.visibility = update_dict["visibility"]
    if "photo_count" in update_dict:
        quest.photo_count = update_dict["photo_count"]
    if "lat" in update_dict and "lng" in update_dict:
        location = WKTElement(f"POINT({update_dict['lng']} {update_dict['lat']})", srid=4326)
        quest.location = location
    elif "lat" in update_dict or "lng" in update_dict:
        # Require both if updating location
        location_result = db.query(
            func.ST_X(text("quests.location::geometry")).label('lng'),
            func.ST_Y(text("quests.location::geometry")).label('lat')
        ).filter(Quest.id == quest.id).first()
        lng = update_dict.get("lng", float(location_result.lng))
        lat = update_dict.get("lat", float(location_result.lat))
        quest.location = WKTElement(f"POINT({lng} {lat})", srid=4326)

    try:
        db.commit()
        db.refresh(quest)
        return build_quest_response(quest, db, current_user)
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update quest {quest_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update quest: {str(e)}"
        )


@router.delete("/{quest_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_quest(
    quest_id: str = Path(..., description="Quest ID or slug"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a quest. Only the creator can delete.
    
    Args:
        quest_id: Quest UUID or slug
        db: Database session
        current_user: Current authenticated user
        
    Raises:
        HTTPException: If quest not found or user is not the creator
    """
    quest = _get_quest_by_id_or_slug(quest_id, db)
    if not quest:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Quest not found"
        )
    if quest.creator_id != current_user.id:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Only the quest creator can delete this quest"
        )
    try:
        db.delete(quest)
        db.commit()
        logger.info(f"Quest {quest.id} deleted by user {current_user.id}")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete quest {quest_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete quest: {str(e)}"
        )
