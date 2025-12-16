import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';

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

// 認証が必要なAPIルート
app.use('/api/auth/*', authMiddleware);
app.use('/api/users/*', authMiddleware);

// ルーティング
app.route('/api/auth', authRoutes);
app.route('/api/users', usersRoutes);

export default app;
