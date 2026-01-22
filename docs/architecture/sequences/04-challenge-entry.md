# Sequence Diagram: Challenge & Event Entry Flow

## Overview

This diagram shows how users participate in platform-wide **Challenges** and **Events** - competitive or themed quests that award special badges, prizes, and recognition.

## Challenge Types

| Type | Duration | Example |
|------|----------|---------|
| **Challenge** | 1-4 weeks | "Golden Hour Challenge - Best sunset" |
| **Flash** | 1-6 hours | "Rainbow Alert! First 20 photos win" |
| **Seasonal** | 1-3 months | "Cherry Blossom Season 2026" |
| **Sponsored** | Varies | "Fujifilm Photo Contest" |

## Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant W as Web App<br/>(Next.js)
    participant A as API<br/>(FastAPI)
    participant PP as Photo<br/>Processor
    participant CM as Content<br/>Matcher
    participant R2 as Cloudflare<br/>R2
    participant DB as PostgreSQL
    participant N as Notification

    Note over U,N: 📢 STEP 1: Discover Active Challenges

    U->>W: Navigate to /challenges
    W->>A: GET /api/v1/events?status=active
    A->>DB: SELECT active events
    DB-->>A: Event list
    A-->>W: Events data

    W->>W: Display challenge cards
    Note right of W: 🌅 Golden Hour Challenge<br/>📍 Worldwide<br/>⏰ Ends: Jan 31<br/>🏆 Winner badge + 1000 XP<br/>📸 892 entries

    Note over U,N: 📋 STEP 2: View Challenge Details

    U->>W: Tap challenge card
    W->>A: GET /api/v1/events/{id}
    A-->>W: Challenge details + rules

    W->>W: Display challenge page
    Note right of W: RULES:<br/>• Capture sunrise or sunset<br/>• Max 3 entries per user<br/>• AI judges composition<br/><br/>PRIZES:<br/>🥇 1st: Badge + 1000 XP<br/>🥈 2-10: Badge + 500 XP<br/>🥉 11-50: 100 XP<br/><br/>YOUR ENTRIES: 0/3

    Note over U,N: 📸 STEP 3: Capture Entry

    U->>W: Click "Enter Challenge"
    W->>W: Open camera
    Note right of W: Same GPS-locked camera<br/>(no specific location required<br/>unless challenge has bounds)

    U->>W: Capture sunset photo
    U->>W: Click "Submit Entry"

    Note over U,N: 🚀 STEP 4: Process Entry

    W->>A: POST /api/v1/events/{id}/entries
    Note right of W: multipart/form-data

    A->>DB: Check entry count
    DB-->>A: User has 1 entry

    alt Max entries reached
        A-->>W: 400 "Limit reached"
        W-->>U: ❌ "You've used all 3 entries"
    else Can submit
        A->>A: Continue processing
    end

    par Face Blur
        A->>PP: process(image)
        PP-->>A: Blurred image
    and AI Scoring
        A->>CM: score_for_challenge(image, rules)
        Note right of CM: Scoring criteria:<br/>• Composition: 85<br/>• Theme match: 92<br/>• Quality: 88<br/>• Creativity: 78
        CM-->>A: Scores
    end

    A->>R2: Upload processed image
    R2-->>A: Image URL

    A->>DB: INSERT event_entry
    Note right of A: ai_score = 86<br/>submitted_at = now()

    A-->>W: 201 Entry submitted
    Note left of A: {<br/>  entry_id: "...",<br/>  ai_score: 86,<br/>  current_rank: 47<br/>}

    W-->>U: ✅ "Entry submitted!"
    W->>W: Show rank estimate
    Note right of W: 📊 Your Score: 86<br/>📍 Current Rank: #47<br/>🎯 Top 6%

    Note over U,N: 🏆 STEP 5: Challenge Ends

    Note over A,DB: (Background job at end_time)

    A->>DB: Calculate final rankings
    A->>DB: UPDATE entries SET rank = ...

    loop For each winner tier
        A->>DB: Award badges
        A->>DB: Add XP rewards
        A->>N: Send notifications
    end

    N->>U: 🏆 "You placed #12!"
    Note right of N: Golden Hour Challenge<br/>Final Rank: #12<br/>+500 XP earned<br/>🥈 "Finalist" badge

    Note over U,N: 🎖️ STEP 6: View Results & Claim Rewards

    U->>W: Open notification
    W->>A: GET /api/v1/events/{id}/results
    A-->>W: Final results

    W->>W: Show results page
    Note right of W: 🏆 WINNERS<br/>1. @sunset_master (97)<br/>2. @golden_lens (95)<br/>3. @photo_pro (94)<br/>...<br/>12. You (86) ← 🥈 Badge!

    W->>W: Badge unlock animation
    Note right of W: 🎉 NEW BADGE!<br/>🥈 Golden Hour Finalist<br/>"Top 10 in Golden Hour<br/>Challenge 2026"
```

## AI Scoring System

### Scoring Criteria

```mermaid
flowchart LR
    subgraph input ["📸 Input"]
        img["Photo"]
        rules["Challenge Rules"]
    end

    subgraph scoring ["🎯 Scoring"]
        comp["Composition<br/>25%"]
        theme["Theme Match<br/>30%"]
        qual["Technical<br/>Quality 25%"]
        creat["Creativity<br/>20%"]
    end

    subgraph output ["📊 Output"]
        total["Final Score<br/>0-100"]
    end

    img --> comp
    img --> qual
    img --> creat
    rules --> theme

    comp --> total
    theme --> total
    qual --> total
    creat --> total
