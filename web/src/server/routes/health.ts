import { Hono } from 'hono';
import { isDatabaseConfigured } from '@/db/client';

export const healthRoute = new Hono();

healthRoute.get('/', async (c) => {
  const pathfinderUrl = process.env.PATHFINDER_URL || 'http://localhost:8000';
  let pathfinderStatus = 'unreachable';

  try {
    const res = await fetch(`${pathfinderUrl}/health`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      pathfinderStatus = 'healthy';
    }
  } catch {
    pathfinderStatus = 'offline (synthetic fallback active)';
  }

  return c.json({
    status: 'ok',
    service: 'safestride-api',
    database: isDatabaseConfigured ? 'connected (neon)' : 'in-memory (database_url unset)',
    pathfinder: pathfinderStatus,
    timestamp: new Date().toISOString(),
  });
});
