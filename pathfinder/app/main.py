import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .models import RouteRequest, RouteResponse
from .graph import get_network_graph
from .astar import plan_route

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("safestride.api")

app = FastAPI(
    title="SafeStride Pathfinding Microservice",
    description="Multi-Objective A* routing engine optimizing for elevation effort and pedestrian safety.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "safestride-pathfinder",
        "version": "1.0.0"
    }


@app.post("/route", response_model=RouteResponse)
def calculate_route(req: RouteRequest):
    logger.info(
        "Route request received: start=%s, end=%s, alpha=%.2f, beta=%.2f, targetKm=%s",
        req.startCoords, req.endCoords, req.effortTolerance, req.safetyStrictness, req.targetDistanceKm
    )
    try:
        center_lat = (req.startCoords[0] + req.endCoords[0]) / 2.0
        center_lng = (req.startCoords[1] + req.endCoords[1]) / 2.0
        
        radius_km = 4.0
        if req.targetDistanceKm:
            radius_km = max(3.0, (req.targetDistanceKm / 2.0) + 1.5)

        G = get_network_graph(center_lat, center_lng, radius_km=radius_km)
        response = plan_route(G, req)
        return response
    except Exception as e:
        logger.exception("Pathfinding calculation error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))
