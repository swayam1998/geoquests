# Low-Level Design (LLD)

## Project Structure

```
geoquests/
├── docker-compose.yml            # Local development (PostgreSQL + PostGIS)
├── frontend/                     # Next.js 14 App
│   ├── Dockerfile
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (main)/
│   │   │   ├── page.tsx              # Landing/Home
│   │   │   ├── map/page.tsx          # Quest Discovery Map
│   │   │   ├── quest/
│   │   │   │   ├── create/page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   └── [id]/complete/page.tsx
│   │   │   ├── explore/page.tsx      # Nearby quests
│   │   │   ├── friends/page.tsx      # Social features
│   │   │   ├── challenges/page.tsx   # Events & competitions
│   │   │   ├── profile/[id]/page.tsx
│   │   │   └── activity/page.tsx     # Activity feed
│   │   ├── api/                      # API routes (if needed)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── map/
│   │   │   ├── MapView.tsx
│   │   │   ├── QuestMarker.tsx
│   │   │   └── LocationPicker.tsx
│   │   ├── quest/
│   │   │   ├── QuestCard.tsx
│   │   │   ├── QuestForm.tsx
│   │   │   ├── QuestPreview.tsx
│   │   │   └── QuestChain.tsx
│   │   ├── capture/
│   │   │   ├── CameraCapture.tsx
│   │   │   ├── GeoLocationLock.tsx
│   │   │   └── SubmissionPreview.tsx
│   │   ├── social/
│   │   │   ├── FriendList.tsx
│   │   │   ├── ActivityFeed.tsx
│   │   │   └── ShareModal.tsx
│   │   ├── payment/
│   │   │   ├── PaymentModal.tsx
│   │   │   └── StripeCheckout.tsx
│   │   ├── ui/                       # Shared UI components
│   │   └── layout/
│   ├── hooks/
│   │   ├── useGeolocation.ts
│   │   ├── useQuests.ts
│   │   ├── useCamera.ts
│   │   ├── useAuth.ts
│   │   ├── useFriends.ts
│   │   └── usePayment.ts
│   ├── lib/
│   │   ├── api.ts                    # API client
│   │   ├── mapbox.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
│
├── backend/                      # FastAPI Python App
│   ├── Dockerfile
│   ├── app/
│   │   ├── main.py                   # FastAPI app entry
│   │   ├── config.py                 # Environment config
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── deps.py               # Dependencies (auth, db)
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── quests.py
│   │   │       ├── submissions.py
│   │   │       ├── social.py
│   │   │       ├── events.py
│   │   │       ├── payments.py
│   │   │       └── users.py
│   │   ├── auth/                     # Custom auth module
│   │   │   ├── __init__.py
│   │   │   ├── jwt.py                # JWT token management
│   │   │   ├── oauth.py              # OAuth handlers (httpx-oauth)
│   │   │   ├── magic_link.py         # Magic link handlers
│   │   │   └── dependencies.py      # FastAPI dependencies (get_current_user)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── quest_service.py
│   │   │   ├── submission_service.py
│   │   │   ├── social_service.py
│   │   │   ├── event_service.py
│   │   │   ├── payment_service.py
│   │   │   └── email_service.py      # Magic link emails (Resend)
│   │   ├── agents/                   # AI Agent Layer
│   │   │   ├── __init__.py
│   │   │   ├── quest_validator.py
│   │   │   ├── photo_processor.py
│   │   │   ├── content_matcher.py
│   │   │   └── quality_checker.py
│   │   ├── models/                   # SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── quest.py
│   │   │   ├── submission.py
│   │   │   ├── payment.py
│   │   │   ├── friendship.py
│   │   │   ├── event.py
│   │   │   └── badge.py
│   │   ├── schemas/                  # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── quest.py
│   │   │   ├── submission.py
│   │   │   └── event.py
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── security.py
│   │       ├── storage.py            # R2 upload
│   │       └── geo.py                # Geospatial helpers
│   ├── tests/
│   ├── alembic/                      # DB migrations
│   └── requirements.txt
│
└── docs/
    └── architecture/                 # You are here!
```

