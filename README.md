# SafeStride 🏃‍♂️🛡️

> **Run Where You Feel Safe & Confident**  
> An intelligent route planner for runners that balances distance, elevation effort, lighting, and pedestrian safety—with doorstep loops that always bring you back home.

---

## ✨ Features

- **🤖 AI Route Assistant & Multi-Stage Spatial Reasoning**:
  - Type what you want in plain English (e.g., *"5k recovery run at 8pm, keep it flat and lit"*, *"5k single way route avoiding busy streets"*, or click presets like *Night Safe*, *Hill Workout*, *Flat Recovery*, *5K Tempo*, and *5K One-Way*).
  - Live 5-stage reasoning indicator showing candidate sampling, CBD/highway exclusion, sidewalk continuity auditing, and elevation calibration.
  - Powered by OpenRouter (`google/gemini-2.0-flash-exp:free` / `openai/gpt-4o-mini`) with an intelligent local heuristic fallback.
- **🧭 Multi-Candidate Pedestrian Corridor Sampling**:
  - Evaluates up to **12 directional loop and one-way corridors** in parallel across OpenStreetMap pedestrian networks.
  - Scores candidates by target distance accuracy, intersection density, highway/trunk avoidance, and greenway/park coverage, surfacing **Favored Corridors** and **Avoided Zones** directly in the UI.
- **🔄 Closed-Loop & One-Way Modes**:
  - Toggle seamlessly between **Closed-Loop Doorstep Return** (returns right to your start marker) and **One-Way Point-to-Point** routing—both for AI-generated routes and manual multi-waypoint plotting.
  - Interactive waypoint markers (`S`, intermediate stops, `F`) with one-tap marker removal and automatic switching between AI and custom manual planning.
- **📍 Proximity-Biased Location Search**:
  - Location search automatically prioritizes the closest local places to your current coordinates (with distance tags like `1.2 km away`), avoiding distant false matches.
- **🛣️ 100% Real-Road Pedestrian Routing**:
  - Strictly snaps to and follows mapped OpenStreetMap footways, sidewalks, and residential streets via dual routing providers (`routing.openstreetmap.de/routed-foot` + OSRM pedestrian fallback).
  - Automatically avoids bodies of water, expressways, and impassable barriers.
- **📈 Interactive Elevation & Grade Scrubber**:
  - Scrub across your route to inspect real-time elevation changes, steepness grades, and total ascent.
- **⚠️ Hazard Detection & Safety Scoring**:
  - Identifies potential obstacles along your path (such as unlit street segments, high-speed crossings, or missing sidewalks) and displays them as interactive map caution markers.
- **⏱️ Adaptive Pace & Energy Estimates**:
  - Live duration and calorie estimates calculated across Easy (`6:30/km`), Steady (`5:30/km`), Tempo (`4:45/km`), and Fast (`4:15/km`) paces with uphill effort penalties.
- **💾 Route Library (Save, Load & Delete)**:
  - Persist, reload, and manage your favorite routes in a **Neon Serverless PostgreSQL** database (with automatic in-memory fallback when running offline).
- **🔐 Secure Authentication**:
  - Integrated with Clerk (`@clerk/nextjs`) for seamless user sign-in and profile management.
- **🌓 Dark / Light Mode**:
  - High-contrast dark basemap optimized for evening visibility, plus a clean daytime mode.

---

## 🛠️ Architecture & Tech Stack

```
 safe-stride/
 ├── web/                     # Next.js 15 (App Router) + React 19 Frontend & API
 │   ├── src/app/             # Landing page (/) & Planner (/planner)
 │   ├── src/components/      # MapCanvas, AI Assistant, Elevation Charts, Onboarding
 │   ├── src/server/routes/   # Hono API routes (/api/routes/plan, /api/ai/recommend, /api/saved-routes)
 │   ├── src/db/              # Drizzle ORM schema & Neon PostgreSQL connection
 │   └── src/store/           # Zustand state management (map-store.ts)
 ├── pathfinder/              # Python FastAPI Pathfinding Microservice
 │   ├── app/astar.py         # Multi-Objective A* search algorithm
 │   ├── app/scoring.py       # Safety, elevation grade, and effort scoring
 │   └── app/graph.py         # Road network graph generation & routing
 └── docker-compose.yml       # Production multi-container orchestration
```

### Stack Highlights:
- **Frontend**: Next.js 15, React 19, Tailwind CSS, MapLibre GL, Lenis Smooth Scroll, Lucide Icons
- **API Engine**: Hono running inside Next.js API routes with Zod validation
- **Database**: Neon Serverless PostgreSQL with Drizzle ORM
- **Authentication**: Clerk (`@clerk/nextjs`)
- **Routing Engine**: OSM `routed-foot` + OSRM Pedestrian (`/route/v1/foot/`) + Python Multi-Objective A* Pathfinder
- **AI Engine**: OpenRouter API (`google/gemini-2.0-flash-exp:free` / `openai/gpt-4o-mini`) + Context-Aware Heuristic Engine

---

## 🔌 API Overview

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/routes/plan` | `POST` | Computes a loop or point-to-point pedestrian route with elevation profile, safety score, hazards, and corridor metadata. |
| `/api/ai/recommend` | `POST` | Translates natural-language runner prompts into optimal distance, effort tolerance, safety strictness, and loop/one-way settings. |
| `/api/saved-routes` | `GET` / `POST` | Lists or saves a user's route to Neon PostgreSQL. |
| `/api/saved-routes/:id` | `DELETE` | Deletes a saved route by ID for the authenticated user. |

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/dkiriinya/safe-stride.git
cd safe-stride
```

### 2. Environment Variables
Copy `.env.example` to `web/.env.local` and add your keys:

```bash
cp .env.example web/.env.local
```

Required keys:
```env
# Neon PostgreSQL Database
DATABASE_URL="postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Clerk Authentication (https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# AI Route Assistant (OpenRouter or Gemini)
OPENROUTER_API_KEY="sk-or-v1-..."
GEMINI_API_KEY=""

# Optional Basemap (Carto Dark / Positron)
NEXT_PUBLIC_CARTO_API_KEY=""

# Pathfinder Microservice
PATHFINDER_URL="http://127.0.0.1:8001"
```

---

## 🐳 Running with Docker Compose (Recommended)

Run both the Next.js web application and the Python pathfinding microservice in containers with one command:

```bash
docker-compose up --build
```

- **Web App**: [http://localhost:3000](http://localhost:3000)
- **Pathfinder API Docs**: [http://localhost:8001/docs](http://localhost:8001/docs)

---

## 💻 Manual Local Development

### 1. Start the Pathfinder Microservice (Python)
```bash
cd pathfinder
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
python run.py
```
*Pathfinder will listen on `http://127.0.0.1:8001`.*

### 2. Start the Next.js Frontend (Node.js)
In a separate terminal:
```bash
cd web
npm install

# Push database schema to Neon
npx drizzle-kit push

# Start the development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

### Backend & API Tests:
```bash
# Test pathfinder Python microservice unit tests
cd pathfinder
pytest

# Test database & end-to-end plan routes
python test_e2e_neon.py
```

### Frontend Build Verification:
```bash
cd web
npm run build
```

---

## 📄 License
This project is licensed under the MIT License.
