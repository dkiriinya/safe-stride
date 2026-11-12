# Deploying SafeStride with Dokploy (Local & Cloud) 🚀

This guide walks you through deploying **SafeStride** locally on your machine using [Dokploy](https://dokploy.com), an open-source, lightweight alternative to Vercel and Railway powered by Docker and Traefik.

---

## 📋 Prerequisites

1. **Docker Desktop** installed and running on your computer.
2. SafeStride repository pushed to GitHub: [https://github.com/dkiriinya/safe-stride](https://github.com/dkiriinya/safe-stride).

---

## 🛠️ Step 1: Install & Run Dokploy Locally

Run the Dokploy container using Docker. We map port `3005:3000` so Dokploy's management dashboard doesn't conflict with SafeStride on port `3000`:

```bash
docker run -d \
  --name dokploy \
  -p 3005:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v dokploy-data:/etc/dokploy \
  --restart unless-stopped \
  dokploy/dokploy:latest
```

*If you are using WSL2 (Ubuntu):*
```bash
curl -sSL https://dokploy.com/setup.sh | sh
```

---

## 🖥️ Step 2: Open Dokploy Dashboard

1. Open your browser and navigate to:
   **[http://localhost:3005](http://localhost:3005)** *(or [http://localhost:3000](http://localhost:3000) if using the default install script)*.
2. Create your initial local administrator credentials (email and password).

---

## 📦 Step 3: Deploy SafeStride in Dokploy

### 1. Create a New Project
- In the Dokploy sidebar, click **Projects** $\to$ **Create Project**.
- Name: `SafeStride`
- Description: `Runner Route Elevation & Safety Planner`

### 2. Add Service $\to$ Compose
SafeStride consists of two coordinated services:
- `web`: Next.js 15 App Router frontend & API engine
- `pathfinder`: Python FastAPI Multi-Objective A* microservice

In Dokploy:
1. Inside the `SafeStride` project, click **Add Service** and select **Compose**.
2. Service Name: `safestride-stack`.
3. Under **Source**, select **Git**:
   - **Repository URL**: `https://github.com/dkiriinya/safe-stride.git`
   - **Branch**: `main`
   - **Compose Path**: `docker-compose.yml`

### 3. Configure Environment Variables
Click on the **Environment** tab inside Dokploy and paste your environment keys:

```env
# Neon Database
DATABASE_URL="postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# AI Route Assistant
OPENROUTER_API_KEY="sk-or-v1-..."
GEMINI_API_KEY=""

# Optional Basemap Key
NEXT_PUBLIC_CARTO_API_KEY=""

# Internal Pathfinder Network URL
PATHFINDER_URL="http://pathfinder:8000"
```

### 4. Click Deploy
Click **Deploy** in the top-right corner:
- Dokploy will pull the code from GitHub.
- Dokploy will build both Docker images (`safestride-web` and `safestride-pathfinder`).
- Traefik and Docker will bring up both services with automatic health checks.

---

## 🌐 Step 4: Access Your Deployed Services

- **SafeStride App**: `http://localhost:3000` *(or the custom domain / port configured in Dokploy)*
- **Pathfinder Microservice Health**: `http://localhost:8001/health`
- **Pathfinder Interactive Swagger Docs**: `http://localhost:8001/docs`

---

## 🔄 Automatic Redeployment on Git Push
To have Dokploy automatically redeploy whenever you push new changes to GitHub:
1. In Dokploy, go to your service's **Deployments** tab.
2. Copy the **Webhook URL**.
3. In your GitHub repository:
   - Go to **Settings** $\to$ **Webhooks** $\to$ **Add webhook**.
   - Paste the Webhook URL.
   - Content type: `application/json`.
   - Trigger: `Just the push event`.
4. Now, every `git push origin main` will trigger an automated build and zero-downtime redeployment in Dokploy!