---

## Frontend Components (Next.js)

```mermaid
flowchart TB
    subgraph pages ["📄 Pages (App Router)"]
        home["/ <br/> Landing"]
        map["/map <br/> Quest Map"]
        create["/quest/create <br/> Create Quest"]
        detail["/quest/[id] <br/> Quest Detail"]
        complete["/quest/[id]/complete <br/> Camera Capture"]
        explore["/explore <br/> Nearby Quests"]
        friends["/friends <br/> Social"]
        challenges["/challenges <br/> Events"]
        profile["/profile/[id] <br/> User Profile"]
        activity["/activity <br/> Feed"]
    end

    subgraph components ["🧩 Components"]
        subgraph mapComps ["Map"]
            MapView
            QuestMarker
            LocationPicker
        end
        subgraph questComps ["Quest"]
            QuestCard
            QuestForm
            QuestPreview
            QuestChain
        end
        subgraph captureComps ["Capture"]
            CameraCapture
            GeoLocationLock
            SubmissionPreview
        end
        subgraph socialComps ["Social"]
            FriendList
            ActivityFeed
            ShareModal
        end
        subgraph paymentComps ["Payment"]
            PaymentModal
            StripeCheckout
        end
    end

    subgraph hooks ["🪝 Hooks"]
        useGeolocation
        useQuests
        useCamera
        useAuth
        useFriends
        usePayment
    end

    %% Page to Component relationships
    map --> MapView
    map --> QuestMarker
    create --> LocationPicker
    create --> QuestForm
    detail --> QuestPreview
    detail --> PaymentModal
    complete --> CameraCapture
    complete --> GeoLocationLock
    friends --> FriendList
    activity --> ActivityFeed

    %% Component to Hook relationships
    MapView --> useQuests
    CameraCapture --> useCamera
    CameraCapture --> useGeolocation
    GeoLocationLock --> useGeolocation
    PaymentModal --> usePayment
    FriendList --> useFriends
```

### Key Component Details

#### `CameraCapture.tsx` - The Trust Component

```typescript
interface CameraCaptureProps {
  questId: string;
  questLocation: { lat: number; lng: number };
  radiusMeters: number;
  onCapture: (data: CaptureData) => void;
}

interface CaptureData {
  imageBlob: Blob;
  location: {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
  };
  deviceInfo: {
    userAgent: string;
    platform: string;
  };
}
```

**Responsibilities:**
1. Request camera permission (`MediaDevices.getUserMedia`)
2. Lock GPS position (`Geolocation.watchPosition`)
3. Validate user is within quest radius
4. Capture frame with embedded metadata
5. Prevent gallery upload (camera only)

#### `QuestCard.tsx` - Quest Display

```typescript
interface QuestCardProps {
  quest: Quest;
  variant: 'compact' | 'detailed';
  showDistance?: boolean;
  onComplete?: () => void;
}

interface Quest {
  id: string;
  title: string;
  description: string;
  location: { lat: number; lng: number };
  radiusMeters: number;
  type: 'social' | 'paid' | 'challenge' | 'chain';
  reward?: {
    type: 'badge' | 'money' | 'xp';
    value: number | string;
  };
  creator: User;
  status: 'active' | 'completed' | 'expired';
  completions: number;
  createdAt: Date;
}
```

#### `useGeolocation.ts` - Location Hook

```typescript
interface GeolocationState {
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null;
  isLoading: boolean;
  accuracy: number;
  isWithinRadius: (target: LatLng, radius: number) => boolean;
}

function useGeolocation(options?: PositionOptions): GeolocationState;
```

---

## Frontend UI Design

### Value Proposition

GeoQuests serves two types of user needs:

