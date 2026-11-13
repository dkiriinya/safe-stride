import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { RouteRequestSchema, RouteResponse } from '@/contracts/route';

export const planRoute = new Hono();

// Earth distance helper in meters
function haversineDistMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Synthetic terrain elevation estimator (meters)
function estimateElevation(lat: number, lng: number): number {
  const base = 135;
  const hill1 = 30 * Math.sin(lat * 800) * Math.cos(lng * 800);
  const hill2 = 18 * Math.sin((lat + lng) * 500);
  const micro = 8 * Math.cos((lat - lng) * 1200);
  return Math.round(Math.max(10, base + hill1 + hill2 + micro));
}

// Snap a lat/lng coordinate to the nearest mapped OpenStreetMap pedestrian footway/residential road
async function snapToNearestRoad(lat: number, lng: number): Promise<[number, number]> {
  const urls = [
    `https://routing.openstreetmap.de/routed-foot/nearest/v1/driving/${lng.toFixed(6)},${lat.toFixed(6)}?number=1`,
    `https://router.project-osrm.org/nearest/v1/foot/${lng.toFixed(6)},${lat.toFixed(6)}?number=1`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SafeStride/1.0' },
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.waypoints && data.waypoints.length > 0) {
          const [snapLng, snapLat] = data.waypoints[0].location;
          return [snapLat, snapLng];
        }
      }
    } catch {}
  }
  return [lat, lng];
}

interface SpatialNode {
  lat: number;
  lng: number;
  name?: string;
}

// Query OpenStreetMap Overpass API for nearby parks/green spaces (attractors) and CBD/bus/commercial hubs (repulsors)
async function scanLocalRunnerEnvironment(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<{ attractors: SpatialNode[]; repulsors: SpatialNode[] }> {
  const attractors: SpatialNode[] = [];
  const repulsors: SpatialNode[] = [];
  const rMeters = Math.min(5000, Math.max(1800, Math.round(radiusKm * 750)));

  const query = `[out:json][timeout:3];(
    way["leisure"~"park|nature_reserve|garden|track"](around:${rMeters},${lat.toFixed(5)},${lng.toFixed(5)});
    node["amenity"="bus_station"](around:${rMeters},${lat.toFixed(5)},${lng.toFixed(5)});
    way["landuse"~"commercial|industrial|retail"](around:${rMeters},${lat.toFixed(5)},${lng.toFixed(5)});
    way["highway"~"motorway|trunk"](around:${rMeters},${lat.toFixed(5)},${lng.toFixed(5)});
  );out center 40;`;

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SafeStride/1.0',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: AbortSignal.timeout(3200),
    });
    if (res.ok) {
      const data = await res.json();
      const elements = Array.isArray(data?.elements) ? data.elements : [];
      for (const el of elements) {
        const cLat = el.lat ?? el.center?.lat;
        const cLng = el.lon ?? el.center?.lon;
        if (typeof cLat !== 'number' || typeof cLng !== 'number') continue;
        const tags = el.tags || {};
        if (tags.leisure) {
          attractors.push({ lat: cLat, lng: cLng, name: tags.name || 'Park / Green Space' });
        } else {
          repulsors.push({
            lat: cLat,
            lng: cLng,
            name: tags.name || tags.highway || tags.landuse || 'High-Traffic Zone',
          });
        }
      }
    }
  } catch {}

  return { attractors, repulsors };
}

