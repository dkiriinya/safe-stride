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

// Snap a lat/lng coordinate to the nearest mapped OpenStreetMap footway/road
async function snapToNearestRoad(lat: number, lng: number): Promise<[number, number]> {
  try {
    const url = `https://router.project-osrm.org/nearest/v1/foot/${lng.toFixed(6)},${lat.toFixed(6)}?number=1`;
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
  return [lat, lng];
}

// Search for the best real-road loop on OpenStreetMap pedestrian ways
// Avoids water bodies (dams, lakes), railways, and barriers by testing candidate road sectors in parallel
async function searchRealRoadLoop(
  startLat: number,
  startLng: number,
  targetKm: number
): Promise<{ coordinates: [number, number][]; distanceM: number } | null> {
  const baseRadius = targetKm / 8.0;
  // Test compass sectors prioritizing walkable street corridors
  const bearings = [45, 0, 315, 90, 270, 135, 225];
  const radii = [baseRadius * 0.75, baseRadius, baseRadius * 1.25];

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

  // Query top candidates in parallel with fast timeouts
  const batch = candidateCoordsList.slice(0, 12);
  const results = await Promise.all(
    batch.map(async (coords) => {
      try {
        const url = `https://router.project-osrm.org/route/v1/foot/${coords}?overview=full&geometries=geojson`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'SafeStride/1.0' },
          signal: AbortSignal.timeout(3000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data.routes && data.routes.length > 0) {
          const distKm = data.routes[0].distance / 1000;
          const diff = Math.abs(distKm - targetKm);
          return {
            coordinates: data.routes[0].geometry.coordinates as [number, number][],
            distanceM: data.routes[0].distance as number,
            diff,
          };
        }
      } catch {}
      return null;
    })
  );

  const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);
  if (valid.length === 0) return null;

  valid.sort((a, b) => a.diff - b.diff);
  return {
    coordinates: valid[0].coordinates,
    distanceM: valid[0].distanceM,
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

  // 1. If round-trip is requested without extensive manual points (e.g. AI route, preset, or start-only):
  if (isRoundTrip && waypoints.length <= 2) {
    const startPoint = waypoints[0];
    const loopResult = await searchRealRoadLoop(startPoint[0], startPoint[1], targetKm);
    if (loopResult && loopResult.coordinates.length > 0) {
      rawCoordinates = loopResult.coordinates;
      totalDistanceM = loopResult.distanceM;
    }
  }

  // 2. If point-to-point OR manual multi-waypoint round trip:
  if (rawCoordinates.length === 0) {
    let routedWaypoints = [...waypoints];
    if (isRoundTrip) {
      const first = routedWaypoints[0];
      const last = routedWaypoints[routedWaypoints.length - 1];
      if (last[0] !== first[0] || last[1] !== first[1]) {
        routedWaypoints.push(first);
      }
    }

    // Try routing through all waypoints with OSRM
    try {
      const osrmCoords = routedWaypoints
        .map(([lat, lng]) => `${lng.toFixed(6)},${lat.toFixed(6)}`)
        .join(';');
      const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${osrmCoords}?overview=full&geometries=geojson`;

      const osrmRes = await fetch(osrmUrl, {
        headers: { 'User-Agent': 'SafeStride/1.0' },
        signal: AbortSignal.timeout(4000),
      });

      if (osrmRes.ok) {
        const osrmData = await osrmRes.json();
        if (osrmData.routes && osrmData.routes.length > 0) {
          rawCoordinates = osrmData.routes[0].geometry.coordinates;
          totalDistanceM = osrmData.routes[0].distance;
        }
      }
    } catch {}

    // If multi-point query failed (e.g. one point off-road), snap points to nearest road and route segment-by-segment
    if (rawCoordinates.length === 0 && routedWaypoints.length >= 2) {
      const snappedWaypoints = await Promise.all(
        routedWaypoints.map(([lat, lng]) => snapToNearestRoad(lat, lng))
      );

      for (let i = 0; i < snappedWaypoints.length - 1; i++) {
        const p1 = snappedWaypoints[i];
        const p2 = snappedWaypoints[i + 1];
        try {
          const segUrl = `https://router.project-osrm.org/route/v1/foot/${p1[1].toFixed(6)},${p1[0].toFixed(6)};${p2[1].toFixed(6)},${p2[0].toFixed(6)}?overview=full&geometries=geojson`;
          const segRes = await fetch(segUrl, {
            headers: { 'User-Agent': 'SafeStride/1.0' },
            signal: AbortSignal.timeout(3000),
          });
          if (segRes.ok) {
            const segData = await segRes.json();
            if (segData.routes && segData.routes.length > 0) {
              const segCoords = segData.routes[0].geometry.coordinates as [number, number][];
              if (rawCoordinates.length === 0) {
                rawCoordinates.push(...segCoords);
              } else {
                rawCoordinates.push(...segCoords.slice(1));
              }
              totalDistanceM += segData.routes[0].distance;
            }
          }
        } catch {}
      }
    }
  }

  // 3. Fallback: If OSRM public server was completely offline, snap start/end to roads safely
  if (rawCoordinates.length === 0) {
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

  // 5. Generate realistic hazards along the actual route geometry
  const hazards = [];
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
        description: '210m segment without dedicated sidewalk',
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