| Emotional | Practical |
|-----------|-----------|
| Share memories | Check queue lengths |
| Discover hidden gems | See real-time conditions |
| Challenge friends | Verify availability |
| Explore new places | Save time with crowd-sourced info |
| *"Have fun"* | *"Get answers"* |

### Home Screen (Map View)

The home screen is map-centric with a quest list and ideas carousel:

```
┌─────────────────────────────────────────────────────────────┐
│ ≡  GeoQuests                                    🔔  👤      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│            [         MAP         ]                          │
│                 📍    📍                                    │
│            📍            📍                                 │
│                  [YOU]                                       │
│                                                    ┌─────┐  │
│                                                    │  ➕ │  │
│                                                    └─────┘  │
├─────────────────────────────────────────────────────────────┤
│  [ 🔍 Search ]  [ 🌍 Country ▼ ]  [ 📍 Nearby ]            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ✨ Quest Ideas                                    See all → │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│  │  💝   │ │  ⏱️   │ │  🌅   │ │  🅿️   │   ───▶          │
│  │ Where  │ │ Queue  │ │ Sunrise│ │Parking │               │
│  │ We Met │ │ Check  │ │ Spot   │ │ Status │               │
│  └────────┘ └────────┘ └────────┘ └────────┘               │
│                                                              │
│  🔥 Top Quests                                     See all → │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🌅  Sunset at the Bridge           📍 2.1 km    →      ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ 🍜  Hidden Ramen Spot              📍 5.4 km    →      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Quest Categories

Quests use category icons instead of images for a clean, playful look:

| Category | Icon | Description |
|----------|------|-------------|
| Memories | 💝 | Personal, sentimental spots |
| Hidden Gems | ✨ | Local favorites, secret spots |
| Nature & Views | 🌅 🏔️ 🌊 | Outdoors, scenic locations |
| Food & Drink | 🍜 ☕ 🍕 | Culinary discoveries |
| Art & Culture | 🎨 🏛️ 🎭 | Street art, landmarks |
| Social & Fun | 🎉 🎈 💫 | Challenges, celebrations |
| Adventure | 🧗 🚴 🏃 | Physical challenges |
| **Practical** | 🛠️ ⏱️ 🅿️ | Queues, conditions, availability |

### Quest Ideas Carousel

Ideas are **randomly mixed** between emotional and practical to show the full range of possibilities:

**Emotional Ideas:**
| Idea | Icon | Description |
|------|------|-------------|
| Where We First Met | 💝 | Send someone to the spot where you first met |
| Secret Coffee Spot | ☕ | Share a cafe only locals know |
| Best Sunset View | 🌅 | Your favorite spot to watch the sunset |
| Street Art Hunt | 🎨 | Find amazing murals hidden in alleys |
| Childhood Playground | 🏠 | Share your favorite childhood spot |
| Hidden Waterfall | 🌊 | That nature spot you discovered by accident |
| Best Bench in Town | 🪑 | Sometimes it's just about sitting and watching |

**Practical Ideas:**
| Idea | Icon | Description |
|------|------|-------------|
| Queue Length Check | ⏱️ | See how long the line is before you go |
| Parking Situation | 🅿️ | Is there parking available? |
| Is it Crowded? | 👥 | Check how busy a place is right now |
| Trail Conditions | 🥾 | How muddy/clear is the hiking path? |
| Is it Open? | 🚪 | Verify if a place is actually open today |
| Beach Status | 🏖️ | Is it crowded? Clean? Safe to swim? |
| Food Truck Check | 🚚 | Is the food truck there today? |
| Construction Update | 🚧 | Is the road still blocked? |

### Quest Interactions

**Click Quest Marker on Map:**
```
User clicks 📍 marker
       │
       ▼