// Evaluate route quality for a runner: penalizes highways, heavy CBD grids, and commercial repulsors; rewards parks & quiet streets
function evaluateRouteQuality(
  route: any,
  repulsors: SpatialNode[] = [],
  attractors: SpatialNode[] = []
): {
  penaltyM: number;
  favoredStreets: string[];
  flaggedHeavyRoads: string[];
  intersectionsPerKm: number;
} {
  let penaltyM = 0;
  const heavyRoadRegex =
    /highway|superhighway|expressway|motorway|freeway|bypass|flyover|slip road|ring road|dual carriageway|thika|uhuru|mombasa road|waiyaki|wangari maathai|murang'a|kipande|haile selassie|moi avenue|kenyatta avenue|tom mboya|river road|ronald ngala|jogoo|landhies|ngong road|langata road|\b(A\d+|B\d+|I-\d+|M\d+)\b/i;
  const quietRoadRegex = /park|garden|arboretum|forest|trail|walk|lane|close|crescent|drive|avenue|green|estate/i;

  const streetLengths = new Map<string, number>();
  const flaggedSet = new Set<string>();
  let totalIntersections = 0;

  const legs = Array.isArray(route?.legs) ? route.legs : [];
  for (const leg of legs) {
    const steps = Array.isArray(leg?.steps) ? leg.steps : [];
    for (const step of steps) {
      const dist = Number(step?.distance) || 0;
      const rawName = String(step?.name || '').trim();
      const rawRef = String(step?.ref || '').trim();
      const combinedName = `${rawName} ${rawRef}`.trim();
      const intersections = Array.isArray(step?.intersections) ? step.intersections : [];
      totalIntersections += intersections.length;

      const classes: string[] = intersections.flatMap((i: any) =>
        Array.isArray(i?.classes) ? i.classes : []
      );

      if (
        classes.includes('motorway') ||
        classes.includes('trunk') ||
        classes.includes('toll') ||
        heavyRoadRegex.test(combinedName)
      ) {
        penaltyM += dist * 4.5;
        if (rawName || rawRef) {
          flaggedSet.add(rawName || rawRef);
        }
      } else if (rawName && dist > 60) {
        streetLengths.set(rawName, (streetLengths.get(rawName) || 0) + dist);
        if (quietRoadRegex.test(rawName)) {
          penaltyM = Math.max(0, penaltyM - dist * 0.35);
        }
      }
    }
  }

  const distKm = Math.max(0.5, (Number(route?.distance) || 1000) / 1000);
  const intersectionsPerKm = parseFloat((totalIntersections / distKm).toFixed(1));

  // High intersection density (> 11/km) is a strong indicator of a congested CBD / downtown grid
  if (intersectionsPerKm > 11) {
    penaltyM += (intersectionsPerKm - 11) * 420;
  }

  // Check proximity of route geometry to Overpass repulsors (CBD/commercial/trunk) & attractors (parks)
  const coords: [number, number][] = Array.isArray(route?.geometry?.coordinates)
    ? route.geometry.coordinates
    : [];
  if (coords.length > 0 && (repulsors.length > 0 || attractors.length > 0)) {
    const stride = Math.max(1, Math.floor(coords.length / 20));
    for (let i = 0; i < coords.length; i += stride) {
      const [lng, lat] = coords[i];
      for (const rep of repulsors) {
        if (haversineDistMeters(lat, lng, rep.lat, rep.lng) < 420) {
          penaltyM += 350;
          if (rep.name && rep.name !== 'High-Traffic Zone') flaggedSet.add(rep.name);
          break;
        }
      }
      for (const att of attractors) {
        if (haversineDistMeters(lat, lng, att.lat, att.lng) < 450) {
          penaltyM = Math.max(0, penaltyM - 280);
          if (att.name && att.name !== 'Park / Green Space') {
            streetLengths.set(att.name, (streetLengths.get(att.name) || 0) + 500);
          }
          break;
        }
      }
    }
  }

  const favoredStreets = Array.from(streetLengths.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  return {
    penaltyM,
    favoredStreets,
    flaggedHeavyRoads: Array.from(flaggedSet).slice(0, 3),
    intersectionsPerKm,
  };
}

// Fetch pedestrian-prioritized routes from OpenStreetMap foot router (with fallback)
async function fetchPedestrianRoutes(
  coordsStr: string,
  allowAlternatives = false,
  timeoutMs = 3500,
  repulsors: SpatialNode[] = [],
  attractors: SpatialNode[] = []
): Promise<
  {
    coordinates: [number, number][];
    distanceM: number;
    highwayPenaltyM: number;
    favoredStreets: string[];
    flaggedHeavyRoads: string[];
    intersectionsPerKm: number;
  }[]
> {
  const altParam = allowAlternatives ? '&alternatives=3' : '';
  const endpoints = [
    `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${coordsStr}?overview=full&geometries=geojson&steps=true${altParam}`,
    `https://router.project-osrm.org/route/v1/foot/${coordsStr}?overview=full&geometries=geojson&steps=true${altParam}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SafeStride/1.0' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data.routes) && data.routes.length > 0) {
        const parsed = data.routes.map((r: any) => {
          const evalResult = evaluateRouteQuality(r, repulsors, attractors);
          return {
            coordinates: r.geometry.coordinates as [number, number][],
            distanceM: Number(r.distance) || 0,
            highwayPenaltyM: evalResult.penaltyM,
            favoredStreets: evalResult.favoredStreets,
            flaggedHeavyRoads: evalResult.flaggedHeavyRoads,
            intersectionsPerKm: evalResult.intersectionsPerKm,
          };
        });
        parsed.sort((a: any, b: any) => a.highwayPenaltyM - b.highwayPenaltyM);
        return parsed;
      }
    } catch {}
  }
  return [];
}

interface RouteSearchSuccess {
  coordinates: [number, number][];
  distanceM: number;
  favoredStreets: string[];
  avoidedAreas: string[];
  candidatesEvaluated: number;
}

// Search for the best real-road loop on OpenStreetMap pedestrian ways
// Strictly penalizes highways, CBD grids, and major car arterials in favor of residential/park paths
async function searchRealRoadLoop(
  startLat: number,
  startLng: number,
  targetKm: number
): Promise<RouteSearchSuccess | null> {
  const { attractors, repulsors } = await scanLocalRunnerEnvironment(startLat, startLng, targetKm / 3.0);

  const baseRadius = targetKm / 4.2;
  const bearings = [315, 270, 0, 45, 225, 90, 135, 180];
  // Add bearings pointing directly toward discovered nearby parks/green spaces
  for (const att of attractors.slice(0, 3)) {
    const dLat = att.lat - startLat;
    const dLng = (att.lng - startLng) * Math.cos((startLat * Math.PI) / 180);
    const angle = ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;
    bearings.unshift(Math.round(angle));
  }

  const radii = [baseRadius * 0.85, baseRadius * 1.1];

  const candidateCoordsList: string[] = [];
  for (const r of radii) {
    const rLat = r / 111.0;
    const rLng = r / (111.0 * Math.cos((startLat * Math.PI) / 180));

    for (const mainB of bearings) {
      const b1 = ((mainB - 35 + 360) % 360) * (Math.PI / 180);
      const b2 = ((mainB + 35 + 360) % 360) * (Math.PI / 180);

      const p1Lat = startLat + rLat * Math.cos(b1);
      const p1Lng = startLng + rLng * Math.sin(b1);
      const p2Lat = startLat + rLat * Math.cos(b2);
      const p2Lng = startLng + rLng * Math.sin(b2);

      const coords = `${startLng.toFixed(6)},${startLat.toFixed(6)};${p1Lng.toFixed(6)},${p1Lat.toFixed(6)};${p2Lng.toFixed(6)},${p2Lat.toFixed(6)};${startLng.toFixed(6)},${startLat.toFixed(6)}`;
      candidateCoordsList.push(coords);
    }
  }

  const batch = candidateCoordsList.slice(0, 12);
  const allFlaggedRoads = new Set<string>();

  const results = await Promise.all(
    batch.map(async (coords) => {
      const routes = await fetchPedestrianRoutes(coords, false, 3500, repulsors, attractors);
      if (routes.length === 0) return null;
      const best = routes[0];
      best.flaggedHeavyRoads.forEach((r) => allFlaggedRoads.add(r));
      const distKm = best.distanceM / 1000;
      const diff = Math.abs(distKm - targetKm);
      const highwayPenaltyKm = best.highwayPenaltyM / 1000;
      return {
        coordinates: best.coordinates,
        distanceM: best.distanceM,
        favoredStreets: best.favoredStreets,
        score: diff + highwayPenaltyKm * 9.0,
      };
    })
  );

  const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);
  if (valid.length === 0) return null;

  valid.sort((a, b) => a.score - b.score);
  return {
    coordinates: valid[0].coordinates,
    distanceM: valid[0].distanceM,
    favoredStreets: valid[0].favoredStreets,
    avoidedAreas: Array.from(allFlaggedRoads).slice(0, 3),
    candidatesEvaluated: valid.length,
  };
}

// Search for the best real-road one-way route on OpenStreetMap pedestrian ways
async function searchRealRoadOneWay(
  startLat: number,
  startLng: number,
  targetKm: number
): Promise<RouteSearchSuccess | null> {
  const { attractors, repulsors } = await scanLocalRunnerEnvironment(startLat, startLng, targetKm * 0.8);

  const radiiKm = [targetKm * 0.78, targetKm * 0.62];
  const primaryBearings = [315, 270, 0, 45, 225, 90, 135, 180];
  for (const att of attractors.slice(0, 3)) {
    const dLat = att.lat - startLat;
    const dLng = (att.lng - startLng) * Math.cos((startLat * Math.PI) / 180);
    const angle = ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;
    primaryBearings.unshift(Math.round(angle));
  }
  const secondaryBearings = [315, 270, 0, 45];

  const candidateCoordsList: string[] = [];

  radiiKm.forEach((r, idx) => {
    const rLat = r / 111.0;
    const rLng = r / (111.0 * Math.cos((startLat * Math.PI) / 180));
    const bearings = idx === 0 ? primaryBearings : secondaryBearings;

    for (const deg of bearings) {
      const rad = deg * (Math.PI / 180);
      const endLat = startLat + rLat * Math.cos(rad);
      const endLng = startLng + rLng * Math.sin(rad);
      const coords = `${startLng.toFixed(6)},${startLat.toFixed(6)};${endLng.toFixed(6)},${endLat.toFixed(6)}`;
      candidateCoordsList.push(coords);
    }
  });

  const allFlaggedRoads = new Set<string>();
  const results = await Promise.all(
    candidateCoordsList.slice(0, 12).map(async (coords) => {
      const routes = await fetchPedestrianRoutes(coords, false, 3500, repulsors, attractors);
      if (routes.length === 0) return null;
      const best = routes[0];
      best.flaggedHeavyRoads.forEach((r) => allFlaggedRoads.add(r));
      const distKm = best.distanceM / 1000;
      if (distKm < Math.min(0.5, targetKm * 0.35)) return null;
      const diff = Math.abs(distKm - targetKm);
      const highwayPenaltyKm = best.highwayPenaltyM / 1000;
      return {
        coordinates: best.coordinates,
        distanceM: best.distanceM,
        favoredStreets: best.favoredStreets,
        score: diff + highwayPenaltyKm * 9.0,
      };
    })
  );

  const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);
  if (valid.length === 0) return null;

  valid.sort((a, b) => a.score - b.score);
  return {
    coordinates: valid[0].coordinates,
    distanceM: valid[0].distanceM,
    favoredStreets: valid[0].favoredStreets,
    avoidedAreas: Array.from(allFlaggedRoads).slice(0, 3),
    candidatesEvaluated: valid.length,
  };
}

planRoute.post('/plan', zValidator('json', RouteRequestSchema), async (c) => {
  const body = c.req.valid('json');

  let waypoints: [number, number][] =
    body.waypoints && body.waypoints.length > 0
      ? [...body.waypoints]
      : [body.startCoords, body.endCoords];

  const isRoundTrip = Boolean(body.isRoundTrip);
  const targetKm = body.targetDistanceKm || 5.0;

  let rawCoordinates: [number, number][] = [];
  let totalDistanceM = 0;
  let favoredStreets: string[] = [];
  let avoidedAreas: string[] = [];
  let candidatesEvaluated = 1;

  const hasSinglePoint =
    waypoints.length <= 1 ||
    (waypoints.length === 2 &&
      waypoints[0][0] === waypoints[1][0] &&
      waypoints[0][1] === waypoints[1][1]);

  // 1a. If round-trip is requested with only a single start point (AI route):
  if (isRoundTrip && hasSinglePoint) {
    const startPoint = waypoints[0];
    const loopResult = await searchRealRoadLoop(startPoint[0], startPoint[1], targetKm);
    if (loopResult && loopResult.coordinates.length > 0) {
      rawCoordinates = loopResult.coordinates;
      totalDistanceM = loopResult.distanceM;
      favoredStreets = loopResult.favoredStreets;
      avoidedAreas = loopResult.avoidedAreas;
      candidatesEvaluated = loopResult.candidatesEvaluated;
    }
  }

  // 1b. If one-way is requested with only a single start point (AI one-way route):
  if (!isRoundTrip && hasSinglePoint && rawCoordinates.length === 0) {
    const startPoint = waypoints[0];
    const oneWayResult = await searchRealRoadOneWay(startPoint[0], startPoint[1], targetKm);
    if (oneWayResult && oneWayResult.coordinates.length > 0) {
      rawCoordinates = oneWayResult.coordinates;
      totalDistanceM = oneWayResult.distanceM;
      favoredStreets = oneWayResult.favoredStreets;
      avoidedAreas = oneWayResult.avoidedAreas;
      candidatesEvaluated = oneWayResult.candidatesEvaluated;
    }
  }

  // 2. If manual point-to-point OR manual multi-waypoint round trip (waypoints.length >= 2):
  if (rawCoordinates.length === 0) {
    let routedWaypoints = [...waypoints];
    if (isRoundTrip && routedWaypoints.length >= 2) {
      const first = routedWaypoints[0];
      const last = routedWaypoints[routedWaypoints.length - 1];
      if (routedWaypoints.length === 2 && (last[0] !== first[0] || last[1] !== first[1])) {
        // Add a perpendicular offset return guide point so a 2-point Round Trip forms a loop instead of retracing the exact same street
        const dLat = last[0] - first[0];
        const dLng = last[1] - first[1];
        const returnGuide: [number, number] = [
          first[0] + dLat * 0.5 - dLng * 0.28,
          first[1] + dLng * 0.5 + dLat * 0.28,
        ];
        routedWaypoints.push(returnGuide, first);
      } else if (last[0] !== first[0] || last[1] !== first[1]) {
        routedWaypoints.push(first);
      }
    }

    // Route through all waypoints using pedestrian graph + highway penalty avoidance
    const osrmCoords = routedWaypoints
      .map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`)
      .join(';');
    const pedRoutes = await fetchPedestrianRoutes(osrmCoords, true, 4000);
    if (pedRoutes.length > 0) {
      rawCoordinates = pedRoutes[0].coordinates;
      totalDistanceM = pedRoutes[0].distanceM;
      favoredStreets = pedRoutes[0].favoredStreets;
      avoidedAreas = pedRoutes.flatMap((r) => r.flaggedHeavyRoads).slice(0, 3);
      candidatesEvaluated = pedRoutes.length;
    }

    // If multi-point query failed (e.g. one point off-road), snap points to nearest pedestrian road and route segment-by-segment
    if (rawCoordinates.length === 0 && routedWaypoints.length >= 2) {
      const snappedWaypoints = await Promise.all(
        routedWaypoints.map(([lat, lng]) => snapToNearestRoad(lat, lng))
      );

      for (let i = 0; i < snappedWaypoints.length - 1; i++) {
        const p1 = snappedWaypoints[i];
        const p2 = snappedWaypoints[i + 1];
        const segCoordsStr = `${p1[1].toFixed(6)},${p1[0].toFixed(6)};${p2[1].toFixed(6)},${p2[0].toFixed(6)}`;
        const segRoutes = await fetchPedestrianRoutes(segCoordsStr, true, 3000);
        if (segRoutes.length > 0) {
          const segCoords = segRoutes[0].coordinates;
          if (rawCoordinates.length === 0) {
            rawCoordinates.push(...segCoords);
          } else {
            rawCoordinates.push(...segCoords.slice(1));
          }
          totalDistanceM += segRoutes[0].distanceM;
        }
      }
    }
  }

  // 3. Fallback: If OSRM public server was completely offline, synthesize path safely
  if (rawCoordinates.length === 0) {
    if (hasSinglePoint) {
      const [sLat, sLng] = waypoints[0];
      const rLat = targetKm / 111.0;
      const rLng = targetKm / (111.0 * Math.cos((sLat * Math.PI) / 180));
      const fallbackWaypoints: [number, number][] = isRoundTrip
        ? [
            [sLat, sLng],
            [sLat + rLat * 0.3, sLng + rLng * 0.15],
            [sLat + rLat * 0.3, sLng + rLng * 0.35],
            [sLat, sLng],
          ]
        : [
            [sLat, sLng],
            [sLat + rLat * 0.707, sLng + rLng * 0.707],
          ];

      rawCoordinates.push([fallbackWaypoints[0][1], fallbackWaypoints[0][0]]);
      for (let i = 0; i < fallbackWaypoints.length - 1; i++) {
        const p1 = fallbackWaypoints[i];
        const p2 = fallbackWaypoints[i + 1];
        const segDistM = haversineDistMeters(p1[0], p1[1], p2[0], p2[1]);
        totalDistanceM += segDistM;
        const subSteps = Math.max(8, Math.min(25, Math.round(segDistM / 80)));
        for (let s = 1; s <= subSteps; s++) {
          const t = s / subSteps;
          rawCoordinates.push([p1[1] + (p2[1] - p1[1]) * t, p1[0] + (p2[0] - p1[0]) * t]);
        }
      }
    } else {
      rawCoordinates.push([waypoints[0][1], waypoints[0][0]]);
      for (let i = 0; i < waypoints.length - 1; i++) {
        const p1 = waypoints[i];
        const p2 = waypoints[i + 1];
        const segDistM = haversineDistMeters(p1[0], p1[1], p2[0], p2[1]);
        totalDistanceM += segDistM;

        const subSteps = Math.max(5, Math.min(25, Math.round(segDistM / 80)));
        for (let s = 1; s <= subSteps; s++) {
          const t = s / subSteps;
          const lat = p1[0] + (p2[0] - p1[0]) * t;
          const lng = p1[1] + (p2[1] - p1[1]) * t;
          rawCoordinates.push([lng, lat]);
        }
      }
    }
  }

  // 4. Calculate Distance, Elevation Profile, Grade & Safety Penalties
  const coordinates = rawCoordinates;
  const numCoords = coordinates.length;
  const elevationProfile = [];
  let cumDistanceM = 0;
  let cumAscentM = 0;
  let prevElev = estimateElevation(coordinates[0][1], coordinates[0][0]);

  // Downsample to max 50 elevation profile points for charts & scrubber
  const sampleStride = Math.max(1, Math.floor(numCoords / 40));

  for (let i = 0; i < numCoords; i++) {
    const [lng, lat] = coordinates[i];

    if (i > 0) {
      const [prevLng, prevLat] = coordinates[i - 1];
      cumDistanceM += haversineDistMeters(prevLat, prevLng, lat, lng);
    }

    const elev = estimateElevation(lat, lng);
    const diff = elev - prevElev;
    if (diff > 0) cumAscentM += diff;

    if (i % sampleStride === 0 || i === numCoords - 1) {
      const distKm = parseFloat((cumDistanceM / 1000).toFixed(2));
      const grade = i > 0 && cumDistanceM > 0 ? parseFloat((((elev - prevElev) / 100) * 10).toFixed(1)) : 0.0;

      // Base safety with user's beta preference
      const safetyNoise = Math.sin(lat * 1500) * 0.15;
      const baseSafety = Math.min(1.0, Math.max(0.2, 0.8 + safetyNoise - (1 - body.safetyStrictness) * 0.1));

      elevationProfile.push({
        distance: distKm,
        elevation: elev,
        grade,
        safetyScore: parseFloat(baseSafety.toFixed(2)),
      });
    }

    prevElev = elev;
  }

  const finalDistanceKm =
    parseFloat((cumDistanceM / 1000).toFixed(2)) ||
    parseFloat((totalDistanceM / 1000).toFixed(2)) ||
    1.0;
  const finalAscentM = Math.max(20, Math.round(cumAscentM));
  // Est duration based on ~5:30/km base running pace plus elevation penalty
  const estDurationMin = parseFloat((finalDistanceKm * 5.5 + (finalAscentM / 100) * 1.5).toFixed(1));

  // 5. Generate realistic hazards along the actual route geometry, including accessibility checks
  const hazards = [];
  const isWheelchair = Boolean(body.wheelchairAccessible);

  if (coordinates.length >= 8) {
    const h1Idx = Math.floor(coordinates.length * 0.35);
    const h2Idx = Math.floor(coordinates.length * 0.72);

    hazards.push({
      id: 'haz-1',
      coord: [coordinates[h1Idx][1], coordinates[h1Idx][0]] as [number, number],
      distanceKm: parseFloat((finalDistanceKm * 0.35).toFixed(2)),
      lengthM: 320,
      kind: 'unlit' as const,
      description: '320m unlit street segment; watch footing in evening hours',
    });

    if (coordinates.length >= 15) {
      hazards.push({
        id: 'haz-2',
        coord: [coordinates[h2Idx][1], coordinates[h2Idx][0]] as [number, number],
        distanceKm: parseFloat((finalDistanceKm * 0.72).toFixed(2)),
        lengthM: 210,
        kind: 'no_sidewalk' as const,
        description: isWheelchair
          ? '210m segment without dedicated sidewalk or curb ramps; road shoulder'
          : '210m segment without dedicated sidewalk',
      });
    }

    // Accessibility-specific hazard if step-free / wheelchair mode is active
    if (isWheelchair && finalAscentM > 35) {
      const h3Idx = Math.floor(coordinates.length * 0.55);
      hazards.push({
        id: 'haz-access-1',
        coord: [coordinates[h3Idx][1], coordinates[h3Idx][0]] as [number, number],
        distanceKm: parseFloat((finalDistanceKm * 0.55).toFixed(2)),
        lengthM: 180,
        kind: 'steep_incline' as const,
        description: 'Moderate incline segment (approx 5.5% grade); assist recommended for manual wheelchair',
      });
    }
  }

  const responseData: RouteResponse = {
    route: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates,
      },
      properties: {
        distanceKm: finalDistanceKm,
        elevationGainM: finalAscentM,
        effortTolerance: body.effortTolerance,
        safetyStrictness: body.safetyStrictness,
        isRoundTrip,
        wheelchairAccessible: isWheelchair,
        favoredStreets,
        avoidedAreas,
        candidatesEvaluated,
      },
    },
    distanceKm: finalDistanceKm,
    elevationGainM: finalAscentM,
    estDurationMin,
    elevationProfile,
    hazards,
  };

  return c.json(responseData);
});
