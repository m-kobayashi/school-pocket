import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
  DB: D1Database;
  // IMAGES: R2Bucket;
  FIREBASE_PROJECT_ID: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS設定
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/', (c) => c.json({ status: 'ok', service: 'school-pocket' }));

// API routes
app.get('/api/health', (c) => c.json({
  status: 'healthy',
  timestamp: new Date().toISOString()
}));

// TODO: Add authentication middleware
// TODO: Add API routes

export default app;