┌───────────────────────────────────────────────────────┐
│  🌅 Sunset at the Bridge                              │
│  📍 Brooklyn · 2.1 km away                            │
│                                                        │
│  "Capture the sunset view from the pedestrian bridge" │
│                                                        │
│  👤 @alex · ✅ 23 completions                         │
│                                                        │
│  [ 🚀 Start Quest ]                                   │
│                                                        │
│  [ 🗺️ Navigate ]              [ ↗️ Share ]           │
└───────────────────────────────────────────────────────┘
```

**Click Quest in List:**
```
User clicks quest in list
       │
       ├─→ Map pans to quest location
       ├─→ Quest marker highlights/pulses
       └─→ Quest preview modal opens
```

**Create Quest Button (➕ FAB):**
```
User clicks ➕
       │
       ├── Logged in? → Yes → Go to Create Quest
       │
       └── No → Show login modal → After login → Create Quest
```

### Location Strategy

| Scenario | Behavior |
|----------|----------|
| First visit (no login) | Detect country via IP, center map on country |
| User clicks "Nearby" | Request location permission |
| Permission granted | Show precise location, nearby quests |
| Permission denied | Fall back to country view |
| Logged-in user | Use saved home country or last viewed location |

### Quest List Design

Quest cards use category icons, not images:

```
┌─────────────────────────────────────────────────────────────┐
│ 🌅  Sunset at the Bridge              📍 Brooklyn          │
│     ⭐ 4.9 · 156 completions · 2.1 km                      │
├─────────────────────────────────────────────────────────────┤
│ ⏱️  DMV Queue Check                   📍 Manhattan         │
│     ⭐ 4.5 · 34 completions · 0.8 km                       │
├─────────────────────────────────────────────────────────────┤
│ 🍜  Hidden Ramen Spot                 📍 East Village      │
│     ⭐ 4.8 · 89 completions · 1.2 km                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Services (FastAPI)

```mermaid
flowchart TB
    subgraph api ["🚀 API Layer"]
        authRoute["/api/v1/auth"]
        questRoute["/api/v1/quests"]
        submissionRoute["/api/v1/submissions"]
        socialRoute["/api/v1/social"]
        eventRoute["/api/v1/events"]
        paymentRoute["/api/v1/payments"]
        userRoute["/api/v1/users"]
    end

    subgraph services ["⚙️ Service Layer"]
        AuthService
        QuestService
        SubmissionService
        SocialService
        EventService
        PaymentService
        NotificationService
    end

    subgraph agents ["🤖 AI Agents"]
        QuestValidator
        PhotoProcessor
        ContentMatcher
        QualityChecker
    end

    subgraph models ["📦 Data Models"]
        UserModel["User"]
        QuestModel["Quest"]
        SubmissionModel["Submission"]
        FriendshipModel["Friendship"]
        PaymentModel["Payment"]
        EventModel["Event"]
        BadgeModel["Badge"]
    end

    %% API to Service
    authRoute --> AuthService
    questRoute --> QuestService
    submissionRoute --> SubmissionService
    socialRoute --> SocialService
    eventRoute --> EventService
    paymentRoute --> PaymentService

    %% Service to Agent
    QuestService --> QuestValidator
    SubmissionService --> PhotoProcessor
    SubmissionService --> ContentMatcher
    SubmissionService --> QualityChecker

    %% Service to Model
    AuthService --> UserModel
    QuestService --> QuestModel
    SubmissionService --> SubmissionModel
    SocialService --> FriendshipModel
    PaymentService --> PaymentModel
    EventService --> EventModel
    EventService --> BadgeModel
```

### Authentication (Custom Implementation)

We use a custom authentication system built with FastAPI-compatible libraries:

| Feature | Library | Implementation |
|---------|---------|---------------|
| **Google OAuth** | `httpx-oauth` | OAuth 2.0 flow with Google |
| **Magic Link** | `resend` + `itsdangerous` | Passwordless email login |
| **JWT Tokens** | `python-jose[cryptography]` | Access + refresh token strategy |
| **Database** | `sqlalchemy` + `alembic` | User models and migrations |

