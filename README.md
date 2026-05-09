# 🌊 Horizon Command — Maritime Crisis Operations Platform

A real-time maritime crisis operations platform for monitoring, coordinating, and responding to naval fleet operations in the Strait of Hormuz crisis zone.

![Platform](https://img.shields.io/badge/Platform-Maritime_Ops-06b6d4)
![Stack](https://img.shields.io/badge/Stack-Next.js_15_%7C_Express_%7C_PostgreSQL-blue)
![Status](https://img.shields.io/badge/Status-Production_Ready-10b981)

## 🚀 Quick Start

```bash
# Clone and start everything
cd maritime-ops
docker compose up --build
```

Open **http://localhost** in your browser.

### Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| **Command** | `admiral` | `command123` |
| **Captain** (Aurora) | `captain_aurora` | `captain123` |
| **Captain** (Borealis) | `captain_borealis` | `captain123` |
| **Captain** (any ship) | `captain_<shipname>` | `captain123` |

---

## 🏗 Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│   Browser    │────▶│    Nginx     │────▶│  Next.js   │
│   Client     │     │   :80       │     │   :3000    │
└──────┬───────┘     └──────┬───────┘     └────────────┘
       │                    │
       │ WebSocket          │ /api
       │                    ▼
       │             ┌──────────────┐
       └────────────▶│   Express    │
                     │   :4000     │
                     └──────┬───────┘
                            │
                     ┌──────┴───────┐
                     │              │
              ┌──────▼──┐   ┌──────▼──┐
              │ Postgres │   │  Redis  │
              │  :5432   │   │  :6379  │
              └──────────┘   └─────────┘
```

## ✨ Features

### Real-Time Ship Simulation
- 15 ships moving at realistic speeds through the Persian Gulf
- Haversine distance calculations, bearing computation
- 1Hz simulation tick with smooth interpolation
- Fuel consumption with weather penalties
- Automatic rerouting around restricted zones

### Interactive Maritime Map
- Dark nautical theme with CARTO dark basemap
- Glowing ship markers with heading rotation
- Animated routes and restricted zone polygons
- Port markers with labels
- Detailed ship popups (speed, fuel, ETA, cargo, weather, risk)

### Role-Based Access
- **Command**: Full fleet overview, draw restricted zones, issue directives, analytics
- **Captain**: Single-ship view, receive directives, send distress signals

### AI Distress Analysis
- Free-form distress messages analyzed by OpenAI (or rule-based fallback)
- Extracts: severity, incident type, injuries, damage estimate, recommendations
- Displayed in structured format with priority classification

### Weather Integration
- Real weather data from Open-Meteo API
- 30% fuel penalty in adverse weather
- Weather severity classification (calm → extreme)

### Alert System
- Geofence breach, collision risk, fuel shortage, distress, weather alerts
- Priority-based filtering and acknowledgement
- Toast notifications with animations

### Analytics Dashboard
- Fleet fuel metrics with Recharts
- Ship status distribution (pie chart)
- Fuel levels per ship (bar chart)
- Cargo distribution
- Real-time stats cards

### Playback Timeline
- 30-second resolution snapshots
- Last hour of history
- Scrubber, play/pause, skip controls
- Historical ship position replay

### Professional UI
- Military command center aesthetic
- Glassmorphism panels
- Animated transitions (Framer Motion)
- Command palette (Ctrl+K)
- Responsive layout

## 🛠 Tech Stack

### Frontend
- Next.js 15 (App Router, Standalone output)
- TypeScript
- TailwindCSS 3
- Framer Motion
- Zustand (state management)
- Socket.IO Client
- Leaflet (maps)
- Recharts (charts)
- Lucide React (icons)

### Backend
- Node.js + Express
- TypeScript
- Socket.IO
- Prisma ORM
- PostgreSQL 16
- Redis 7
- Turf.js (geospatial)
- OpenAI SDK
- Zod (validation)
- Winston (logging)

### Infrastructure
- Docker + Docker Compose
- Nginx reverse proxy
- Health checks
- Auto-migration & seeding

## 📁 Project Structure

```
maritime-ops/
├── docker-compose.yml
├── .env / .env.example
├── nginx/
│   └── nginx.conf
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   └── src/
│       ├── index.ts              # Entry point
│       ├── config/               # Configuration
│       ├── middleware/            # Auth middleware
│       ├── routes/               # REST API
│       ├── services/             # Geo, Weather, AI
│       ├── simulation/           # Ship simulation engine
│       └── websocket/            # Socket.IO handler
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app/                  # Next.js pages
│       ├── components/           # React components
│       │   ├── panels/           # Side panel views
│       │   ├── MapView.tsx       # Leaflet map
│       │   ├── TopBar.tsx        # Navigation header
│       │   └── ...
│       ├── hooks/                # Custom hooks
│       ├── store/                # Zustand store
│       └── lib/                  # Utilities
└── shared/
    └── types.ts                  # Shared TypeScript types
```

## 🗄 Database Schema

| Table | Purpose |
|-------|---------|
| `User` | Authentication & roles |
| `Ship` | Current ship state |
| `ShipHistory` | Historical position snapshots |
| `Alert` | System alerts |
| `RestrictedZone` | Geofenced areas |
| `Directive` | Command-to-captain orders |
| `DistressMessage` | Emergency signals + AI analysis |
| `WeatherSnapshot` | Cached weather data |
| `PlaybackSnapshot` | Timeline replay data |

## 🔑 API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Authenticate |
| GET | `/api/auth/me` | Yes | Verify token |
| GET | `/api/ships` | Yes | All ship data |
| GET | `/api/ships/:id` | Yes | Single ship |
| GET | `/api/alerts` | Yes | Recent alerts |
| GET | `/api/zones` | Yes | Restricted zones |
| GET | `/api/directives` | Yes | Directive orders |
| GET | `/api/distress` | Yes | Distress messages |
| GET | `/api/playback` | Yes | Historical data |
| GET | `/api/advisor` | Command | AI fleet advice |
| GET | `/api/weather/:id` | Yes | Ship weather |
| GET | `/api/ports` | Yes | Port locations |

## 📡 WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `ships:update` | Server → Client | Fleet position update |
| `alert:new` | Server → Client | New alert |
| `zone:created` | Both | Restricted zone added |
| `zone:delete` | Client → Server | Remove zone |
| `directive:issue` | Client → Server | Issue command |
| `directive:respond` | Client → Server | Accept/reject |
| `distress:send` | Client → Server | Distress signal |
| `proximity:warning` | Server → Client | Collision risk |
| `analytics:update` | Server → Client | Fleet stats |
| `playback:snapshot` | Server → Client | History data |

## ⚙️ Configuration

Set in `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI key (optional) | Empty (uses fallback) |
| `JWT_SECRET` | JWT signing secret | Auto-generated |
| `POSTGRES_*` | Database credentials | `horizon` / `horizon_secret` |

## 📝 License

MIT
