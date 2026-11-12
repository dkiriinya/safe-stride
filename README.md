# SafeStride 🏃‍♂️🛡️

> **Run Where You Feel Safe & Confident**  
> An intelligent route planner for runners that balances distance, elevation effort, lighting, and pedestrian safety—with doorstep loops that always bring you back home.

---

## ✨ Features

- **🤖 AI Route Assistant**: Type what you want in plain English (e.g., *"5k recovery run at 8pm, keep it flat and lit"*, or click presets like *Night Safe*, *Hill Workout*, *5K Tempo*). Powered by OpenRouter and Gemini.
- **📍 Proximity-Biased Search**: Location search automatically prioritizes the closest local places to your current location (with tags like `1.2 km away` or `4.6 km away`), avoiding distant false matches.
- **🛣️ 100% Real-Road Pedestrian Routing**: All routes strictly snap to and follow mapped OpenStreetMap footways, sidewalks, and residential roads. Automatically avoids bodies of water (like dams and lakes), expressways, and impassable barriers.
- **🔄 Closed-Loop Doorstep Return**: Select a target distance (e.g., 5 km) and SafeStride generates a clean loop returning right to your start location.
- **📈 Interactive Elevation & Grade Scrubber**: Scrub across your route to see real-time elevation changes, steepness grades, and route ascent.
- **⚠️ Hazard Detection**: Identifies potential obstacles along your path (such as unlit street segments or missing sidewalks) before you head out.
- **⏱️ Adaptive Pace & Energy Estimates**: Live duration and calorie estimates calculated across Easy (6:30), Steady (5:30), Tempo (4:45), and Fast (4:15) paces with uphill effort penalties.
- **💾 Route Library**: Save and name your favorite routes to a Neon Serverless PostgreSQL database.
- **🔐 Secure Authentication**: Integrated with Clerk for seamless user sign-in and profile management.
- **🌓 Dark / Light Mode**: High-contrast dark basemap optimized for evening visibility, with a clean daytime mode.

---

## 🛠️ Architecture & Tech Stack

```
 safe-stride/
 ├── web/                     # Next.js 15 (App Router) + React 19 Frontend & API
 │   ├── src/app/             # Landing page (/) & Planner (/planner)
 │   ├── src/components/      # MapCanvas, AI Assistant, Elevation Charts, Onboarding
 │   ├── src/server/routes/   # Hono API routes (/api/routes/plan, /api/saved-routes)
 │   ├── src/db/              # Drizzle ORM schema & Neon PostgreSQL connection
 │   └── src/store/           # Zustand state management
 ├── pathfinder/              # Python FastAPI Pathfinding Microservice
 │   ├── app/astar.py         # Multi-Objective A* search algorithm
 │   ├── app/scoring.py       # Safety, elevation grade, and effort scoring
 │   └── app/graph.py         # Road network graph generation & routing
 └── docker-compose.yml       # Production multi-container orchestration
```

### Stack Highlights:
- **Frontend**: Next.js 15, React 19, Tailwind CSS, MapLibre GL, Lucide Icons
- **API Engine**: Hono running inside Next.js edge/node routes
- **Database**: Neon Serverless PostgreSQL with Drizzle ORM
- **Authentication**: Clerk (`@clerk/nextjs`)
- **Routing Engine**: Global OSRM Pedestrian (`/route/v1/foot/`) + Multi-Objective A* Pathfinder
- **AI Engine**: OpenRouter API (`google/gemini-2.0-flash-exp:free` / `openai/gpt-4o-mini`)

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
