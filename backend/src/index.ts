import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, corsOrigins } from './config/env';
import authRoutes from './routes/auth.routes';
import teamRoutes from './routes/team.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || corsOrigins.includes(origin) || env.NODE_ENV === 'development') {
        cb(null, true);
      } else {
        cb(new Error('CORS not allowed'));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api', projectRoutes);
app.use('/api', taskRoutes);

app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.originalUrl} not found` });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);
  if (err.message === 'CORS not allowed') {
    res.status(403).json({ message: 'CORS not allowed' });
    return;
  }
  res.status(500).json({
    message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

app.listen(env.PORT, () => {
  console.log(`🚀 NOVA API listening on port ${env.PORT} (${env.NODE_ENV})`);
});