**Auth Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/google/authorize` | Start Google OAuth flow |
| `GET` | `/auth/google/callback` | Google OAuth callback |
| `POST` | `/auth/magic-link` | Request magic link email |
| `POST` | `/auth/magic-link/verify` | Verify magic link token |
| `POST` | `/auth/refresh` | Refresh access token |
| `GET` | `/auth/me` | Get current user |
| `PATCH` | `/auth/me` | Update current user |

**Usage in endpoints:**

```python
from app.auth.dependencies import get_current_user

@router.post("/quests")
async def create_quest(
    data: QuestCreate,
    user: User = Depends(get_current_user),  # Requires login
):
    quest = Quest(creator_id=user.id, **data.dict())
    ...

@router.get("/quests/nearby")
async def get_nearby(lat: float, lng: float):
    # No auth = public endpoint
    ...
```

**Database Tables:**
- `users` - User accounts
- `oauth_accounts` - Linked OAuth provider accounts
- `magic_link_tokens` - One-time magic link tokens

### Service Details

#### `QuestService`

```python
class QuestService:
    async def create_quest(
        self,
        creator_id: UUID,
        data: QuestCreate
    ) -> Quest:
        """
        1. Validate with AI agent
        2. Create quest in DB
        3. Notify friends (if social quest)
        4. Return quest or rejection reason
        """

    async def get_nearby_quests(
        self,
        lat: float,
        lng: float,
        radius_km: float,
        quest_type: Optional[str] = None,
        friends_only: bool = False,
        user_id: Optional[UUID] = None
    ) -> List[QuestWithDistance]:
        """
        PostGIS query to find quests within radius
        Optionally filter by type or friends
        """

    async def create_quest_chain(
        self,
        creator_id: UUID,
        quests: List[QuestCreate],
        chain_name: str
    ) -> QuestChain:
        """
        Create multiple linked quests (trail/adventure)
        """

    async def get_friend_quests(
        self,
        user_id: UUID
    ) -> List[Quest]:
        """
        Get quests created by friends
        """
```

#### `SubmissionService`

```python
class SubmissionService:
    async def submit_quest_completion(
        self,
        explorer_id: UUID,
        quest_id: UUID,
        image: UploadFile,
        client_location: Location,
        client_timestamp: datetime
    ) -> Submission:
        """
        1. Verify GPS is within quest radius
        2. Process image (face blur)
        3. Match content with Vision AI
        4. Check quality
        5. For paid quests: create watermarked + full versions
        6. Store in R2
        7. Create submission record
        8. Award badges/XP
        9. Notify quest creator
        """

    async def get_user_completions(
        self,
        user_id: UUID
    ) -> List[QuestCompletion]:
        """
        Get all quests completed by user
        """
```

#### `SocialService`

```python
class SocialService:
    async def send_friend_request(
        self,
        from_user_id: UUID,
        to_user_id: UUID
    ) -> FriendRequest:
        """Send friend request"""

    async def accept_friend_request(
        self,
        request_id: UUID,
        user_id: UUID
    ) -> Friendship:
        """Accept and create friendship"""

    async def get_activity_feed(
        self,
        user_id: UUID,
        limit: int = 20,
        cursor: Optional[str] = None
    ) -> ActivityFeed:
        """
        Get friend activity:
        - Quest completions
        - New quests created
        - Badges earned
        """

    async def share_quest(
        self,
        quest_id: UUID,
        share_with: List[UUID]  # friend IDs
    ) -> None:
        """Share quest with specific friends"""
