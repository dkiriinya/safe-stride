import { Hono } from 'hono';
import { planRoute } from './routes/plan';
import { savedRoute } from './routes/saved';
import { healthRoute } from './routes/health';
import { aiRoute } from './routes/ai';

const app = new Hono().basePath('/api');

app.route('/routes', planRoute);
app.route('/saved-routes', savedRoute);
app.route('/health', healthRoute);
app.route('/ai', aiRoute);

export default app;
