import pytest
from app.scoring import compute_edge_cost, compute_safety_score, haversine_distance_m


def test_haversine_distance():
    # Approx distance between (0, 0) and (0, 1) degrees on equator ~ 111.32 km
    dist = haversine_distance_m(0.0, 0.0, 0.0, 1.0)
    assert 110_000 < dist < 112_000


def test_effort_tolerance_inversion():
    """
    When alpha (effort_tolerance) is 1.0, runner tolerates hills -> zero hill penalty.
    When alpha is 0.0, runner hates hills -> high hill penalty.
    """
    length = 100.0
    grade = 0.08  # 8% uphill
    safety = 1.0

    cost_tolerant = compute_edge_cost(
        length_m=length,
        grade=grade,
        safety_score=safety,
        effort_tolerance=1.0,  # alpha = 1
        safety_strictness=0.0
    )

    cost_intolerant = compute_edge_cost(
        length_m=length,
        grade=grade,
        safety_score=safety,
        effort_tolerance=0.0,  # alpha = 0
        safety_strictness=0.0
    )

    # Hill-tolerant cost should equal flat length (since safety penalty is 0)
    assert abs(cost_tolerant - length) < 1e-4
    # Hill-intolerant cost must be substantially higher
    assert cost_intolerant > cost_tolerant * 1.5


def test_safety_strictness_multiplier():
    """
    When beta (safety_strictness) is 1.0, unsafe road is penalized.
    When beta is 0.0, safety is ignored.
    """
    length = 100.0
    grade = 0.0
    poor_safety = 0.2

    cost_safety_strict = compute_edge_cost(
        length_m=length,
        grade=grade,
        safety_score=poor_safety,
        effort_tolerance=1.0,
        safety_strictness=1.0
    )

    cost_safety_ignored = compute_edge_cost(
        length_m=length,
        grade=grade,
        safety_score=poor_safety,
        effort_tolerance=1.0,
        safety_strictness=0.0
    )

    assert cost_safety_strict > cost_safety_ignored
    assert abs(cost_safety_ignored - length) < 1e-4


def test_safety_scorer():
    safe_edge = {
        "lit": "yes",
        "sidewalk": "both",
        "highway": "footway",
        "maxspeed": "20"
    }
    unsafe_edge = {
        "lit": "no",
        "sidewalk": "no",
        "highway": "primary",
        "maxspeed": "70"
    }

    assert compute_safety_score(safe_edge) > 0.8
    assert compute_safety_score(unsafe_edge) < 0.4
