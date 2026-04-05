import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import routes from './routes/routes.js';
import { testDbConnection } from './db/db.js';
import ratingRoutes from './routes/ratings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:5173'
}));
app.use(express.json());

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: 'Home Safe API is running' });
});

// API Routes
app.use('/api/routes', routes);
app.use('/api/ratings', ratingRoutes);

// Start server AFTER DB connects
async function startServer() {
  await testDbConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();