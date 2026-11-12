import heapq
import math
from typing import Dict, Any, List, Optional, Tuple
import networkx as nx

from .models import RouteRequest, RouteResponse, ElevationSample, Hazard, GeoJSONFeature, GeoJSONGeometry
from .scoring import haversine_distance_m, compute_edge_cost


def find_nearest_node(G: nx.MultiDiGraph, target_lat: float, target_lng: float) -> int:
    """Finds the node in G with minimum haversine distance to target."""
    best_node = None
    min_dist = float("inf")

    for node, data in G.nodes(data=True):
        lat = data.get("y", data.get("lat"))
        lng = data.get("x", data.get("lon", data.get("lng")))
        if lat is None or lng is None:
            continue
        d = haversine_distance_m(target_lat, target_lng, lat, lng)
        if d < min_dist:
            min_dist = d
            best_node = node

    if best_node is None:
        raise ValueError("Graph contains no valid coordinates")
    return best_node


def run_multi_objective_astar(
    G: nx.MultiDiGraph,
    start_node: int,
    goal_node: int,
    effort_tolerance: float,
    safety_strictness: float,
    edge_penalties: Optional[Dict[Tuple[int, int], float]] = None
) -> List[int]:
    """
    Executes Multi-Objective A* search minimizing composite cost.
    Admissible heuristic: straight-line haversine distance to goal.
    """
    goal_data = G.nodes[goal_node]
    goal_lat = goal_data.get("y", goal_data.get("lat"))
    goal_lng = goal_data.get("x", goal_data.get("lon", goal_data.get("lng")))

    # Priority queue: (f_score, g_cost, node, path)
    initial_h = haversine_distance_m(
        G.nodes[start_node]["y"], G.nodes[start_node]["x"], goal_lat, goal_lng
    )
    pq = [(initial_h, 0.0, start_node, [start_node])]
    visited_costs: Dict[int, float] = {start_node: 0.0}

    penalties = edge_penalties or {}

    while pq:
        f, g, u, path = heapq.heappop(pq)

        if u == goal_node:
            return path

        if g > visited_costs.get(u, float("inf")):
            continue

        for v in G.neighbors(u):
            # Select edge with lowest cost between u and v
            edge_data = G.get_edge_data(u, v)
            if not edge_data:
                continue
            
            # Find best multi-edge
            best_e_cost = float("inf")
            for _, d in edge_data.items():
                length_m = float(d.get("length", 50.0))
                grade = float(d.get("grade", 0.0))
                safety = float(d.get("safety_score", 0.5))

                cost = compute_edge_cost(
                    length_m=length_m,
                    grade=grade,
                    safety_score=safety,
                    effort_tolerance=effort_tolerance,
                    safety_strictness=safety_strictness
                )

                # Add penalty if edge was already used (for loops)
                if (u, v) in penalties:
                    cost *= penalties[(u, v)]

                if cost < best_e_cost:
                    best_e_cost = cost

            new_g = g + best_e_cost
            if new_g < visited_costs.get(v, float("inf")):
                visited_costs[v] = new_g
                v_data = G.nodes[v]
                v_lat = v_data.get("y", v_data.get("lat"))
                v_lng = v_data.get("x", v_data.get("lon", v_data.get("lng")))
                h = haversine_distance_m(v_lat, v_lng, goal_lat, goal_lng)
                heapq.heappush(pq, (new_g + h, new_g, v, path + [v]))

    # Fallback to shortest path if constrained search didn't connect
    try:
        return nx.shortest_path(G, start_node, goal_node, weight="length")
    except Exception:
        return [start_node, goal_node]