```

---

## AI Agent Layer

```mermaid
flowchart LR
    subgraph input ["📥 Input"]
        questInput["Quest Request"]
        photoInput["Photo + GPS"]
    end

    subgraph agents ["🤖 Agents"]
        subgraph questAgents ["Quest Validation"]
            locCheck["Location<br/>Checker"]
            privacyCheck["Privacy<br/>Analyzer"]
            policyCheck["Policy<br/>Checker"]
        end

        subgraph photoAgents ["Photo Processing"]
            gpsVerify["GPS<br/>Verifier"]
            faceBlur["Face<br/>Blur"]
            contentMatch["Content<br/>Matcher"]
            qualityCheck["Quality<br/>Checker"]
        end
    end

    subgraph output ["📤 Output"]
        questVerdict["SAFE / UNSAFE"]
        photoVerdict["VERIFIED + Score"]
    end

    questInput --> locCheck
    questInput --> privacyCheck
    questInput --> policyCheck

    locCheck --> questVerdict
    privacyCheck --> questVerdict
    policyCheck --> questVerdict

    photoInput --> gpsVerify
    photoInput --> faceBlur
    photoInput --> contentMatch
    photoInput --> qualityCheck

    gpsVerify --> photoVerdict
    faceBlur --> photoVerdict
    contentMatch --> photoVerdict
    qualityCheck --> photoVerdict
```

### `QuestValidator` - Safety Guard

```python
class QuestValidator:
    """
    Prevents inappropriate quests
    """

    async def validate(self, quest: QuestCreate) -> ValidationResult:
        # 1. Check location type via OpenStreetMap
        location_type = await self._check_location_type(
            quest.lat, quest.lng
        )

        if location_type.is_private:
            return ValidationResult(
                safe=False,
                reason="Private location detected"
            )

        # 2. Analyze text for inappropriate content
        llm_result = await self._analyze_with_llm(
            title=quest.title,
            description=quest.description,
            location_context=location_type
        )

        return llm_result
```

### `PhotoProcessor` - Face Blur Pipeline

```python
class PhotoProcessor:
    """
    Detects and blurs faces in photos
    """

    def __init__(self):
        self.face_detector = mediapipe.FaceDetection(
            model_selection=1,
            min_detection_confidence=0.5
        )

    def process(self, image_bytes: bytes) -> ProcessedImage:
        # 1. Decode image
        img = cv2.imdecode(np.frombuffer(image_bytes, np.uint8), cv2.IMREAD_COLOR)

        # 2. Detect faces
        faces = self._detect_faces(img)

        # 3. Blur each face
        for face in faces:
            img = self._blur_region(img, face.bbox)

        # 4. For paid quests, create watermarked version
        return ProcessedImage(
            full=self._encode(img),
            watermarked=self._add_watermark(img) if paid else None,
            faces_count=len(faces)
        )
```

### `ContentMatcher` - Vision AI

```python
class ContentMatcher:
    """
    Uses GPT-4 Vision to verify photo matches quest
    """

    async def match(
        self,
        image_bytes: bytes,
        quest_title: str,
        quest_description: str
    ) -> MatchResult:
        response = await openai.chat.completions.create(
            model="gpt-4-vision-preview",
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"""
                        Does this photo complete the quest?

                        QUEST: {quest_title}
                        DETAILS: {quest_description}

                        Score 0-100 and explain.
                        """
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"}
                    }
                ]
            }]
        )
        return self._parse_response(response)
```

---

## State Management

### Quest Status State Machine

```mermaid
stateDiagram-v2
    [*] --> draft: Creator starts

    draft --> validating: Submit
    validating --> rejected: AI flags issue
    validating --> active: AI approves

    rejected --> draft: Edit & resubmit

    active --> completed: Explorer completes (social)
    active --> pending_payment: Explorer completes (paid)
    active --> expired: Deadline passed

    pending_payment --> completed: Creator pays
    pending_payment --> expired: Payment timeout

    completed --> [*]
    expired --> [*]
