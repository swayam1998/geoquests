# High-Level Design (HLD)

## Product Overview

**GeoQuests** is a location-based platform where users create and complete photo quests at specific real-world locations.

### Value Proposition

| Emotional Value | Practical Value |
|-----------------|-----------------|
| Share meaningful places with friends | Check queue lengths before going |
| Discover hidden gems in your city | See real-time conditions (trails, beaches) |
| Challenge friends with scavenger hunts | Verify if places are open/available |
| Explore and earn badges | Crowd-sourced, verified information |
| *"Have fun, go outside"* | *"Get real answers, save time"* |

### Core User Journeys

1. **Explorer**: Open app → See map → Find quest → Travel → Take photo → Complete
2. **Creator**: Open app → Tap create → Set location → Describe quest → Share
3. **Practical User**: Need info → Create quest → Someone nearby completes it → Get verified photo

---

## System Architecture Overview

```mermaid
flowchart TB
    subgraph clients ["🖥️ Client Layer"]
        web["Web App<br/>(Next.js 14)"]
        pwa["Mobile PWA<br/>(Future)"]
    end

    subgraph gateway ["🚪 API Gateway"]
        api["FastAPI<br/>(Python)"]
        ws["WebSocket<br/>(Real-time)"]
    end

    subgraph services ["⚙️ Service Layer"]
        auth["Auth<br/>Service"]
        quest["Quest<br/>Service"]
        submission["Submission<br/>Service"]
        social["Social<br/>Service"]
        event["Event<br/>Service"]
        payment["Payment<br/>Service"]
        notification["Notification<br/>Service"]
    end

    subgraph ai ["🤖 AI Agent Layer"]
        validator["Quest Validator<br/>Privacy + Safety"]
        processor["Photo Processor<br/>Face Blur"]
        matcher["Content Matcher<br/>Vision AI"]
        quality["Quality Checker<br/>Blur Detection"]
    end

    subgraph data ["💾 Data Layer"]
        pg[("PostgreSQL<br/>+ PostGIS")]
        r2[("Cloudflare R2<br/>Images")]
    end

    subgraph external ["🌐 External Services"]
        stripe["Stripe<br/>Connect"]
        mapbox["Mapbox"]
        openai["OpenAI<br/>GPT-4 + Vision"]
        osm["OpenStreetMap"]
    end

    %% Client connections
    web --> api
    pwa --> api
    web --> ws
    pwa --> ws

    %% API to Services
    api --> auth
    api --> quest
    api --> submission
    api --> social
    api --> event
    api --> payment

    %% Services to AI
    quest --> validator
    submission --> processor
    submission --> matcher
    submission --> quality

    %% AI to External
    validator --> openai
    validator --> osm
    matcher --> openai

    %% Services to Data
    auth --> pg
    quest --> pg
    submission --> pg
    submission --> r2
    social --> pg
    event --> pg
    payment --> pg
    notification --> pg

    %% Services to External
    payment --> stripe
    web --> mapbox

    %% Styling
    classDef clientStyle fill:#e1f5fe,stroke:#01579b
    classDef serviceStyle fill:#f3e5f5,stroke:#4a148c
    classDef aiStyle fill:#fff3e0,stroke:#e65100
    classDef dataStyle fill:#e8f5e9,stroke:#1b5e20
    classDef externalStyle fill:#fce4ec,stroke:#880e4f

    class web,pwa clientStyle
    class auth,quest,submission,social,event,payment,notification serviceStyle
    class validator,processor,matcher,quality aiStyle
    class pg,r2 dataStyle
    class stripe,mapbox,openai,osm externalStyle
```

## Layer Descriptions

### 1. Client Layer
| Component | Technology | Purpose |
|-----------|------------|---------|
| Web App | Next.js 14 (App Router) | Main web interface with SSR |
| Mobile PWA | Progressive Web App | Future mobile-first experience |