def plan_route(
    G: nx.MultiDiGraph,
    req: RouteRequest
) -> RouteResponse:
    """Computes an optimal route, elevation profile, and hazard points."""
    start_lat, start_lng = req.startCoords
    end_lat, end_lng = req.endCoords

    start_node = find_nearest_node(G, start_lat, start_lng)
    end_node = find_nearest_node(G, end_lat, end_lng)

    is_loop = (
        req.targetDistanceKm is not None
        or haversine_distance_m(start_lat, start_lng, end_lat, end_lng) < 150.0
    )

    if is_loop:
        target_dist = req.targetDistanceKm or 5.0
        # Find a turnaround node approximately target_dist / 2 away
        target_half_dist_m = (target_dist * 1000.0) / 2.0
        candidate_turnarounds = []
        for n, d in G.nodes(data=True):
            if n == start_node:
                continue
            dist_from_start = haversine_distance_m(start_lat, start_lng, d["y"], d["x"])
            candidate_turnarounds.append((abs(dist_from_start - target_half_dist_m), n))
        
        candidate_turnarounds.sort()
        turnaround_node = candidate_turnarounds[0][1] if candidate_turnarounds else end_node

        # Outbound path
        outbound = run_multi_objective_astar(
            G, start_node, turnaround_node, req.effortTolerance, req.safetyStrictness
        )

        # Penalize outbound edges heavily to create a distinct loop
        penalties: Dict[Tuple[int, int], float] = {}
        for i in range(len(outbound) - 1):
            u, v = outbound[i], outbound[i + 1]
            penalties[(u, v)] = 4.0
            penalties[(v, u)] = 4.0

        # Inbound path back to start
        inbound = run_multi_objective_astar(
            G, turnaround_node, start_node, req.effortTolerance, req.safetyStrictness, penalties
        )
        node_path = outbound + inbound[1:]
    else:
        node_path = run_multi_objective_astar(
            G, start_node, end_node, req.effortTolerance, req.safetyStrictness
        )

    # Build coordinates and telemetry
    coordinates: List[Tuple[float, float]] = []
    elevation_samples: List[ElevationSample] = []
    hazards: List[Hazard] = []

    cumulative_distance_m = 0.0
    cumulative_ascent_m = 0.0

    prev_node = None
    hazard_counter = 1

    for idx, node in enumerate(node_path):
        node_data = G.nodes[node]
        lat = node_data.get("y", node_data.get("lat"))
        lng = node_data.get("x", node_data.get("lon", node_data.get("lng")))
        elev = float(node_data.get("elevation", 120.0))

        # MapLibre GeoJSON coordinates are [lng, lat]
        coordinates.append((lng, lat))

        seg_length_m = 0.0
        seg_grade = 0.0
        seg_safety = 0.8

        if prev_node is not None:
            prev_data = G.nodes[prev_node]
            seg_length_m = haversine_distance_m(
                prev_data["y"], prev_data["x"], lat, lng
            )
            cumulative_distance_m += seg_length_m
            
            elev_diff = elev - float(prev_data.get("elevation", 120.0))
            if elev_diff > 0:
                cumulative_ascent_m += elev_diff
            seg_grade = (elev_diff / seg_length_m * 100.0) if seg_length_m > 0 else 0.0

            # Edge properties for safety & hazards
            e_data = G.get_edge_data(prev_node, node)
            if e_data:
                first_edge = list(e_data.values())[0]
                seg_safety = float(first_edge.get("safety_score", 0.75))
                lit = str(first_edge.get("lit", "")).lower()
                sidewalk = str(first_edge.get("sidewalk", "")).lower()
                highway = str(first_edge.get("highway", "")).lower()

                # Flag hazards (missing sidewalk or unlit street on non-trivial segment)
                if (lit == "no" or sidewalk == "no") and seg_length_m > 80.0:
                    hazard_type = "unlit" if lit == "no" else "no_sidewalk"
                    desc = (
                        f"{int(seg_length_m)}m segment, unlit secondary road"
                        if lit == "no"
                        else f"{int(seg_length_m)}m segment, missing pedestrian sidewalk"
                    )
                    hazards.append(
                        Hazard(
                            id=f"haz-{hazard_counter}",
                            coord=(lat, lng),
                            distanceKm=round(cumulative_distance_m / 1000.0, 2),
                            lengthM=round(seg_length_m, 1),
                            kind=hazard_type,
                            description=desc
                        )
                    )
                    hazard_counter += 1

        elevation_samples.append(
            ElevationSample(
                distance=round(cumulative_distance_m / 1000.0, 3),
                elevation=round(elev, 1),
                grade=round(seg_grade, 2),
                safetyScore=round(seg_safety, 2)
            )
        )
        prev_node = node

    total_km = round(cumulative_distance_m / 1000.0, 2)
    # Estimate running duration at avg pace ~5:20 min/km + hill adjustment
    base_minutes_per_km = 5.33
    hill_penalty_min = (cumulative_ascent_m / 100.0) * 1.5
    est_duration_min = round(total_km * base_minutes_per_km + hill_penalty_min, 1)

    route_feature = GeoJSONFeature(
        geometry=GeoJSONGeometry(coordinates=coordinates),
        properties={
            "distanceKm": total_km,
            "elevationGainM": round(cumulative_ascent_m, 1),
            "effortTolerance": req.effortTolerance,
            "safetyStrictness": req.safetyStrictness
        }
    )

    return RouteResponse(
        route=route_feature,
        distanceKm=total_km,
        elevationGainM=round(cumulative_ascent_m, 1),
        estDurationMin=est_duration_min,
        elevationProfile=elevation_samples,
        hazards=hazards
    )