```

### Quest Types

| Type | Flow | Reward |
|------|------|--------|
| `social` | Create → Complete → Badge | Badge + XP |
| `paid` | Create → Complete → Preview → Pay → Unlock | Money |
| `challenge` | Join → Complete → Rank | Badge + Prize |
| `chain` | Complete all locations → Bonus | Chain badge |

---

## API Endpoint Specifications

### Quests

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/quests` | Create quest | User |
| GET | `/quests` | List quests (with filters) | Public |
| GET | `/quests/nearby` | Geospatial search | Public |
| GET | `/quests/friends` | Friend's quests | User |
| GET | `/quests/{id}` | Get quest detail | Public |
| PATCH | `/quests/{id}` | Update quest | Owner |
| DELETE | `/quests/{id}` | Delete quest | Owner |
| POST | `/quests/{id}/complete` | Submit completion | User |
| POST | `/quests/chain` | Create quest chain | User |

### Social

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/social/friends` | Get friends list | User |
| POST | `/social/friends/request` | Send friend request | User |
| POST | `/social/friends/accept` | Accept request | User |
| GET | `/social/feed` | Activity feed | User |
| POST | `/social/share` | Share quest with friends | User |

### Submissions (Quest Completions)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/submissions` | Upload completion photo | User |
| GET | `/submissions/{id}` | Get submission | Owner/Creator |
| GET | `/submissions/{id}/preview` | Get watermarked preview | Quest Creator |
| GET | `/submissions/{id}/full` | Get full photo (after payment) | Quest Creator |

### Payments (Paid Quests Only)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/payments/checkout` | Create Stripe checkout | Quest Creator |
| POST | `/payments/webhook` | Stripe webhook | Stripe |
| GET | `/payments/{id}` | Get payment status | Owner |

---

## Security Considerations

```mermaid
flowchart TB
    subgraph threats ["⚠️ Threats"]
        spoof["GPS Spoofing"]
        fake["Fake Photos"]
        inappropriate["Inappropriate Content"]
        fraud["Payment Fraud"]
    end

    subgraph mitigations ["🛡️ Mitigations"]
        gpsCheck["Multi-signal GPS<br/>(Browser + EXIF + IP geo)"]
        aiVerify["Vision AI Content<br/>Matching"]
        contentMod["LLM Content<br/>Moderation"]
        stripeProtect["Stripe Fraud<br/>Protection"]
    end

    spoof --> gpsCheck
    fake --> aiVerify
    inappropriate --> contentMod
    fraud --> stripeProtect
```

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/auth/login` | 5 | 15 min |
| `/quests` (POST) | 20 | 1 hour |
| `/submissions` (POST) | 30 | 1 hour |
| `/quests/nearby` | 100 | 1 min |
| `/social/friends/request` | 20 | 1 hour |

---

## Local Development (Docker)

Docker Compose for local development with PostgreSQL + PostGIS:

```yaml
# docker-compose.yml
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: geoquests
      POSTGRES_USER: geoquests
      POSTGRES_PASSWORD: geoquests_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Run locally:**

```bash
# Start PostgreSQL
docker compose up -d

# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

**Environment variables (`.env`):**

```bash
# Database
DATABASE_URL=postgresql://geoquests:geoquests_dev@localhost:5432/geoquests

# Auth
SECRET_KEY=your-secret-key-change-in-production
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Cloudflare R2
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=geoquests-images
R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com

# Email (Resend) - Free tier: 3,000 emails/month
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@resend.dev  # Or noreply@geoquests.com after domain verification

# External APIs
OPENAI_API_KEY=sk-xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
MAPBOX_ACCESS_TOKEN=pk.xxxxx
```

---

## Deployment (Railway)

All services deployed on Railway:

| Service | Type | Notes |
|---------|------|-------|
| Frontend | Next.js | Auto-deployed from `frontend/` |
| Backend | FastAPI | Auto-deployed from `backend/` |
| Database | PostgreSQL | Railway managed, enable PostGIS extension |

**PostGIS Setup (run once after DB creation):**

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```
