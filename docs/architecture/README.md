# GeoQuests - Architecture Documentation

## 🎯 What is GeoQuests?

A platform for creating and completing **real-world quests** - location-based challenges that require physical presence and verified photo submissions.

### Quest Types

| Type | Description | Reward |
|------|-------------|--------|
| **Social Quest** | Friend challenges ("Find this dish I loved!") | Badges, memories |
| **Paid Quest** | Verified photo requests | Money (80% to explorer) |
| **Challenge** | Platform-wide competitions | Badges, prizes, XP |
| **Chain Quest** | Multi-location adventures | Completion badges |

### Key Stakeholders

| Role | Description |
|------|-------------|
| **Quest Creator** | Creates quests at specific locations |
| **Explorer** | Completes quests by visiting & photographing |
| **Platform** | Verifies submissions, handles payments |

## 📐 Architecture Diagrams

| Diagram | Description | Link |
|---------|-------------|------|
| **HLD** | High-level system architecture | [View](./01-hld.md) |
| **LLD** | Component-level design | [View](./02-lld.md) |
| **ERD** | Database schema | [View](./03-erd.md) |
| **Quest Creation** | Sequence diagram | [View](./sequences/01-quest-creation.md) |
| **Quest Completion** | Sequence diagram | [View](./sequences/02-quest-completion.md) |
| **Payment Flow** | Sequence diagram | [View](./sequences/03-payment-flow.md) |
| **Challenge Entry** | Sequence diagram | [View](./sequences/04-challenge-entry.md) |

## 🛠️ Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Frontend** | Next.js 14 (App Router) | SSR, great DX, React ecosystem |
| **Backend** | FastAPI (Python) | Async, typed, ML/image processing libs |
| **Database** | PostgreSQL + PostGIS | Geospatial queries at scale |
| **Auth** | Custom (httpx-oauth, python-jose, resend) | OAuth + Magic Link, full control |
| **Email** | Resend (free tier: 3,000/month) | Magic link emails, high deliverability |
| **Cache** | Redis | Sessions, rate limiting, real-time |
| **Storage** | Cloudflare R2 | Cheap egress for images |
| **AI** | OpenAI GPT-4 + Vision | Content validation, matching |
| **Payments** | Stripe Connect | Marketplace split payments |
| **Maps** | Mapbox GL JS | Beautiful, fast map rendering |

### Authentication Libraries

| Library | Purpose |
|---------|---------|
| **httpx-oauth** | OAuth 2.0 client (Google, GitHub, etc.) |
| **python-jose[cryptography]** | JWT token encoding/decoding |
| **resend** | Email sending (magic links) |
| **itsdangerous** | Secure token generation for magic links |
| **sqlalchemy** | ORM for database models |
| **alembic** | Database migrations |

## 🔑 Key Concepts

### The Trust Layer (Our Moat)

What makes GeoQuests different from just sharing photos:

```
┌─────────────────────────────────────────────────────────────┐
│                    VERIFICATION PIPELINE                     │
├─────────────────────────────────────────────────────────────┤
│  1. GPS Lock      → Browser Geolocation API                 │
│  2. Timestamp     → Captured "just now" (no old photos)     │
│  3. Face Blur     → MediaPipe auto-detects & blurs          │
│  4. Content Match → Vision AI confirms photo = description  │
│  5. EXIF Cross-ref→ Embedded metadata validation            │
└─────────────────────────────────────────────────────────────┘
```

### Quest Flow Overview

```
SOCIAL QUEST (Free)                    PAID QUEST
─────────────────                      ──────────
Creator posts quest                    Creator posts quest + payment
       ↓                                      ↓
Explorer sees quest                    Explorer sees quest
       ↓                                      ↓
Visits location                        Visits location
       ↓                                      ↓
Captures verified photo                Captures verified photo
       ↓                                      ↓
Quest complete! 🎉                     Creator reviews preview
Badge earned                                  ↓
                                       Creator pays to unlock
                                              ↓
                                       Explorer receives 80%
                                       Full photo delivered
```

### Safety First

- **Quest Validation**: AI rejects requests for private locations, specific people, or anything enabling stalking
- **Face Auto-Blur**: All faces detected are automatically blurred
- **Public Places**: Cross-referenced with OpenStreetMap data

## 📊 How to View These Diagrams

These diagrams use **Mermaid** syntax and render automatically:

1. **GitHub**: Just open the `.md` file in GitHub
2. **VS Code**: Install "Markdown Preview Mermaid Support" extension, then `Cmd+Shift+V`
3. **Online**: Copy mermaid code to [mermaid.live](https://mermaid.live)

## 🚀 MVP Scope

### Phase 1: Core Flow (Week 1-2)
- [ ] Map with quest creation
- [ ] Basic submission flow
- [ ] Friend sharing

### Phase 2: Trust Layer (Week 2-3)
- [ ] In-browser GPS-locked camera
- [ ] AI verification pipeline
- [ ] Face detection + blur

### Phase 3: Social (Week 3-4)
- [ ] Friend connections
- [ ] Private quests
- [ ] Activity feed

### Phase 4: Payments (Week 4-5)
- [ ] Stripe Connect integration
- [ ] Pay-to-unlock flow
- [ ] Explorer payouts

### Phase 5: Gamification (Week 5+)
- [ ] Challenges & events
- [ ] Badges & XP
- [ ] Leaderboards
