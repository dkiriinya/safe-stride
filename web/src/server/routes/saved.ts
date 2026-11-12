import { Hono } from 'hono';
import { getAuth } from '@clerk/nextjs/server';
import { getDb } from '@/db/client';
import { savedRoutes } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

export const savedRoute = new Hono();

// In-memory fallback if Neon DATABASE_URL is not yet connected
const inMemorySavedRoutes: any[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    clerkUserId: 'demo-user',
    name: 'Morningside Loop 8.2k',
    distanceKm: 8.26,
    elevationGainM: 193,
    effortTolerance: 0.6,
    safetyStrictness: 0.85,
    createdAt: new Date().toISOString(),
  },
];

savedRoute.get('/', async (c) => {
  let userId = 'demo-user';
  try {
    const auth = getAuth(c.req.raw as any);
    if (auth?.userId) userId = auth.userId;
  } catch {
    // Clerk not configured or public session
  }

  const db = getDb();
  if (db) {
    try {
      const routes = await db
        .select()
        .from(savedRoutes)
        .where(eq(savedRoutes.clerkUserId, userId))
        .orderBy(desc(savedRoutes.createdAt));
      return c.json({ routes });
    } catch (err: any) {
      console.error('Failed to query saved routes from Neon:', err);
    }
  }

  return c.json({ routes: inMemorySavedRoutes });
});

savedRoute.post('/', async (c) => {
  let userId = 'demo-user';
  try {
    const auth = getAuth(c.req.raw as any);
    if (auth?.userId) userId = auth.userId;
  } catch {
    // Clerk fallback
  }

  const body = await c.req.json();
  const db = getDb();

  const newEntry = {
    id: body.id && body.id.length === 36 ? body.id : crypto.randomUUID(),
    clerkUserId: userId,
    name: body.name || `Route ${new Date().toLocaleDateString()}`,
    waypoints: body.waypoints || [],
    routeGeojson: body.routeGeojson || {},
    elevationProfile: body.elevationProfile || [],
    distanceKm: Number(body.distanceKm) || 0,
    elevationGainM: Number(body.elevationGainM) || 0,
    effortTolerance: Number(body.effortTolerance) || 0.5,
    safetyStrictness: Number(body.safetyStrictness) || 0.8,
    hazards: body.hazards || [],
    createdAt: new Date(),
  };

  if (db) {
    try {
      const inserted = await db.insert(savedRoutes).values(newEntry).returning();
      return c.json({ success: true, route: inserted[0] });
    } catch (err: any) {
      console.error('Failed to save route to Neon database:', err);
    }
  }

  inMemorySavedRoutes.unshift(newEntry);
  return c.json({ success: true, route: newEntry });
});