**Key Features:**
- Mapbox GL JS for interactive quest map
- Browser MediaDevices API for GPS-locked camera
- Geolocation API for position verification
- Stripe Elements for payments
- Real-time updates via WebSocket

### 2. API Gateway
| Component | Purpose |
|-----------|---------|
| FastAPI | REST API endpoints, request validation, auth middleware |
| WebSocket | Real-time updates (quest completions, friend activity, notifications) |

**Endpoints Overview:**
```
/api/auth/*         → Authentication (signup, login, OAuth)
/api/quests/*       → Quest CRUD, nearby search, chains
/api/submissions/*  → Photo upload, verification status
/api/social/*       → Friends, activity feed, sharing
/api/events/*       → Challenges, competitions, badges
/api/payments/*     → Checkout creation, webhooks
/api/users/*        → Profile, stats, badges
```

### 3. Service Layer

| Service | Responsibilities |
|---------|-----------------|
| **Auth Service** | `fastapi-users` library with JWT tokens, Google OAuth, magic link (passwordless email) |
| **Quest Service** | Create/list/search quests, geospatial queries, quest chains |
| **Submission Service** | Image upload, verification orchestration |
| **Social Service** | Friends, follows, activity feed, sharing |
| **Event Service** | Challenges, competitions, badge assignment |
| **Payment Service** | Stripe Connect, paid quest payments, payouts |
| **Notification Service** | Email, push notifications, in-app alerts |

### 4. AI Agent Layer

This is the **trust layer** - what verifies real-world presence.

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI AGENT PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  QUEST CREATION                         QUEST COMPLETION        │
│  ──────────────                         ────────────────        │
│                                                                 │
│  ┌─────────────────┐                    ┌─────────────────┐     │
│  │ Quest Validator │                    │ Photo Processor │     │
│  │                 │                    │                 │     │
│  │ • Is location   │                    │ • GPS within    │     │
│  │   public?       │                    │   radius?       │     │
│  │ • Privacy       │                    │ • Detect faces  │     │
│  │   check?        │                    │ • Auto-blur     │     │
│  │ • Content       │                    │ • Add watermark │     │
│  │   policy OK?    │                    │   (if paid)     │     │
│  └────────┬────────┘                    └────────┬────────┘     │
│           │                                      │              │
│           ▼                                      ▼              │
│  ┌─────────────────┐                    ┌─────────────────┐     │
│  │ OpenStreetMap   │                    │ Content Matcher │     │
│  │ Location Check  │                    │                 │     │
│  └─────────────────┘                    │ Vision AI:      │     │
│                                         │ "Does photo     │     │
│                                         │  match quest    │     │
│                                         │  description?"  │     │
│                                         └─────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Agent | Input | Output | Technology |
|-------|-------|--------|------------|
| **Quest Validator** | Title, description, location | SAFE/UNSAFE verdict | GPT-4 + OSM |
| **Photo Processor** | Raw image bytes | Blurred faces, watermark | MediaPipe + OpenCV |
| **Content Matcher** | Image + description | Match score (0-100%) | GPT-4 Vision |
| **Quality Checker** | Image | Quality score, blur detection | OpenCV |

### 5. Data Layer

| Store | Purpose | Key Features |
|-------|---------|--------------|
| **PostgreSQL + PostGIS** | Primary database | Geospatial indexing, ACID compliance |
| **Cloudflare R2** | Image storage | S3-compatible, zero egress fees, global CDN |

**PostGIS Magic - Find Quests Near Me:**
```sql
SELECT *, ST_Distance(location, ST_MakePoint(lng, lat)::geography) as distance
FROM quests
WHERE ST_DWithin(location, ST_MakePoint(lng, lat)::geography, 10000)
  AND status = 'active'
ORDER BY distance;
```

### 6. External Services

| Service | Purpose | Integration |
|---------|---------|-------------|
| **Stripe Connect** | Paid quest payments | Platform takes 20%, explorer gets 80% |
| **Mapbox** | Map rendering | GL JS for web, custom quest markers |
| **OpenAI** | AI processing | GPT-4 for text, Vision for images |
| **OpenStreetMap** | Location data | Overpass API for place type lookup |

