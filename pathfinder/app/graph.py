import logging
import math
from typing import Dict, Any, List, Tuple
import networkx as nx

from .scoring import haversine_distance_m, compute_safety_score

logger = logging.getLogger("safestride.graph")

try:
    import osmnx as ox
    HAS_OSMNX = True
except Exception:
    HAS_OSMNX = False


def generate_synthetic_urban_graph(
    center_lat: float,
    center_lng: float,
    radius_km: float = 3.5,
    grid_size: int = 14
) -> nx.MultiDiGraph:
    """
    Generates a realistic urban street network around a center coordinate with:
    - Main arterial avenues, residential streets, park paths
    - Realistic terrain with rolling hills (elevation variation)
    - Realistic safety tags (lit, sidewalk, highway type)
    """
    G = nx.MultiDiGraph()
    G.graph["crs"] = "epsg:4326"

    # Approx degree spans for radius
    lat_span = (radius_km / 111.0)
    lng_span = (radius_km / (111.0 * math.cos(math.radians(center_lat))))

    min_lat = center_lat - lat_span
    max_lat = center_lat + lat_span
    min_lng = center_lng - lng_span
    max_lng = center_lng + lng_span

    lat_step = (max_lat - min_lat) / (grid_size - 1)
    lng_step = (max_lng - min_lng) / (grid_size - 1)

    node_id = 0
    node_grid: List[List[int]] = []

    # Create nodes with terrain elevations
    for i in range(grid_size):
        row = []
        lat = min_lat + i * lat_step
        for j in range(grid_size):
            lng = min_lng + j * lng_step
            # Natural rolling terrain function: base elevation 120m + 40m hills
            elevation = 120.0 + 35.0 * math.sin(i * 0.7) * math.cos(j * 0.8) + 15.0 * math.sin((i + j) * 0.5)
            
            G.add_node(
                node_id,
                y=lat,
                x=lng,
                elevation=round(elevation, 1),
                street_count=4
            )
            row.append(node_id)
            node_id += 1
        node_grid.append(row)

    # Add edges with attributes
    for i in range(grid_size):
        for j in range(grid_size):
            u = node_grid[i][j]
            u_data = G.nodes[u]

            neighbors = []
            if i + 1 < grid_size:
                neighbors.append(node_grid[i + 1][j])
            if j + 1 < grid_size:
                neighbors.append(node_grid[i][j + 1])
            # Add some diagonal pathways (e.g. park cuts)
            if (i + j) % 3 == 0 and i + 1 < grid_size and j + 1 < grid_size:
                neighbors.append(node_grid[i + 1][j + 1])

            for v in neighbors:
                v_data = G.nodes[v]
                dist_m = haversine_distance_m(u_data["y"], u_data["x"], v_data["y"], v_data["x"])
                elev_diff = v_data["elevation"] - u_data["elevation"]
                grade = (elev_diff / dist_m) if dist_m > 0 else 0.0

                # Determine street class & safety metadata
                is_arterial = (i % 4 == 0 or j % 4 == 0)
                is_park = (3 <= i <= 5 and 3 <= j <= 5)
                
                if is_park:
                    highway = "footway"
                    lit = "no" if (i + j) % 2 == 0 else "yes"
                    sidewalk = "yes"
                    maxspeed = "15"
                elif is_arterial:
                    highway = "secondary"
                    lit = "yes"
                    sidewalk = "both" if (i + j) % 3 != 0 else "no"
                    maxspeed = "50"
                else:
                    highway = "residential"
                    lit = "yes" if (i + j) % 4 != 0 else "no"
                    sidewalk = "both" if (i + j) % 2 == 0 else "left"
                    maxspeed = "30"

                attrs_uv = {
                    "length": round(dist_m, 2),
                    "grade": round(grade, 4),
                    "highway": highway,
                    "lit": lit,
                    "sidewalk": sidewalk,
                    "maxspeed": maxspeed,
                    "geometry": [
                        [u_data["x"], u_data["y"]],
                        [v_data["x"], v_data["y"]]
                    ]
                }
                attrs_uv["safety_score"] = compute_safety_score(attrs_uv)

                # Reverse edge
                attrs_vu = dict(attrs_uv)
                attrs_vu["grade"] = round(-grade, 4)
                attrs_vu["geometry"] = [
                    [v_data["x"], v_data["y"]],
                    [u_data["x"], u_data["y"]]
                ]

                G.add_edge(u, v, 0, **attrs_uv)
                G.add_edge(v, u, 0, **attrs_vu)

    return G


def get_network_graph(center_lat: float, center_lng: float, radius_km: float = 4.0) -> nx.MultiDiGraph:
    """Returns an OSMnx road network if available, otherwise high-fidelity synthetic graph."""
    if HAS_OSMNX:
        try:
            logger.info("Fetching OSM network for (%.4f, %.4f)...", center_lat, center_lng)
            G = ox.graph_from_point(
                (center_lat, center_lng),
                dist=int(radius_km * 1000),
                network_type="walk",
                simplify=True
            )
            for _, _, data in G.edges(data=True):
                if "safety_score" not in data:
                    data["safety_score"] = compute_safety_score(data)
                if "grade" not in data:
                    data["grade"] = 0.0
            return G
        except Exception as e:
            logger.warning("OSMnx fetch failed, falling back to synthetic graph: %s", e)

    return generate_synthetic_urban_graph(center_lat, center_lng, radius_km=radius_km)
