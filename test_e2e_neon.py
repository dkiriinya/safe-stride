import urllib.request
import json

def test_all():
    print('=== 1. Testing /api/health (Gateway, Pathfinder, Neon DB) ===')
    res = urllib.request.urlopen('http://localhost:3000/api/health')
    health = json.loads(res.read().decode())
    print(json.dumps(health, indent=2))

    print('\n=== 2. Testing POST /api/saved-routes (Insert into Neon PostgreSQL) ===')
    route_payload = {
        'name': 'Neon Verification Stride 8.2k',
        'waypoints': [[-29.8245, 31.0125], [-29.8320, 31.0250]],
        'routeGeojson': {'type': 'Feature', 'geometry': {'type': 'LineString', 'coordinates': [[31.0125, -29.8245], [31.0250, -29.8320]]}},
        'elevationProfile': [{'distance': 0.0, 'elevation': 140, 'grade': 0, 'safetyScore': 0.9}],
        'distanceKm': 8.26,
        'elevationGainM': 193.0,
        'effortTolerance': 0.6,
        'safetyStrictness': 0.85,
        'hazards': [{'id': 'haz-1', 'coord': [-29.825, 31.015], 'distanceKm': 1.2, 'lengthM': 200, 'kind': 'unlit', 'description': 'Unlit segment'}]
    }
    req = urllib.request.Request(
        'http://localhost:3000/api/saved-routes',
        data=json.dumps(route_payload).encode(),
        headers={'Content-Type': 'application/json'}
    )
    saved_res = json.loads(urllib.request.urlopen(req).read().decode())
    print(json.dumps(saved_res, indent=2, default=str))

    print('\n=== 3. Testing GET /api/saved-routes (Query from Neon PostgreSQL) ===')
    get_res = urllib.request.urlopen('http://localhost:3000/api/saved-routes')
    routes_data = json.loads(get_res.read().decode())
    routes_list = routes_data.get('routes', [])
    print(f'Total saved routes found in Neon: {len(routes_list)}')
    if routes_list:
        print('Latest route name:', routes_list[0].get('name'))
        print('Latest route distance:', routes_list[0].get('distanceKm'), 'km')
        print('Latest route ID:', routes_list[0].get('id'))

    print('\n=== 4. Testing POST /api/routes/plan (Multi-Objective A* on FastAPI microservice) ===')
    plan_payload = {
        'startCoords': [-29.8245, 31.0125],
        'endCoords': [-29.8320, 31.0250],
        'effortTolerance': 0.6,
        'safetyStrictness': 0.85
    }
    plan_req = urllib.request.Request(
        'http://localhost:3000/api/routes/plan',
        data=json.dumps(plan_payload).encode(),
        headers={'Content-Type': 'application/json'}
    )
    plan_res = json.loads(urllib.request.urlopen(plan_req).read().decode())
    print('Planned distance:', plan_res['distanceKm'], 'km')
    print('Elevation gain:', plan_res['elevationGainM'], 'm')
    print('Hazards flagged:', len(plan_res['hazards']))
    print('Elevation samples:', len(plan_res['elevationProfile']))

    print('\n=== 5. Testing HTTP /planner and / Web Pages ===')
    p_res = urllib.request.urlopen('http://localhost:3000/planner')
    print('/planner HTTP status:', p_res.status, '| HTML size:', len(p_res.read()), 'bytes')
    l_res = urllib.request.urlopen('http://localhost:3000/')
    print('/ (landing) HTTP status:', l_res.status, '| HTML size:', len(l_res.read()), 'bytes')

if __name__ == '__main__':
    test_all()