---

## Quest Types & Flows

### Social Quest (Free)

```mermaid
sequenceDiagram
    participant C as Creator
    participant API as GeoQuests
    participant E as Explorer

    C->>API: Create quest (free)
    Note right of C: "Find this ramen spot!"
    API->>API: Validate (safety check)
    API-->>C: Quest live! Share link

    C->>E: Share quest link
    E->>API: View quest
    E->>E: Travel to location
    E->>API: Submit photo
    API->>API: Verify GPS + content
    API-->>E: ✅ Quest complete! Badge earned
    API-->>C: Notification: "Friend completed your quest!"
```

### Paid Quest

```mermaid
sequenceDiagram
    participant C as Creator
    participant API as GeoQuests
    participant E as Explorer

    C->>API: Create quest ($15)
    API->>API: Validate + hold payment info
    API-->>C: Quest live!

    E->>API: Discover quest on map
    E->>E: Travel to location
    E->>API: Submit photo
    API->>API: Verify GPS + content + blur faces
    API-->>E: Photo verified!

    API-->>C: "Verified photo ready - pay to unlock"
    C->>API: Pay $15
    API-->>E: $12 payout (80%)
    API-->>C: Full photo unlocked
```

---

## Data Flow Summary

```mermaid
flowchart LR
    subgraph create ["Quest Creation"]
        C1[Creator] --> Q1[Create Quest]
        Q1 --> V1{AI Validate}
        V1 -->|Safe| L1[Quest Live]
        V1 -->|Unsafe| R1[Rejected]
    end

    subgraph complete ["Quest Completion"]
        E1[Explorer] --> D1[Discover Quest]
        D1 --> T1[Travel to Location]
        T1 --> S1[Submit Photo]
        S1 --> V2{Verify}
        V2 -->|Pass| C2[Complete!]
        V2 -->|Fail| F1[Rejected]
    end

    subgraph reward ["Rewards"]
        C2 --> B1[Badge Earned]
        C2 --> P1{Paid Quest?}
        P1 -->|Yes| M1[Payment Flow]
        P1 -->|No| N1[Notify Creator]
    end

    L1 --> E1
```

---

## Deployment Architecture

```mermaid
flowchart LR
    subgraph railway ["Railway"]
        next["Next.js<br/>Frontend"]
        fastapi["FastAPI<br/>Backend"]
        pg[("PostgreSQL<br/>+ PostGIS")]
    end

    subgraph cloudflare ["Cloudflare"]
        r2["R2<br/>Image Storage"]
    end

    subgraph external ["External APIs"]
        stripe["Stripe"]
        openai["OpenAI"]
        mapbox["Mapbox"]
        resend["Resend<br/>(Email)"]
    end

    next --> fastapi
    fastapi --> pg
    fastapi --> r2
    fastapi --> stripe
    fastapi --> openai
    fastapi --> resend
    next --> mapbox
```

**MVP Stack:**
- **Frontend**: Railway (Next.js)
- **Backend**: Railway (FastAPI)
- **Database**: Railway PostgreSQL (managed, includes PostGIS)
- **Images**: Cloudflare R2 (zero egress fees)
- **Email**: Resend (magic link emails)

**Local Development:** Docker Compose for PostgreSQL + PostGIS

**Estimated Cost:** ~$10-15/month

---

## Key Differences: Social vs Paid Quests

| Aspect | Social Quest | Paid Quest |
|--------|--------------|------------|
| **Cost** | Free | Creator sets price |
| **Visibility** | Friends only or public | Public (marketplace) |
| **Verification** | GPS + basic content | GPS + Vision AI + face blur |
| **Reward** | Badge + XP | Money (80% to explorer) |
| **Photo Access** | Immediate | Pay-to-unlock |
| **Use Case** | Friends, memories, fun | Business, real estate, travel |
