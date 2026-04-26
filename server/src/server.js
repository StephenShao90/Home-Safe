import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import routes from './routes/routes.js';
import ratingRoutes from './routes/ratings.js';
import safetyRoutes from './routes/safety.js';
import intelligenceRoutes from './routes/intelligenceRoutes.js';

import { testDbConnection } from './db/db.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: process.env.CLIENT_URL || '*', 
  })
);

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Home Safe API is running' });
});

app.use('/api/routes', routes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/intelligence', intelligenceRoutes);

app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

async function startServer() {
  try {
    await testDbConnection();

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    process.on('SIGINT', () => {
      console.log('Shutting down...');
      server.close(() => process.exit(0));
    });

  } catch (error) {
    console.error('Startup failed:', error.message);
    process.exit(1);
  }
}

startServer();