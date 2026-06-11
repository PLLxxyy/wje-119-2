import express from 'express';
import cors from 'cors';
import { initDatabase } from './db';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import registrationRoutes from './routes/registrations';
import adminRoutes from './routes/admin';

export function createApp(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/registrations', registrationRoutes);
  app.use('/api/admin', adminRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  initDatabase();

  return app;
}

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default createApp;
