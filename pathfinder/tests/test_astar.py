import pytest
from app.models import RouteRequest
from app.graph import generate_synthetic_urban_graph
from app.astar import plan_route


def test_plan_point_to_point_route():
    center_lat, center_lng = 40.7128, -74.0060
    G = generate_synthetic_urban_graph(center_lat, center_lng, radius_km=2.0, grid_size=8)

    req = RouteRequest(
        startCoords=(center_lat - 0.01, center_lng - 0.01),
        endCoords=(center_lat + 0.01, center_lng + 0.01),
        effortTolerance=0.5,
        safetyStrictness=0.8
    )

    res = plan_route(G, req)

    assert res.distanceKm > 0
    assert len(res.elevationProfile) > 1
    assert res.route.type == "Feature"
    assert len(res.route.geometry.coordinates) > 1
    assert res.estDurationMin > 0


def test_plan_loop_route():
    center_lat, center_lng = 40.7128, -74.0060
    G = generate_synthetic_urban_graph(center_lat, center_lng, radius_km=3.0, grid_size=10)

    req = RouteRequest(
        startCoords=(center_lat, center_lng),
        endCoords=(center_lat, center_lng),
        effortTolerance=0.7,
        safetyStrictness=0.5,
        targetDistanceKm=5.0
    )

    res = plan_route(G, req)

    assert res.distanceKm > 1.5
    # Loop start and end should be close
    coords = res.route.geometry.coordinates
    start_pt = coords[0]
    end_pt = coords[-1]
    assert abs(start_pt[0] - end_pt[0]) < 0.01
    assert abs(start_pt[1] - end_pt[1]) < 0.01
