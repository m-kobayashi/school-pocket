import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import usersRoutes from './routes/users';
import childrenRoutes from './routes/children';
import timetablesRoutes from './routes/timetables';
import itemsRoutes from './routes/items';
import eventsRoutes from './routes/events';
import printsRoutes from './routes/prints';
import uploadRoutes from './routes/upload';

type Bindings = {
  DB: D1Database;
  IMAGES: R2Bucket;
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
app.use('/api/children/*', authMiddleware);
app.use('/api/items/*', authMiddleware);
app.use('/api/events/*', authMiddleware);
app.use('/api/prints/*', authMiddleware);
app.use('/api/timetables/*', authMiddleware);
app.use('/api/upload/image', authMiddleware);

// ルーティング
app.route('/api/auth', authRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/children', childrenRoutes);
app.route('/api', timetablesRoutes); // /api/children/:childId/timetable
app.route('/api/timetables', timetablesRoutes);
app.route('/api', itemsRoutes); // /api/children/:childId/items
app.route('/api/items', itemsRoutes);
app.route('/api', eventsRoutes); // /api/children/:childId/events
app.route('/api/events', eventsRoutes);
app.route('/api', printsRoutes); // /api/children/:childId/prints
app.route('/api/prints', printsRoutes);
app.route('/api/upload', uploadRoutes);

export default app;