```

### GPT-4 Vision Scoring Prompt

```
You are judging a photo challenge.

CHALLENGE: Golden Hour Challenge
THEME: Capture the magic of sunrise or sunset
CRITERIA:
- Composition (framing, rule of thirds, leading lines)
- Theme Match (is this actually golden hour?)
- Technical Quality (focus, exposure, clarity)
- Creativity (unique perspective, artistic merit)

Score this image on each criterion (0-100).

Response:
{
  "composition": 85,
  "theme_match": 92,
  "quality": 88,
  "creativity": 78,
  "total": 86,
  "feedback": "Beautiful golden tones with good
   horizon placement. The silhouettes add depth.
   Could be more unique in perspective."
}
```

## Challenge Types Detail

### Standard Challenge

```
Duration: 1-4 weeks
Scope: Worldwide or regional
Judging: AI scoring + optional community vote
Entries: Multiple per user (typically 3)

Example: "Best Street Food Photo"
- Submit photos of street food
- AI scores on composition, appetizing factor
- Top 100 enter community voting
- Winners announced after voting
```

### Flash Event

```
Duration: 1-6 hours
Trigger: Weather, news, platform-initiated
Judging: First N to complete
Entries: 1 per user

Example: "Rainbow Alert - San Francisco!"
- Weather API detects rainbow
- Push notification to users in area
- First 20 verified photos win
- Rare "Rainbow Hunter" badge
```

### Seasonal Event

```
Duration: 1-3 months
Theme: Time-specific (cherry blossoms, fall colors)
Judging: AI + theme relevance
Special: Location bonuses, progression tiers

Example: "Cherry Blossom Season 2026"
- Active March 15 - April 30
- Bonus points in Japan, Korea, DC
- Tiers: 1 photo → badge, 5 photos → rare badge
- Weekly highlights featured
```

### Sponsored Challenge

```
Duration: Set by sponsor
Prize: Products, cash, experiences
Judging: Sponsor picks or hybrid
Branding: Sponsor logo, custom badges

Example: "Fujifilm × GeoQuests"
- "Show us the world in film tones"
- Grand prize: Fujifilm X100VI camera
- All entries get exclusive profile frame
- Sponsor reviews top 50 for winners
```

## API Endpoints

### List Active Challenges

```http
GET /api/v1/events?status=active
```

**Response:**
```json
{
  "events": [
    {
      "id": "golden-hour-2026",
      "type": "challenge",
      "title": "Golden Hour Challenge",
      "description": "Capture sunrise or sunset magic",
      "start_time": "2026-01-01T00:00:00Z",
      "end_time": "2026-01-31T23:59:59Z",
      "status": "active",
      "rewards": {
        "badges": [
          { "rank": 1, "badge_slug": "golden-hour-winner" },
          { "rank": [2, 10], "badge_slug": "golden-hour-finalist" }
        ],
        "xp": [
          { "rank": 1, "amount": 1000 },
          { "rank": [2, 10], "amount": 500 }
        ]
      },
      "stats": {
        "total_entries": 892,
        "my_entries": 1,
        "max_entries": 3
      }
    }
  ]
}
```

### Submit Entry

```http
POST /api/v1/events/{id}/entries
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

[image + metadata]
```

**Response:**
```json
{
  "entry_id": "880e8400-...",
  "ai_score": 86,
  "score_breakdown": {
    "composition": 85,
    "theme_match": 92,
    "quality": 88,
    "creativity": 78
  },
  "current_rank": 47,
  "percentile": "Top 6%",
  "entries_remaining": 2
}
```

### Get Results (After Challenge Ends)

```http
GET /api/v1/events/{id}/results
```

**Response:**
```json
{
  "event_id": "golden-hour-2026",
  "status": "completed",
  "total_entries": 1247,
  "winners": [
    {
      "rank": 1,
      "user": { "username": "sunset_master", "avatar": "..." },
      "score": 97,
      "image_url": "...",
      "prizes": ["🥇 Winner Badge", "1000 XP"]
    }
  ],
  "my_result": {
    "rank": 12,
    "score": 86,
    "percentile": "Top 1%",
    "prizes_earned": ["🥈 Finalist Badge", "500 XP"]
  }
}
```

## Real-time Leaderboard

During active challenges, the leaderboard updates in real-time:

```mermaid
sequenceDiagram
    participant U as User
    participant W as Web App
    participant WS as WebSocket
    participant A as API

    U->>W: View leaderboard
    W->>WS: Subscribe to event:{id}:leaderboard

    loop On new entries
        A->>WS: Publish update
        WS->>W: New rankings
        W->>W: Animate changes
    end

    U->>W: See live position
    Note right of W: Your rank: 47 → 45 → 42 ↗️
```

## Badge Tiers

| Tier | Criteria | Rarity |
|------|----------|--------|
| 🥇 Winner | Rank #1 | Legendary |
| 🥈 Finalist | Rank 2-10 | Epic |
| 🥉 Top 50 | Rank 11-50 | Rare |
| 🎖️ Participant | Any valid entry | Common |
| ⚡ Speed | First 10 entries | Uncommon |
