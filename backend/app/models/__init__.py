"""Database models."""
from app.models.user import User, OAuthAccount, MagicLinkToken
from app.models.quest import Quest, QuestVisibility, QuestStatus, QuestParticipant, QuestParticipantStatus
from app.models.submission import Submission, SubmissionStatus

__all__ = ["User", "OAuthAccount", "MagicLinkToken", "Quest", "QuestVisibility", "QuestStatus", "QuestParticipant", "QuestParticipantStatus", "Submission", "SubmissionStatus"]
