from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class RouteRequest(BaseModel):
    startCoords: Tuple[float, float] = Field(
        ..., description="[lat, lng] of starting point"
    )
    endCoords: Tuple[float, float] = Field(
        ..., description="[lat, lng] of destination point"
    )
    waypoints: Optional[List[Tuple[float, float]]] = Field(
        default=None, description="Ordered list of all clicked waypoints [[lat, lng], ...]"
    )
    effortTolerance: float = Field(
        ..., ge=0.0, le=1.0, description="alpha multiplier: 1=tolerant to hills, 0=heavily penalize hills"
    )
    safetyStrictness: float = Field(
        ..., ge=0.0, le=1.0, description="beta multiplier: 1=strictly prioritize well-lit & sidewalk roads"
    )
    targetDistanceKm: Optional[float] = Field(
        default=None, ge=0.5, le=100.0, description="Target distance for loop generation"
    )


class ElevationSample(BaseModel):
    distance: float = Field(..., description="Cumulative distance in km")
    elevation: float = Field(..., description="Elevation in meters")
    grade: float = Field(..., description="Grade percentage")
    safetyScore: float = Field(..., description="Safety score between 0 and 1")


class Hazard(BaseModel):
    id: str
    coord: Tuple[float, float] = Field(..., description="[lat, lng]")
    distanceKm: float
    lengthM: float
    kind: str = Field(..., description="'unlit' | 'no_sidewalk' | 'high_speed'")
    description: str


class GeoJSONGeometry(BaseModel):
    type: str = "LineString"
    coordinates: List[Tuple[float, float]]  # [lng, lat] GeoJSON standard


class GeoJSONFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoJSONGeometry
    properties: Dict[str, Any] = Field(default_factory=dict)


class RouteResponse(BaseModel):
    route: GeoJSONFeature
    distanceKm: float
    elevationGainM: float
    estDurationMin: float
    elevationProfile: List[ElevationSample]
    hazards: List[Hazard]
