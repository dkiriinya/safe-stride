import math
from typing import Dict, Any, Tuple


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes great circle distance between two points in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def compute_safety_score(edge_attrs: Dict[str, Any]) -> float:
    """
    Computes a normalized safety score in [0.0, 1.0] based on road attributes:
    - lit (yes / no)
    - sidewalk / footway
    - highway classification (residential/cycleway vs primary/secondary)
    - maxspeed
    """
    score = 0.5  # default baseline

    # Lighting bonus/penalty
    lit = str(edge_attrs.get("lit", "")).lower()
    if lit in ("yes", "24/7"):
        score += 0.25
    elif lit in ("no", "unlit"):
        score -= 0.25

    # Sidewalk / pedestrian facility
    sidewalk = str(edge_attrs.get("sidewalk", "")).lower()
    highway = str(edge_attrs.get("highway", "")).lower()
    if sidewalk in ("both", "yes", "left", "right") or highway in ("footway", "pedestrian", "path", "cycleway"):
        score += 0.25
    elif sidewalk == "no":
        score -= 0.20

    # Highway classification safety
    if highway in ("footway", "pedestrian", "path", "cycleway", "living_street", "residential"):
        score += 0.15
    elif highway in ("primary", "trunk", "motorway"):
        score -= 0.30
    elif highway in ("secondary", "tertiary"):
        score -= 0.05

    # Clamp to [0.05, 1.0]
    return max(0.05, min(1.0, score))


def compute_edge_cost(
    length_m: float,
    grade: float,
    safety_score: float,
    effort_tolerance: float,
    safety_strictness: float,
    kg: float = 12.0,
    ks: float = 2.5,
) -> float:
    """
    Multi-objective cost function:
    c(e) = L_e * [ 1 + (1 - alpha) * kg * max(0, grade)^2 + beta * ks * (1 - safety) ]
    
    - alpha (effort_tolerance): 1.0 -> no hill penalty; 0.0 -> max hill penalty.
    - beta (safety_strictness): 1.0 -> strictly avoid low-safety; 0.0 -> ignore safety.
    """
    uphill_grade = max(0.0, grade)
    # grade is given as fraction, e.g. 0.08 for 8%
    effort_penalty = (1.0 - effort_tolerance) * kg * (uphill_grade * 10.0) ** 2
    safety_penalty = safety_strictness * ks * (1.0 - safety_score)

    multiplier = 1.0 + effort_penalty + safety_penalty
    return length_m * multiplier
