"""User API routes."""
import logging
from fastapi import APIRouter, Depends, HTTPException, status as http_status, Path, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional
from uuid import UUID
from app.database import get_db
from app.auth.dependencies import get_current_user_optional
from app.schemas.user import UserResponse
from app.schemas.quest import QuestResponse
from app.models.user import User
from app.models.quest import Quest, QuestStatus, QuestVisibility
from app.models.quest import QuestParticipant, QuestParticipantStatus

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/users", tags=["users"])


def build_quest_response_simple(quest: Quest, db: Session) -> QuestResponse:
    """Build a simple QuestResponse without user-specific data."""
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
    
    # Build share link
    share_link = None
    if quest.slug:
        from app.config import settings
        base_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        share_link = f"{base_url}/quest/{quest.slug}"
    
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
        participant_count=participant_count,
        has_joined=None,  # Not checking for specific user
        start_date=quest.start_date,
        end_date=quest.end_date,
        status=quest.status.value,
        created_at=quest.created_at,
        updated_at=quest.updated_at
    )


@router.get("/{user_id}", response_model=dict)
async def get_user(
    user_id: str = Path(..., description="User ID"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get user profile with statistics.
    
    Args:
        user_id: User UUID
        db: Database session
        current_user: Current authenticated user (optional)
        
    Returns:
        User profile with statistics
        
    Raises:
        HTTPException: If user not found
    """
    try:
        try:
            user_uuid = UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID format"
            )
        
        user = db.query(User).filter(User.id == user_uuid).first()
        if not user:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get statistics
        quests_created_count = db.query(Quest).filter(Quest.creator_id == user.id).count()
        quests_joined_count = db.query(QuestParticipant).filter(
            QuestParticipant.user_id == user.id,
            QuestParticipant.status != QuestParticipantStatus.LEFT
        ).count()
        quests_completed_count = db.query(QuestParticipant).filter(
            QuestParticipant.user_id == user.id,
            QuestParticipant.status == QuestParticipantStatus.COMPLETED
        ).count()
        
        return {
            "id": user.id,
            "email": user.email,
            "display_name": user.display_name,
            "avatar_url": user.avatar_url,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "created_at": user.created_at,
            "updated_at": user.updated_at,
            "quests_created_count": quests_created_count,
            "quests_joined_count": quests_joined_count,
            "quests_completed_count": quests_completed_count,
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user: {str(e)}"
        )


@router.get("/{user_id}/quests/created", response_model=List[QuestResponse])
async def get_user_created_quests(
    user_id: str = Path(..., description="User ID"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of quests to return"),
    offset: int = Query(0, ge=0, description="Number of quests to skip")
):
    """Get quests created by a user.
    
    Args:
        user_id: User UUID
        db: Database session
        current_user: Current authenticated user (optional)
        limit: Maximum number of quests to return
        offset: Number of quests to skip
        
    Returns:
        List of quests created by user
        
    Raises:
        HTTPException: If user not found
    """
    try:
        try:
            user_uuid = UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID format"
            )
        
        user = db.query(User).filter(User.id == user_uuid).first()
        if not user:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get quests created by user
        quests = db.query(Quest).filter(
            Quest.creator_id == user.id
        ).order_by(Quest.created_at.desc()).offset(offset).limit(limit).all()
        
        result = []
        for quest in quests:
            try:
                result.append(build_quest_response_simple(quest, db))
            except Exception as e:
                logger.error(f"Error converting quest {quest.id} to response: {str(e)}", exc_info=True)
                continue
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch created quests for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch created quests: {str(e)}"
        )


@router.get("/{user_id}/quests/joined", response_model=List[dict])
async def get_user_joined_quests(
    user_id: str = Path(..., description="User ID"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of quests to return"),
    offset: int = Query(0, ge=0, description="Number of quests to skip")
):
    """Get quests joined by a user.
    
    Args:
        user_id: User UUID
        db: Database session
        current_user: Current authenticated user (optional)
        limit: Maximum number of quests to return
        offset: Number of quests to skip
        
    Returns:
        List of quests joined by user with join info
        
    Raises:
        HTTPException: If user not found
    """
    try:
        try:
            user_uuid = UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID format"
            )
        
        user = db.query(User).filter(User.id == user_uuid).first()
        if not user:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get quest participations
        participations = db.query(QuestParticipant).filter(
            QuestParticipant.user_id == user.id,
            QuestParticipant.status != QuestParticipantStatus.LEFT
        ).order_by(QuestParticipant.joined_at.desc()).offset(offset).limit(limit).all()
        
        result = []
        for participation in participations:
            try:
                quest = db.query(Quest).filter(Quest.id == participation.quest_id).first()
                if not quest:
                    continue
                
                quest_response = build_quest_response_simple(quest, db)
                result.append({
                    **quest_response.model_dump(),
                    "joined_at": participation.joined_at,
                    "participation_status": participation.status.value
                })
            except Exception as e:
                logger.error(f"Error converting quest {participation.quest_id} to response: {str(e)}", exc_info=True)
                continue
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch joined quests for user {user_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch joined quests: {str(e)}"
        )
